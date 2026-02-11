const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token);
const url = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;

// Set webhook
bot.setWebHook(`${url}/bot${token}`);

// Endpoint webhook
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Balas pesan
bot.on("message", (msg) => {
  bot.sendMessage(msg.chat.id, "Halo 👋 Bot sudah aktif via webhook!");
});

app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
