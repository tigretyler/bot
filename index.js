const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');
const mc = require('minecraft-protocol');
const fetch = require('node-fetch');

// Configuración avanzada de intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  presence: {
    status: 'online',
    activities: [{
      name: 'Minecraft 24/7',
      type: 'PLAYING'
    }]
  }
});

// Configuración modularizada
const config = {
  aternos: {
    user: process.env.ATERNOS_USER,
    pass: process.env.ATERNOS_PASS,
    serverUrl: 'https://aternos.org/go/',
    selectors: {
      userInput: '#user',
      passInput: '#password',
      loginBtn: '.login-button',
      serverStatus: '.server-status',
      startBtn: '.btn-start'
    }
  },
  mc: {
    host: 'anecraft.aternos.me',
    port: 22667,
    authmePassword: process.env.AUTHME_PASSWORD,
    botUsername: 'KeepAliveBot',
    version: '1.19.1',
    afkInterval: 120000 // 2 minutos
  },
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: '1363207617803059281',
    statusCheckInterval: 900000 // 15 minutos
  }
};

// Gestión avanzada de Aternos
async function startServer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
    
    // Navegación con manejo de errores mejorado
    await page.goto(config.aternos.serverUrl, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Sistema de login robusto
    await page.type(config.aternos.selectors.userInput, config.aternos.user);
    await page.type(config.aternos.selectors.passInput, config.aternos.pass);
    await Promise.all([
      page.waitForNavigation(),
      page.click(config.aternos.selectors.loginBtn)
    ]);

    // Verificación de estado del servidor
    await page.waitForSelector(config.aternos.selectors.serverStatus, {
      visible: true,
      timeout: 20000
    });

    // Inicio del servidor con validación
    const startButton = await page.$(config.aternos.selectors.startBtn);
    if (startButton) {
      await Promise.all([
        page.click(config.aternos.selectors.startBtn),
        page.waitForSelector('.statuslabel-status', { timeout: 300000 })
      ]);
      return true;
    }
    return false;

  } catch (error) {
    console.error(`[Aternos Error] ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}

// Conexión Minecraft profesional
function createMinecraftConnection() {
  const mcClient = mc.createClient({
    host: config.mc.host,
    port: config.mc.port,
    username: config.mc.botUsername,
    auth: 'offline',
    version: config.mc.version,
    hideErrors: false,
    checkTimeoutInterval: 30000
  });

  // Eventos mejorados
  mcClient.on('connect', () => {
    console.log('[MC] Conexión establecida');
    mcClient.chat(`/login ${config.mc.authmePassword}`);
  });

  mcClient.on('end', (reason) => {
    console.log(`[MC] Desconexión: ${reason}`);
    setTimeout(createMinecraftConnection, 15000);
  });

  mcClient.on('error', (err) => {
    console.error(`[MC Error] ${err.message}`);
    setTimeout(createMinecraftConnection, 30000);
  });

  // Sistema anti-AFK avanzado
  const afkActions = () => {
    try {
      mcClient.chat(`/login ${config.mc.authmePassword}`);
      mcClient.setControlState('jump', true);
      setTimeout(() => mcClient.setControlState('jump', false), 500);
      mcClient.look(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
    } catch (error) {
      console.error(`[AFK Error] ${error.message}`);
    }
  };

  setInterval(afkActions, config.mc.afkInterval);
  afkActions();
}

// Sistema de comandos profesional
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== config.discord.channelId) return;

  try {
    const command = message.content.toLowerCase().trim();
    
    switch(command) {
      case '!start':
        await handleStartCommand(message);
        break;
      
      case '!status':
        await handleStatusCommand(message);
        break;
    }
  } catch (error) {
    console.error(`[Command Error] ${error.message}`);
  }
});

async function handleStartCommand(message) {
  await message.channel.sendTyping();
  const success = await startServer();
  await message.reply({
    content: success ? '🟢 Iniciando servidor...' : '🔴 Error al iniciar',
    ephemeral: true
  });
}

async function handleStatusCommand(message) {
  await message.channel.sendTyping();
  const status = await checkServerStatus();
  const embed = new EmbedBuilder()
    .setTitle('Estado del Servidor')
    .setColor(status.online ? '#00ff00' : '#ff0000')
    .addFields(
      { name: 'Estado', value: status.online ? 'Online' : 'Offline', inline: true },
      { name: 'Jugadores', value: status.players.toString(), inline: true }
    );
  
  await message.reply({ embeds: [embed] });
}

// Sistema de monitoreo mejorado
async function checkServerStatus() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`https://api.mcsrvstat.us/3/${config.mc.host}:${config.mc.port}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const data = await response.json();
    
    return {
      online: data.online || false,
      players: data.players?.online || 0,
      version: data.version || 'N/A'
    };
  } catch (error) {
    return { online: false, players: 0, version: 'N/A' };
  }
}

// Inicialización profesional
async function initialize() {
  try {
    await client.login(config.discord.token);
    console.log('[Discord] Bot autenticado');
    
    setTimeout(createMinecraftConnection, 5000);
    
    setInterval(async () => {
      const { online } = await checkServerStatus();
      if (!online) {
        console.log('[Monitor] Servidor offline - Reiniciando...');
        await startServer();
      }
    }, config.discord.statusCheckInterval);
    
  } catch (error) {
    console.error(`[Init Error] ${error.message}`);
    process.exit(1);
  }
}

initialize();
