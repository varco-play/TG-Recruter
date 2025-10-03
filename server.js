// server.js
import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import express from "express";

// --------------------------------------------------
// ENV
// --------------------------------------------------
const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = (() => {
  try {
    return JSON.parse(process.env.VACANCIES || "[]");
  } catch (e) {
    console.error("Invalid VACANCIES env, falling back to empty array");
    return [];
  }
})();

if (!TOKEN || !MANAGER_ID) {
  throw new Error("❌ BOT_TOKEN and MANAGER_CHAT_ID must be set in env");
}

// --------------------------------------------------
// Auto-delete webhook (so polling won't conflict)
// --------------------------------------------------
(async () => {
  try {
    const del = await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
    const j = await del.json();
    console.log("deleteWebhook:", j);
  } catch (err) {
    console.warn("Could not delete webhook at startup:", err?.message || err);
  }
})();

// --------------------------------------------------
// BOT (polling)
// --------------------------------------------------
const bot = new TelegramBot(TOKEN, { polling: true });
bot.on("polling_error", (err) => console.error("Polling error:", err?.code || err?.message || err));
bot.on("error", (err) => console.error("Bot error:", err?.message || err));
console.log("🤖 Bot started in polling mode!");

// --------------------------------------------------
// SESSIONS (in-memory)
// --------------------------------------------------
const sessions = {}; // sessions[chatId] = { lang, step, data }

// --------------------------------------------------
// TRANSLATIONS (EN / RU / ES)
// --------------------------------------------------
const T = {
  en: {
    startPanelTitle: "Welcome to GIG Investment Recruiting Bot",
    startPanelBody:
      "Here you can apply for multiple job vacancies. Press START to begin your application.",
    pressStart: "START",
    chooseLanguagePrompt: "Choose your preferred language of communication:",
    mainMenuTitle: "Main Menu",
    aboutUs: "📖 About Us",
    contacts: "📞 Contacts",
    allVacancies: "💼 All Vacancies",
    chooseLanguageMenu: "🌐 Choose Language",
    back: "🔙 Back",
    mainMenu: "🏠 Main Menu",
    applyAgain: "🔁 Apply again",
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    askName: "👤 What’s your full name?",
    askContact: "📱 Provide your contact number (WhatsApp/Telegram) with country code:",
    askExperience: "💼 Please choose your experience:",
    exp0: "0 years",
    exp1: "1–3 years",
    exp2: "3+ years",
    askState: "📍 Which state do you live in?",
    askCity: "🏙️ Which city do you live in?",
    askZip: "📮 Please provide your ZIP code:",
    askDriver: "🚘 Do you have a driver’s license?",
    yes: "✅ Yes",
    no: "❌ No",
    confirmTitle: "✅ Please confirm your application:",
    confirmButton: "✅ Confirm",
    cancelButton: "❌ Cancel",
    confirmed: "✅ Your application has been submitted successfully!",
    cancelled: "❌ Application cancelled.",
    invalidOption: "⚠️ Please select an option from the menu (use the buttons).",
    aboutPlaceholder: "About us: (fill this later).",
    contactsPlaceholder: "Contacts: (fill this later).",
    chooseLanguageAgain: "🌐 Choose language:",
    startPanelFooter: "Press START to begin.",
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody: "Здесь вы можете подать заявку на несколько вакансий. Нажмите START, чтобы начать.",
    pressStart: "СТАРТ",
    chooseLanguagePrompt: "Выберите предпочитаемый язык общения:",
    mainMenuTitle: "Главное меню",
    aboutUs: "📖 О нас",
    contacts: "📞 Контакты",
    allVacancies: "💼 Все вакансии",
    chooseLanguageMenu: "🌐 Выбрать язык",
    back: "🔙 Назад",
    mainMenu: "🏠 Главное меню",
    applyAgain: "🔁 Податься снова",
    vacancyPrompt: "📌 На какую вакансию вы хотите подать заявку?",
    askName: "👤 Как Вас зовут (полное имя)?",
    askContact: "📱 Укажите контакт (WhatsApp/Telegram) с кодом страны:",
    askExperience: "💼 Выберите ваш опыт:",
    exp0: "0 лет",
    exp1: "1–3 года",
    exp2: "3+ года",
    askState: "📍 В каком вы штате/области?",
    askCity: "🏙️ В каком вы городе?",
    askZip: "📮 Укажите почтовый индекс (ZIP):",
    askDriver: "🚘 У вас есть водительские права?",
    yes: "✅ Да",
    no: "❌ Нет",
    confirmTitle: "✅ Подтвердите вашу заявку:",
    confirmButton: "✅ Подтвердить",
    cancelButton: "❌ Отмена",
    confirmed: "✅ Ваша заявка успешно отправлена!",
    cancelled: "❌ Заявка отменена.",
    invalidOption: "⚠️ Пожалуйста, выберите вариант из меню (нажмите кнопку).",
    aboutPlaceholder: "О нас: (заполните позже).",
    contactsPlaceholder: "Контакты: (заполните позже).",
    chooseLanguageAgain: "🌐 Выберите язык:",
    startPanelFooter: "Нажмите СТАРТ, чтобы начать.",
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody: "Aquí puede postularse a múltiples vacantes. Presione START para comenzar su solicitud.",
    pressStart: "INICIAR",
    chooseLanguagePrompt: "Elija su idioma preferido de comunicación:",
    mainMenuTitle: "Menú principal",
    aboutUs: "📖 Sobre nosotros",
    contacts: "📞 Contactos",
    allVacancies: "💼 Todas las vacantes",
    chooseLanguageMenu: "🌐 Elegir idioma",
    back: "🔙 Atrás",
    mainMenu: "🏠 Menú",
    applyAgain: "🔁 Postular otra vez",
    vacancyPrompt: "📌 ¿A qué vacante le gustaría postularse?",
    askName: "👤 ¿Cuál es su nombre completo?",
    askContact: "📱 Proporcione su número de contacto (WhatsApp/Telegram) con código de país:",
    askExperience: "💼 Seleccione su experiencia:",
    exp0: "0 años",
    exp1: "1–3 años",
    exp2: "3+ años",
    askState: "📍 ¿En qué estado vive?",
    askCity: "🏙️ ¿En qué ciudad vive?",
    askZip: "📮 Proporcione su código postal (ZIP):",
    askDriver: "🚘 ¿Tiene licencia de conducir?",
    yes: "✅ Sí",
    no: "❌ No",
    confirmTitle: "✅ Por favor confirme su solicitud:",
    confirmButton: "✅ Confirmar",
    cancelButton: "❌ Cancelar",
    confirmed: "✅ ¡Su solicitud ha sido enviada con éxito!",
    cancelled: "❌ Solicitud cancelada.",
    invalidOption: "⚠️ Por favor elija una opción del menú (use los botones).",
    aboutPlaceholder: "Sobre nosotros: (rellene más tarde).",
    contactsPlaceholder: "Contactos: (rellene más tarde).",
    chooseLanguageAgain: "🌐 Elegir idioma:",
    startPanelFooter: "Presione INICIAR para comenzar.",
  },
};

function t(lang, key) {
  if (!lang || !T[lang]) lang = "en";
  return T[lang][key] ?? T.en[key] ?? "";
}

// --------------------------------------------------
// KEYBOARDS (persistent bottom menu)
// --------------------------------------------------
function appendPersistent(rows = [], lang = "en") {
  const persistent = [t(lang, "back"), t(lang, "mainMenu")];
  // if last row already contains persistent, don't duplicate
  const last = rows[rows.length - 1] ?? [];
  if (last.includes(persistent[0]) && last.includes(persistent[1])) {
    return { keyboard: rows, one_time_keyboard: false, resize_keyboard: true };
  }
  return { keyboard: [...rows, persistent], one_time_keyboard: false, resize_keyboard: true };
}

// language keyboard (first time)
function languageKeyboard() {
  return { keyboard: [["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]], one_time_keyboard: true, resize_keyboard: true };
}

// vacancies (adds persistent)
function vacanciesKeyboard(lang = "en") {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push([VACANCIES[i], VACANCIES[i + 1]].filter(Boolean));
  }
  if (kb.length === 0) kb.push([t(lang, "allVacancies")]);
  return appendPersistent(kb, lang);
}

// experience with persistent
function experienceKeyboard(lang = "en") {
  return appendPersistent([[t(lang, "exp0"), t(lang, "exp1")], [t(lang, "exp2")]], lang);
}

// yes/no driver as reply keyboard (so persistent remains visible)
function yesNoKeyboard(lang = "en") {
  return appendPersistent([[t(lang, "yes")], [t(lang, "no")]], lang);
}

// confirm/cancel with persistent
function confirmKeyboard(lang = "en") {
  return appendPersistent([[t(lang, "confirmButton"), t(lang, "cancelButton")]], lang);
}

// main menu keyboard
function mainMenuKeyboard(lang = "en") {
  const rows = [
    [t(lang, "aboutUs"), t(lang, "contacts")],
    [t(lang, "allVacancies"), t(lang, "chooseLanguageMenu")],
    [t(lang, "applyAgain")]
  ];
  return appendPersistent(rows, lang);
}

// when expecting free text, show only the persistent menu
function persistentOnly(lang = "en") {
  return appendPersistent([], lang);
}

// --------------------------------------------------
// STEPS helpers
// --------------------------------------------------
const steps = [
  "choose_vacancy",
  "name",
  "contact",
  "experience",
  "state",
  "city",
  "zip",
  "driver",
  "confirm",
];

function nextStep(current) {
  const i = steps.indexOf(current);
  if (i < 0) return steps[0];
  return steps[i + 1] ?? null;
}
function prevStep(current) {
  const i = steps.indexOf(current);
  if (i <= 0) return steps[0];
  return steps[i - 1];
}

function startPanelText() {
  return (
    `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
    `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
    `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}\n\n` +
    `${T.en.startPanelFooter}`
  );
}

// build confirmation summary text (localized)
function buildSummary(lang, data) {
  return (
    `${t(lang, "confirmTitle")}\n\n` +
    `📌 Vacancy: ${data.vacancy || "-"}\n` +
    `👤 Name: ${data.name || "-"}\n` +
    `📱 Contact: ${data.contact || "-"}\n` +
    `💼 Experience: ${data.experience || "-"}\n` +
    `📍 Address: ${data.state || "-"}, ${data.city || "-"}\n` +
    `📮 ZIP: ${data.zip || "-"}\n` +
    `🚘 Driver: ${data.driver || "-"}\n`
  );
}

// --------------------------------------------------
// COMMANDS: /start and /apply
// --------------------------------------------------
bot.onText(/\/start|\/apply/i, async (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { lang: "en", step: null, data: {} };
  await bot.sendMessage(chatId, startPanelText(), {
    reply_markup: {
      keyboard: [[T.en.pressStart], ["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// --------------------------------------------------
// MESSAGE flow
// --------------------------------------------------
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const raw = String(msg.text || "").trim();
    if (!raw) return; // ignore non-text

    // ensure session
    if (!sessions[chatId]) sessions[chatId] = { lang: "en", step: null, data: {} };
    const s = sessions[chatId];

    // Allow /start or /apply at any time
    if (/^\/start|^\/apply/i.test(raw)) {
      sessions[chatId] = { lang: "en", step: null, data: {} };
      return bot.sendMessage(chatId, startPanelText(), {
        reply_markup: {
          keyboard: [[T.en.pressStart], ["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      });
    }

    // Language selection (handles button text variants)
    if (/^(🇬🇧|English)$/i.test(raw)) {
      s.lang = "en";
      s.step = "choose_vacancy";
      s.data = {};
      return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain") || t(s.lang, "chooseLanguagePrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
    }
    if (/^(🇷🇺|Русск|Русский|Русский)$/i.test(raw)) {
      s.lang = "ru";
      s.step = "choose_vacancy";
      s.data = {};
      return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain") || t(s.lang, "chooseLanguagePrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
    }
    if (/^(🇪🇸|Español|Español)$/i.test(raw)) {
      s.lang = "es";
      s.step = "choose_vacancy";
      s.data = {};
      return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain") || t(s.lang, "chooseLanguagePrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
    }

    // Main menu buttons
    if (raw === t(s.lang, "aboutUs")) {
      return bot.sendMessage(chatId, t(s.lang, "aboutPlaceholder"), { reply_markup: mainMenuKeyboard(s.lang) });
    }
    if (raw === t(s.lang, "contacts")) {
      return bot.sendMessage(chatId, t(s.lang, "contactsPlaceholder"), { reply_markup: mainMenuKeyboard(s.lang) });
    }
    if (raw === t(s.lang, "chooseLanguageMenu")) {
      s.step = null;
      return bot.sendMessage(chatId, t(s.lang, "chooseLanguagePrompt"), { reply_markup: languageKeyboard() });
    }
    if (raw === t(s.lang, "allVacancies")) {
      s.step = "choose_vacancy";
      return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
    }
    if (raw === t(s.lang, "applyAgain")) {
      s.step = "choose_vacancy";
      s.data = {};
      return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
    }

    // Persistent Back & Main Menu
    if (raw === t(s.lang, "back")) {
      // move one step back
      s.step = prevStep(s.step || "choose_vacancy");
      // Send prompt for the step we returned to
      switch (s.step) {
        case "choose_vacancy":
          return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
        case "name":
          return bot.sendMessage(chatId, t(s.lang, "askName"), { reply_markup: persistentOnly(s.lang) });
        case "contact":
          return bot.sendMessage(chatId, t(s.lang, "askContact"), { reply_markup: persistentOnly(s.lang) });
        case "experience":
          return bot.sendMessage(chatId, t(s.lang, "askExperience"), { reply_markup: experienceKeyboard(s.lang) });
        case "state":
          return bot.sendMessage(chatId, t(s.lang, "askState"), { reply_markup: persistentOnly(s.lang) });
        case "city":
          return bot.sendMessage(chatId, t(s.lang, "askCity"), { reply_markup: persistentOnly(s.lang) });
        case "zip":
          return bot.sendMessage(chatId, t(s.lang, "askZip"), { reply_markup: persistentOnly(s.lang) });
        case "driver":
          return bot.sendMessage(chatId, t(s.lang, "askDriver"), { reply_markup: yesNoKeyboard(s.lang) });
        default:
          return bot.sendMessage(chatId, t(s.lang, "mainMenuTitle"), { reply_markup: mainMenuKeyboard(s.lang) });
      }
    }
    if (raw === t(s.lang, "mainMenu")) {
      s.step = null;
      s.data = {};
      return bot.sendMessage(chatId, t(s.lang, "mainMenuTitle"), { reply_markup: mainMenuKeyboard(s.lang) });
    }

    // --- Vacancy selection (must be exact one of VACANCIES) ---
    if (s.step === "choose_vacancy" || s.step === null) {
      if (VACANCIES.includes(raw)) {
        s.data.vacancy = raw;
        s.step = "name";
        return bot.sendMessage(chatId, t(s.lang, "askName"), { reply_markup: persistentOnly(s.lang) });
      } else if (s.step === "choose_vacancy") {
        // user must choose from menu
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: vacanciesKeyboard(s.lang) });
      }
    }

    // --- Name (free-text) ---
    if (s.step === "name") {
      if (!raw) return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: persistentOnly(s.lang) });
      s.data.name = raw;
      s.step = "contact";
      return bot.sendMessage(chatId, t(s.lang, "askContact"), { reply_markup: persistentOnly(s.lang) });
    }

    // --- Contact (free-text) ---
    if (s.step === "contact") {
      if (!raw) return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: persistentOnly(s.lang) });
      s.data.contact = raw;
      s.step = "experience";
      return bot.sendMessage(chatId, t(s.lang, "askExperience"), { reply_markup: experienceKeyboard(s.lang) });
    }

    // --- Experience (must be one of buttons) ---
    if (s.step === "experience") {
      const allowed = [t(s.lang, "exp0"), t(s.lang, "exp1"), t(s.lang, "exp2")];
      if (!allowed.includes(raw)) {
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: experienceKeyboard(s.lang) });
      }
      s.data.experience = raw;
      s.step = "state";
      return bot.sendMessage(chatId, t(s.lang, "askState"), { reply_markup: persistentOnly(s.lang) });
    }

    // --- State (free-text) ---
    if (s.step === "state") {
      s.data.state = raw;
      s.step = "city";
      return bot.sendMessage(chatId, t(s.lang, "askCity"), { reply_markup: persistentOnly(s.lang) });
    }

    // --- City (free-text) ---
    if (s.step === "city") {
      s.data.city = raw;
      s.step = "zip";
      return bot.sendMessage(chatId, t(s.lang, "askZip"), { reply_markup: persistentOnly(s.lang) });
    }

    // --- ZIP (free-text) ---
    if (s.step === "zip") {
      s.data.zip = raw;
      s.step = "driver";
      return bot.sendMessage(chatId, t(s.lang, "askDriver"), { reply_markup: yesNoKeyboard(s.lang) });
    }

    // --- Driver (yes/no keyboard) ---
    if (s.step === "driver") {
      const allowed = [t(s.lang, "yes"), t(s.lang, "no")];
      if (!allowed.includes(raw)) {
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: yesNoKeyboard(s.lang) });
      }
      s.data.driver = raw;
      s.step = "confirm";
      const summary = buildSummary(s.lang, s.data);
      return bot.sendMessage(chatId, summary, { reply_markup: confirmKeyboard(s.lang) });
    }

    // --- Confirm step (buttons Confirm / Cancel) ---
    if (s.step === "confirm") {
      if (raw === t(s.lang, "confirmButton")) {
        // send to manager
        const managerText = buildSummary(s.lang, s.data) + `\nTelegram ID: ${chatId}`;
        await bot.sendMessage(MANAGER_ID, managerText);
        await bot.sendMessage(chatId, t(s.lang, "confirmed"), { reply_markup: mainMenuKeyboard(s.lang) });
        // after finishing offer apply again or main menu (mainMenuKeyboard includes applyAgain)
        s.step = null;
        s.data = {};
        return;
      }
      if (raw === t(s.lang, "cancelButton")) {
        await bot.sendMessage(chatId, t(s.lang, "cancelled"), { reply_markup: mainMenuKeyboard(s.lang) });
        s.step = null;
        s.data = {};
        return;
      }
      // invalid option
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: confirmKeyboard(s.lang) });
    }

    // --- If none matched: show main menu prompt (safe fallback) ---
    return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: mainMenuKeyboard(s.lang) });
  } catch (err) {
    console.error("Message handler error:", err);
  }
});

// --------------------------------------------------
// EXPRESS server to satisfy Render port-binding
// --------------------------------------------------
const app = express();
app.get("/", (req, res) => {
  res.send("🤖 Telegram Recruiting Bot is running on Render (polling mode).");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Express server running on port ${PORT}`));

// handle unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("UnhandledRejection:", err);
});
