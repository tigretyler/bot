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

// Función para iniciar servidor
async function startServer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Navegación a Aternos
    await page.goto(config.aternos.serverUrl, { timeout: 30000 });
    
    // Login
    await page.type('#user', config.aternos.user);
    await page.type('#password', config.aternos.pass);
    await page.click('.login-button');
    await page.waitForNavigation();

    // Iniciar servidor
    await page.waitForSelector('.btn-start', { timeout: 15000 });
    await page.click('.btn-start');
    await page.waitForSelector('.statuslabel-status', { timeout: 300000 });
    
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Función para verificar estado
async function checkStatus() {
  try {
    const response = await fetch(`https://api.mcsrvstat.us/3/anecraft.aternos.me:22667`);
    const data = await response.json();
    return data.online ? '🟢 Servidor Online' : '🔴 Servidor Offline';
  } catch (error) {
    return '🔴 Error al verificar estado';
  }
}

// Sistema de comandos
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== config.discord.channelId) return;

  try {
    const command = message.content.toLowerCase();
    
    if (command === '!start') {
      await message.channel.sendTyping();
      const success = await startServer();
      message.reply(success ? '✅ Servidor en proceso de inicio' : '❌ Error al iniciar');
    }

    if (command === '!status') {
      await message.channel.sendTyping();
      const status = await checkStatus();
      message.reply(status);
    }
  } catch (error) {
    console.error('Error:', error);
    message.reply('⚠️ Error procesando comando');
  }
});

// Iniciar bot
client.login(config.discord.token)
  .then(() => console.log('Bot listo'))
  .catch(error => console.error('Error de conexión:', error));
