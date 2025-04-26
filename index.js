const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Configuración
const config = {
  aternos: {
    user: process.env.ATERNOS_USER,
    pass: process.env.ATERNOS_PASS,
    serverUrl: 'https://aternos.org/go/'
  },
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: '1363207617803059281'
  }
};

// Función mejorada para iniciar servidor
async function startServer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
  });

  try {
    const page = await browser.newPage();
    
    // Configuración de navegación
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // Navegación a Aternos
    await page.goto(config.aternos.serverUrl, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Login
    await page.type('#user', config.aternos.user);
    await page.type('#password', config.aternos.pass);
    await page.click('.login-button');
    await page.waitForNavigation({ timeout: 15000 });

    // Iniciar servidor
    await page.waitForSelector('.btn-start', { timeout: 20000 });
    await page.click('.btn-start');
    await page.waitForSelector('.statuslabel-status', { timeout: 300000 });

    return true;
  } catch (error) {
    console.error('[Aternos Error]', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Verificación de estado mejorada
async function checkStatus() {
  try {
    const response = await fetch(`https://api.mcsrvstat.us/3/anecraft.aternos.me:22667`);
    if (!response.ok) throw new Error('API no responde');
    
    const data = await response.json();
    return {
      online: data.online,
      players: data.players?.online || 0,
      version: data.version || 'Desconocida'
    };
  } catch (error) {
    return { online: false, players: 0, version: 'Error' };
  }
}

// Sistema de comandos
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== config.discord.channelId) return;

  try {
    const command = message.content.toLowerCase().trim();
    
    if (command === '!start') {
      await message.channel.sendTyping();
      const success = await startServer();
      message.reply(success ? '✅ Servidor en proceso de inicio' : '❌ Error al iniciar');
    }

    if (command === '!status') {
      await message.channel.sendTyping();
      const { online, players, version } = await checkStatus();
      message.reply(
        online 
          ? `🟢 **Online**\nJugadores: ${players}\nVersión: ${version}`
          : '🔴 **Offline**'
      );
    }
  } catch (error) {
    console.error('[Command Error]', error);
    message.reply('⚠️ Error procesando comando');
  }
});

// Inicialización
client.login(config.discord.token)
  .then(() => console.log('🤖 Bot iniciado correctamente'))
  .catch(error => console.error('💥 Error crítico:', error));
