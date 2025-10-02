import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = JSON.parse(process.env.VACANCIES || "[]");

if (!TOKEN || !MANAGER_ID) {
  throw new Error("❌ BOT_TOKEN and MANAGER_CHAT_ID must be set");
}

// create bot in webhook mode
const bot = new TelegramBot(TOKEN);
const sessions = {}; // in-memory user sessions (resets if redeployed)

// --- Keyboards ---
function vacancyKeyboard() {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push([VACANCIES[i], VACANCIES[i + 1]].filter(Boolean));
  }
  return { keyboard: kb, one_time_keyboard: true, resize_keyboard: true };
}

function languageKeyboard() {
  return {
    keyboard: [["English", "Russian", "Spanish"]],
    one_time_keyboard: true,
    resize_keyboard: true,
  };
}

function proficiencyKeyboard() {
  return {
    keyboard: [["Beginner", "Intermediate", "Advanced"]],
    one_time_keyboard: true,
    resize_keyboard: true,
  };
}

function yesNoInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "✅ Yes", callback_data: "driver_yes" }],
      [{ text: "❌ No", callback_data: "driver_no" }],
    ],
  };
}

function sendConfirmation(chatId, s) {
  return bot.sendMessage(
    chatId,
    `✅ Please confirm your application:\n\n` +
      `👤 Name: ${s.name}\n` +
      `📱 Contact: ${s.contact}\n` +
      `🌍 Language: ${s.language?.name} (${s.language?.level})\n` +
      `💼 Experience: ${s.experience}\n` +
      `📍 Address: ${s.state}, ${s.city}, ${s.zip}\n` +
      `🚘 Driver’s License: ${s.driverLicense}\n` +
      `📌 Vacancy: ${s.vacancy || "Not selected"}\n\n`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Confirm", callback_data: "confirm" }],
          [{ text: "❌ Cancel", callback_data: "cancel" }],
        ],
      },
    }
  );
}

// --- Main Vercel handler ---
export default async function handler(req, res) {
  if (req.method === "POST") {
    bot.processUpdate(req.body);
    return res.status(200).end();
  }

  return res.status(200).send("🤖 Bot is running!");
}

// --- Bot Logic ---
bot.onText(/\/start|\/apply/i, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: "name" };
  bot.sendMessage(
    chatId,
    "🤖 Welcome to Recruiting Bot!\n\nWhat’s your full name?"
  );
});

bot.onText(/\/cancel/i, (msg) => {
  const chatId = msg.chat.id;
  delete sessions[chatId];
  bot.sendMessage(chatId, "❌ Application cancelled.");
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return;

  const s = sessions[chatId];
  if (!s) return bot.sendMessage(chatId, "Send /apply to start a new application.");

  switch (s.step) {
    case "name":
      s.name = text;
      s.step = "contact";
      return bot.sendMessage(chatId, "📱 Provide your contact number with country code:");

    case "contact":
      s.contact = text;
      s.step = "language";
      return bot.sendMessage(chatId, "🌍 Which language do you know?", {
        reply_markup: languageKeyboard(),
      });

    case "language":
      if (["English", "Russian", "Spanish"].includes(text)) {
        s.language = { name: text };
        s.step = "proficiency";
        return bot.sendMessage(chatId, `📊 What is your proficiency in ${text}?`, {
          reply_markup: proficiencyKeyboard(),
        });
      }
      return bot.sendMessage(chatId, "⚠️ Please select a language from the options.");

    case "proficiency":
      s.language.level = text;
      s.step = "experience";
      return bot.sendMessage(chatId, "💼 Briefly describe your experience:");

    case "experience":
      s.experience = text;
      s.step = "state";
      return bot.sendMessage(chatId, "📍 Which state do you live in?");

    case "state":
      s.state = text;
      s.step = "city";
      return bot.sendMessage(chatId, "🏙️ Which city do you live in?");

    case "city":
      s.city = text;
      s.step = "zip";
      return bot.sendMessage(chatId, "📮 Please provide your ZIP code:");

    case "zip":
      s.zip = text;
      s.step = "driver_license";
      return bot.sendMessage(chatId, "🚘 Do you have a driver’s license?", {
        reply_markup: yesNoInlineKeyboard(),
      });

    case "vacancy":
      s.vacancy = text;
      s.step = "confirm";
      return sendConfirmation(chatId, s);

    default:
      return;
  }
});

// --- Inline buttons ---
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const s = sessions[chatId];
  if (!s) return bot.answerCallbackQuery(query.id);

  if (query.data === "driver_yes") {
    s.driverLicense = "Yes";
    s.step = "vacancy";
    bot.sendMessage(chatId, "📌 Which vacancy are you applying for?", {
      reply_markup: vacancyKeyboard(),
    });
  }

  if (query.data === "driver_no") {
    s.driverLicense = "No";
    s.step = "vacancy";
    bot.sendMessage(chatId, "📌 Which vacancy are you applying for?", {
      reply_markup: vacancyKeyboard(),
    });
  }

  if (query.data === "confirm") {
    const managerMsg =
      `📩 *New Job Application*\n\n` +
      `👤 Name: ${s.name}\n` +
      `📱 Contact: ${s.contact}\n` +
      `🌍 Language: ${s.language.name} (${s.language.level})\n` +
      `💼 Experience: ${s.experience}\n` +
      `📍 Address: ${s.state}, ${s.city}, ${s.zip}\n` +
      `🚘 Driver’s License: ${s.driverLicense}\n` +
      `📌 Vacancy: ${s.vacancy}\n\n` +
      `Telegram ID: ${chatId}`;

    bot.sendMessage(MANAGER_ID, managerMsg, { parse_mode: "Markdown" });
    bot.sendMessage(chatId, "✅ Your application has been submitted successfully!");
    delete sessions[chatId];
  }

  if (query.data === "cancel") {
    bot.sendMessage(chatId, "❌ Application cancelled.");
    delete sessions[chatId];
  }

  bot.answerCallbackQuery(query.id);
});
