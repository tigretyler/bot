const mineflayer = require('mineflayer')
const port = process.env.PORT || 22667
const cmd = require('mineflayer-cmd').plugin
const fs = require('fs');
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);
var lasttime = -1;
var moving = 0;
var connected = 0;
var actions = [ 'forward', 'back', 'left', 'right']
var lastaction;
var pi = 3.14159;
var moveinterval = 2; // 2 second movement interval
var maxrandom = 5; // 0-5 seconds added to movement interval (randomly)
var host = data["ip"];
var username = data["name"]
var password = data["password"]; // Read password from config
var nightskip = data["auto-night-skip"]
var bot = mineflayer.createBot({
  host: host,
  username: username
});

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

bot.loadPlugin(cmd);

// Handle authentication messages
bot.on('message', (message) => {
  const msg = message.toString();
  console.log(`Message received: ${msg}`);

  // Check if the bot needs to register
  if (msg.includes('not registered') || msg.includes('Register first')) {
    console.log('Registering...');
    bot.chat(`/register ${password} ${password}`);
  }
  // Check if registration succeeded
  else if (msg.includes('registered successfully')) {
    console.log('Registration successful. Logging in...');
    bot.chat(`/login ${password}`);
  }
  // Check if login succeeded
  else if (msg.includes('Login successful')) {
    console.log('Logged in successfully');
    bot.chat("hello"); // Now safe to chat
  }
  // Handle incorrect password
  else if (msg.includes('Wrong password')) {
    console.error('Incorrect password. Check your config.json');
  }
});

bot.on('login', function() {
  console.log("Logged In");
  // Attempt to log in if password is provided
  if (password) {
    bot.chat(`/login ${password}`);
  }
});

bot.on('spawn', function() {
  connected = 1;
});

bot.on('death', function() {
  bot.emit("respawn")
});

// Existing movement and time handling code remains unchanged
bot.on('time', function(time) {
  if(nightskip == "true") {
    if(bot.time.timeOfDay >= 13000) {
      bot.chat('/time set day')
    }
  }
  if (connected < 1) return;
  
  if (lasttime < 0) {
    lasttime = bot.time.age;
  } else {
    let randomadd = Math.random() * maxrandom * 20;
    let interval = moveinterval * 20 + randomadd;
    if (bot.time.age - lasttime > interval) {
      if (moving == 1) {
        bot.setControlState(lastaction, false);
        moving = 0;
        lasttime = bot.time.age;
      } else {
        let yaw = Math.random() * pi - (0.5 * pi);
        let pitch = Math.random() * pi - (0.5 * pi);
        bot.look(yaw, pitch, false);
        lastaction = actions[Math.floor(Math.random() * actions.length)];
        bot.setControlState(lastaction, true);
        moving = 1;
        lasttime = bot.time.age;
        bot.activateItem();
      }
    }
  }
});
