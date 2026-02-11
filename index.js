const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.BOT_TOKEN?.trim();
const GROQ_KEY = process.env.GROQ_API_KEY?.trim();

if (!TELEGRAM_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

if (!GROQ_KEY) {
  console.error("GROQ_API_KEY is missing!");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN);
const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;

// Set webhook
bot.setWebHook(`${url}/bot${TELEGRAM_TOKEN}`);

// Webhook endpoint
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// AI Reply Logic using Groq
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userText = msg.text;

    if (!userText) return;

    await bot.sendChatAction(chatId, "typing");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant inside a Telegram bot."
          },
          {
            role: "user",
            content: userText
          }
        ]
      })
    });

    const data = await response.json();

    if (!data.choices) {
      console.error(data);
      return bot.sendMessage(chatId, "⚠️ Groq error.");
    }

    const reply = data.choices[0].message.content;

    await bot.sendMessage(chatId, reply);

  } catch (error) {
    console.error("Groq Error:", error);
    await bot.sendMessage(msg.chat.id, "⚠️ Error processing request.");
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Groq AI Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
