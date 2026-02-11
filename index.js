const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.BOT_TOKEN?.trim();
const GROQ_KEY = process.env.GROQ_API_KEY?.trim();
const DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;

if (!TELEGRAM_TOKEN || !GROQ_KEY || !DOMAIN) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN);
const webhookURL = `https://${DOMAIN}/bot${TELEGRAM_TOKEN}`;

bot.setWebHook(webhookURL);

app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});


// ================== TOOLS ==================

async function getCryptoPrice(coin) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await response.json();
    if (!data[coin]) return null;
    return data[coin];
  } catch (err) {
    console.error("Crypto error:", err);
    return null;
  }
}

async function askGroq(messages) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500,
      messages
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}


// ================== AGENT ==================

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userText = msg.text;
    if (!userText) return;

    await bot.sendChatAction(chatId, "typing");

    // Step 1: Ask AI apakah perlu crypto tool
    const decision = await askGroq([
      {
        role: "system",
        content: "If the user is asking about live crypto price, reply ONLY with: CRYPTO:<coin_id>. If not crypto, reply NORMAL."
      },
      { role: "user", content: userText }
    ]);

    if (decision && decision.startsWith("CRYPTO:")) {
      const coin = decision.replace("CRYPTO:", "").trim().toLowerCase();
      const price = await getCryptoPrice(coin);

      if (!price) {
        return bot.sendMessage(chatId, "Coin tidak ditemukan.");
      }

      return bot.sendMessage(
        chatId,
        `💰 ${coin.toUpperCase()}
Harga: $${price.usd}
24h Change: ${price.usd_24h_change?.toFixed(2)}%`
      );
    }

    // Step 2: Kalau bukan crypto → jawab normal AI
    const reply = await askGroq([
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: userText }
    ]);

    await bot.sendMessage(chatId, reply || "⚠️ Error.");

  } catch (error) {
    console.error("Agent error:", error);
    await bot.sendMessage(msg.chat.id, "⚠️ Error processing request.");
  }
});

app.get("/", (req, res) => {
  res.send("Agent Bot Running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
