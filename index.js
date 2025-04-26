const Discord = require('discord.js');
const client = new Discord.Client();
const puppeteer = require('puppeteer');
const mc = require('minecraft-protocol');

// Configuración
const config = {
  aternos: {
    user: process.env.ATERNOS_USER,
    pass: process.env.ATERNOS_PASS
  },
  mc: {
    host: 'TU_SERVIDOR.aternos.me',
    port: 25565,
    authmePassword: 'CONTRASEÑA_AUTHME',
    botUsername: 'KeepAliveBot'
  },
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: 'ID_CANAL_DISCORD'
  }
};

// Función para iniciar servidor Aternos
async function startServer() {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  
  try {
    await page.goto('https://aternos.org/go/');
    await page.type('#user', config.aternos.user);
    await page.type('#password', config.aternos.password);
    await page.click('#login');
    await page.waitForSelector('.statuslabel', {timeout: 15000});
    await page.click('.server-start');
    await page.waitForSelector('.statuslabel-status', {timeout: 300000});
    return true;
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Conexión y mantenimiento del bot Minecraft
function connectMinecraft() {
  const bot = mc.createBot({
    host: config.mc.host,
    port: config.mc.port,
    username: config.mc.botUsername,
    auth: 'microsoft'
  });

  bot.on('chat', (message) => {
    if (message.includes('/login') || message.includes('registrar')) {
      bot.chat(`/login ${config.mc.authmePassword}`);
    }
  });

  // Reconexión automática
  bot.on('end', () => {
    setTimeout(connectMinecraft, 60000);
  });

  // Comandos AuthMe y anti-afk
  const sendAuth = () => {
    bot.chat(`/login ${config.mc.authmePassword}`);
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 1000);
  };

  // Ejecutar cada 4 minutos (menos que el timeout de AuthMe)
  setInterval(sendAuth, 240000);
  sendAuth(); // Ejecutar inmediatamente al conectar
}

// Comandos Discord
client.on('message', async (message) => {
  if (message.channel.id !== config.discord.channelId) return;

  if (message.content === '!start') {
    const success = await startServer();
    message.reply(success ? '🟢 Servidor iniciando...' : '🔴 Error al iniciar');
  }

  if (message.content === '!status') {
    const players = await checkServerStatus();
    message.reply(players ? `🟢 Online - ${players} jugadores` : '🔴 Offline');
  }
});

// Verificar estado del servidor
async function checkServerStatus() {
  try {
    const response = await fetch(`https://api.mcsrvstat.us/2/${config.mc.host}`);
    const data = await response.json();
    return data.online ? data.players.online : false;
  } catch (error) {
    return false;
  }
}

// Iniciar todo
client.login(config.discord.token);
connectMinecraft();

// Mantener activo el servidor cada 25 minutos
setInterval(async () => {
  const status = await checkServerStatus();
  if (!status) await startServer();
}, 1500000);
