const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');
const { createBot } = require('minecraft-protocol');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
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

// Función mejorada para iniciar servidor Aternos
async function startServer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navegación y login
    await page.goto('https://aternos.org/go/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('#user', config.aternos.user);
    await page.type('#password', config.aternos.password);
    await page.click('.login-button');
    
    // Esperar carga completa
    await page.waitForSelector('.server-status', { timeout: 15000 });
    
    // Iniciar servidor
    const startButton = await page.$('.btn-start');
    if (startButton) {
      await startButton.click();
      await page.waitForSelector('.statuslabel-status', { timeout: 300000 });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al iniciar servidor:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Conexión Minecraft mejorada con manejo de errores
function connectMinecraft() {
  try {
    const bot = createBot({
      host: config.mc.host,
      port: config.mc.port,
      username: config.mc.botUsername,
      auth: 'offline',
      version: '1.19.1',
      hideErrors: false
    });

    // Manejo de eventos
    bot.on('chat', (message) => {
      if (typeof message === 'string' && message.includes('/login')) {
        bot.chat(`/login ${config.mc.authmePassword}`);
      }
    });

    bot.on('end', (reason) => {
      console.log(`Desconectado: ${reason}`);
      setTimeout(connectMinecraft, 10000);
    });

    bot.on('error', (err) => {
      console.error('Error de conexión:', err);
      setTimeout(connectMinecraft, 15000);
    });

    // Sistema anti-AFK
    const performActions = () => {
      try {
        bot.chat(`/login ${config.mc.authmePassword}`);
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
        bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
      } catch (actionError) {
        console.error('Error en acciones anti-AFK:', actionError);
      }
    };

    setInterval(performActions, 120000);
    performActions();

  } catch (error) {
    console.error('Error en conexión inicial:', error);
    setTimeout(connectMinecraft, 20000);
  }
}

// Sistema de comandos de Discord
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== config.discord.channelId) return;

  try {
    const command = message.content.toLowerCase();
    
    if (command === '!start') {
      await message.channel.sendTyping();
      const success = await startServer();
      await message.reply(success ? '🟢 Servidor en proceso de inicio...' : '🔴 Error al iniciar el servidor');
    }

    if (command === '!status') {
      await message.channel.sendTyping();
      const status = await checkServerStatus();
      const response = status.online 
        ? `🟢 Servidor Online\nJugadores conectados: ${status.players}`
        : '🔴 Servidor Offline';
      await message.reply(response);
    }
  } catch (error) {
    console.error('Error procesando comando:', error);
  }
});

// Verificador de estado del servidor
async function checkServerStatus() {
  try {
    const response = await fetch(`https://api.mcsrvstat.us/3/${config.mc.host}:${config.mc.port}`);
    const data = await response.json();
    return {
      online: data.online || false,
      players: data.players?.online || 0
    };
  } catch (error) {
    return { online: false, players: 0 };
  }
}

// Inicialización segura
client.login(config.discord.token)
  .then(() => {
    console.log('✅ Bot de Discord conectado');
    setTimeout(connectMinecraft, 5000);
    setInterval(() => {
      checkServerStatus().then(status => {
        if (!status.online) {
          console.log('🔄 Intentando iniciar servidor...');
          startServer();
        }
      });
    }, 900000); // Verificación cada 15 minutos
  })
  .catch(error => console.error('❌ Error de conexión con Discord:', error));
