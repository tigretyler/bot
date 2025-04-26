const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');
const mc = require('minecraft-protocol');
const fetch = require('node-fetch'); // Añadido fetch

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages // Añadido para mejor compatibilidad
  ]
});

// Configuración
const config = {
  aternos: {
    user: process.env.ATERNOS_USER,
    pass: process.env.ATERNOS_PASS
  },
  mc: {
    host: 'anecraft.aternos.me',
    port: 22667,
    authmePassword: 'sdfdsfdsfsd',
    botUsername: 'KeepAliveBot'
  },
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: '1363207617803059281'
  }
};

// Función para iniciar servidor Aternos (mejorada)
async function startServer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necesario para entornos cloud
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto('https://aternos.org/go/', {waitUntil: 'networkidle2'});
    
    // Login
    await page.type('input#user', config.aternos.user);
    await page.type('input#password', config.aternos.password);
    await page.click('button.login-button');
    
    // Esperar confirmación de login
    await page.waitForSelector('.server-status', {timeout: 15000});
    
    // Iniciar servidor
    const startButton = await page.$('.btn-start');
    if (startButton) {
      await startButton.click();
      await page.waitForSelector('.statuslabel-status', {timeout: 300000});
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Conexión Minecraft mejorada
function connectMinecraft() {
  try {
    const bot = mc.createBot({
      host: config.mc.host,
      port: config.mc.port,
      username: config.mc.botUsername,
      auth: 'offline', // Cambiado a offline mode
      version: '1.20.1' // Especificar versión
    });

    bot.on('chat', (message) => {
      if (message.includes('/login')) {
        bot.chat(`/login ${config.mc.authmePassword}`);
      }
    });

    bot.on('end', () => {
      setTimeout(connectMinecraft, 30000); // Reconexión más rápida
    });

    const antiAfk = () => {
      bot.chat(`/login ${config.mc.authmePassword}`);
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
      bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    };

    setInterval(antiAfk, 120000); // Cada 2 minutos
    antiAfk();

  } catch (error) {
    console.error('Error en conexión Minecraft:', error);
    setTimeout(connectMinecraft, 60000);
  }
}

// Evento message actualizado
client.on('messageCreate', async (message) => { // Cambiado a messageCreate
  if (message.author.bot) return;
  if (message.channel.id !== config.discord.channelId) return;

  try {
    if (message.content.toLowerCase() === '!start') {
      const success = await startServer();
      await message.reply(success ? '🟢 Servidor iniciando...' : '🔴 Error al iniciar');
    }

    if (message.content.toLowerCase() === '!status') {
      const status = await checkServerStatus();
      await message.reply(status.online 
        ? `🟢 Online - Jugadores: ${status.players}`
        : '🔴 Offline');
    }
  } catch (error) {
    console.error('Error procesando comando:', error);
  }
});

// Verificación de estado mejorada
async function checkServerStatus() {
  try {
    const response = await fetch(`https://api.mcsrvstat.us/2/${config.mc.host}:${config.mc.port}`);
    const data = await response.json();
    return {
      online: data.online,
      players: data.players?.online || 0
    };
  } catch (error) {
    return {online: false, players: 0};
  }
}

// Inicialización segura
client.login(config.discord.token)
  .then(() => {
    console.log('Bot de Discord conectado');
    connectMinecraft();
    setInterval(() => checkServerStatus().then(status => {
      if (!status.online) startServer();
    }), 900000); // 15 minutos
  })
  .catch(error => console.error('Error de conexión de Discord:', error));
