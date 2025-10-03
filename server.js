import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import express from "express";

// --------------------------------------------------
// ENVIRONMENT VARIABLES
// --------------------------------------------------
const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;

if (!TOKEN || !MANAGER_ID) {
  throw new Error("❌ BOT_TOKEN and MANAGER_CHAT_ID must be set in env");
}

// --------------------------------------------------
// START BOT IN POLLING MODE
// --------------------------------------------------
const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 Bot started in polling mode!");

// --------------------------------------------------
// EXPRESS SERVER (for Render port binding)
// --------------------------------------------------
const app = express();
app.get("/", (req, res) => {
  res.send("🤖 Telegram Recruiting Bot is running on Render (polling mode).");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Express server running on port ${PORT}`);
});

// --------------------------------------------------
// TRANSLATIONS
// --------------------------------------------------
const T = {
  en: {
    startPanelTitle: "Welcome to GIG Investment Recruiting Bot",
    startPanelBody: "Here you can apply for multiple job vacancies.",
    pressStart: "START",
    chooseLanguagePrompt: "Choose your preferred language of communication:",
    mainMenuTitle: "Main Menu",
    aboutUs: "📖 About Us",
    contacts: "📞 Contacts",
    allVacancies: "💼 All Vacancies",
    chooseLanguageMenu: "🌐 Choose Language",
    back: "🔙 Back",
    mainMenu: "🏠 Main Menu",
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    invalidOption: "⚠️ Please select an option from the menu (use the buttons).",
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody: "Здесь вы можете подать заявку на несколько вакансий.",
    pressStart: "СТАРТ",
    chooseLanguagePrompt: "Выберите предпочитаемый язык общения:",
    mainMenuTitle: "Главное меню",
    aboutUs: "📖 О нас",
    contacts: "📞 Контакты",
    allVacancies: "💼 Все вакансии",
    chooseLanguageMenu: "🌐 Выбрать язык",
    back: "🔙 Назад",
    mainMenu: "🏠 Главное меню",
    vacancyPrompt: "📌 На какую вакансию вы хотите подать заявку?",
    invalidOption: "⚠️ Пожалуйста, выберите вариант из меню.",
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody: "Aquí puede postularse a múltiples vacantes.",
    pressStart: "INICIAR",
    chooseLanguagePrompt: "Elija su idioma preferido de comunicación:",
    mainMenuTitle: "Menú principal",
    aboutUs: "📖 Sobre nosotros",
    contacts: "📞 Contactos",
    allVacancies: "💼 Todas las vacantes",
    chooseLanguageMenu: "🌐 Elegir idioma",
    back: "🔙 Atrás",
    mainMenu: "🏠 Menú principal",
    vacancyPrompt: "📌 ¿A qué vacante le gustaría postularse?",
    invalidOption: "⚠️ Por favor elija una opción del menú.",
  },
};

function t(lang, key) {
  if (!lang || !T[lang]) lang = "en";
  return T[lang][key] ?? T.en[key] ?? "";
}

// --------------------------------------------------
// VACANCIES (translation per language)
// --------------------------------------------------
const VACANCIES = [
  { key: "store_manager", en: "Store Manager", ru: "Менеджер магазина", es: "Gerente de tienda" },
  { key: "cashier", en: "Cashier", ru: "Кассир", es: "Cajero" },
  { key: "driver", en: "Driver", ru: "Водитель", es: "Conductor" },
];

// --------------------------------------------------
// KEYBOARDS
// --------------------------------------------------
function languageKeyboard() {
  return {
    keyboard: [["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
    one_time_keyboard: true,
    resize_keyboard: true,
  };
}

function mainMenuKeyboard(lang) {
  return {
    keyboard: [
      [t(lang, "aboutUs"), t(lang, "contacts")],
      [t(lang, "allVacancies"), t(lang, "chooseLanguageMenu")],
    ],
    resize_keyboard: true,
  };
}

function vacanciesKeyboard(lang) {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push(
      VACANCIES.slice(i, i + 2).map(v => v[lang] || v.en)
    );
  }
  kb.push([t(lang, "back"), t(lang, "mainMenu")]);
  return { keyboard: kb, resize_keyboard: true };
}

function findVacancyByLabel(label, lang) {
  return VACANCIES.find(v => v[lang] === label);
}

// --------------------------------------------------
// SESSION MANAGEMENT
// --------------------------------------------------
const sessions = {};

// --------------------------------------------------
// BOT FLOW
// --------------------------------------------------
bot.onText(/\/start/i, async (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { lang: "en", step: "start" };

  const panel =
    `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
    `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
    `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}\n\n`;

  await bot.sendMessage(chatId, panel, {
    reply_markup: {
      keyboard: [[T.en.pressStart], ["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
      resize_keyboard: true,
    },
  });
});

// Handle all messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const raw = String(msg.text || "").trim();
  if (!sessions[chatId]) sessions[chatId] = { lang: "en", step: "start" };
  const s = sessions[chatId];
  const lang = s.lang;

  // Language switch
  if (/English/i.test(raw)) {
    s.lang = "en";
    return bot.sendMessage(chatId, "✅ Language set to English", {
      reply_markup: mainMenuKeyboard("en"),
    });
  }
  if (/Русск|Русский/i.test(raw)) {
    s.lang = "ru";
    return bot.sendMessage(chatId, "✅ Язык переключен на русский", {
      reply_markup: mainMenuKeyboard("ru"),
    });
  }
  if (/Español/i.test(raw)) {
    s.lang = "es";
    return bot.sendMessage(chatId, "✅ Idioma cambiado a español", {
      reply_markup: mainMenuKeyboard("es"),
    });
  }

  // Main menu actions
  if (raw === t(lang, "mainMenu")) {
    return bot.sendMessage(chatId, t(lang, "mainMenuTitle"), {
      reply_markup: mainMenuKeyboard(lang),
    });
  }

  if (raw === t(lang, "allVacancies")) {
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(lang, "vacancyPrompt"), {
      reply_markup: vacanciesKeyboard(lang),
    });
  }

  if (raw === t(lang, "back")) {
    return bot.sendMessage(chatId, t(lang, "mainMenuTitle"), {
      reply_markup: mainMenuKeyboard(lang),
    });
  }

  // Vacancy choice
  if (s.step === "choose_vacancy") {
    const vacancy = findVacancyByLabel(raw, lang);
    if (!vacancy) {
      return bot.sendMessage(chatId, t(lang, "invalidOption"));
    }
    await bot.sendMessage(
      chatId,
      `✅ You applied for: ${vacancy[lang]}`
    );
    // After applying → back to main menu
    return bot.sendMessage(chatId, t(lang, "mainMenuTitle"), {
      reply_markup: mainMenuKeyboard(lang),
    });
  }
});
