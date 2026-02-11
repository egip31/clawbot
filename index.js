const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const token = process.env.BOT_TOKEN?.trim();

if (!token) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new TelegramBot(token);
const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;

bot.setWebHook(`${url}/bot${token}`);

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.on("message", (msg) => {
  bot.sendMessage(msg.chat.id, "Halo 👋 Bot sudah aktif via webhook!");
});

app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
