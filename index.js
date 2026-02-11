const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.BOT_TOKEN?.trim();
const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim();

if (!TELEGRAM_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

if (!OPENAI_KEY) {
  console.error("OPENAI_API_KEY is missing!");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;

// Set webhook
bot.setWebHook(`${url}/bot${TELEGRAM_TOKEN}`);

// Webhook endpoint
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// AI Reply Logic
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userText = msg.text;

    if (!userText) return;

    // Optional: loading message
    await bot.sendChatAction(chatId, "typing");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    });

    const reply = completion.choices[0].message.content;

    await bot.sendMessage(chatId, reply);

  } catch (error) {
    console.error("AI Error:", error);
    await bot.sendMessage(msg.chat.id, "⚠️ Error processing request.");
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("AI Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
