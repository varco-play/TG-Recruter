// server.js
import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";

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
// EXPRESS SERVER
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
    chooseLanguagePrompt: "Choose your preferred language:",
    mainMenuTitle: "Main Menu",
    aboutUs: "📖 About Us",
    contacts: "📞 Contacts",
    allVacancies: "💼 All Vacancies",
    chooseLanguageMenu: "🌐 Choose Language",
    back: "↩️ Back",
    mainMenu: "🏠 Main Menu",
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    askName: "✍️ Please type your full name:",
    askContact: "📱 Please type your contact number (with country code):",
    askExperience: "💼 Select your experience:",
    askState: "🏙️ Please type your state:",
    askCity: "🏘️ Please type your city:",
    askZIP: "🏷️ Please type your ZIP code:",
    askDriver: "🚗 Do you have a driver’s license?",
    confirm: "✅ Please confirm your application:\n",
    confirmBtn: "✅ Confirm",
    applied: "✅ Your application has been sent!",
    invalidOption: "⚠️ Please select an option from the menu.",
    expOptions: ["0 years", "1-3 years", "3+ years"],
    driverOptions: ["Yes", "No"],
    langFlags: { en: "🇬🇧", ru: "🇷🇺", es: "🇪🇸" }
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody: "Здесь вы можете подать заявку на несколько вакансий.",
    pressStart: "СТАРТ",
    chooseLanguagePrompt: "Выберите предпочитаемый язык:",
    mainMenuTitle: "Главное меню",
    aboutUs: "📖 О нас",
    contacts: "📞 Контакты",
    allVacancies: "💼 Все вакансии",
    chooseLanguageMenu: "🌐 Выбрать язык",
    back: "↩️ Назад",
    mainMenu: "🏠 Главное меню",
    vacancyPrompt: "📌 На какую вакансию вы хотите подать заявку?",
    askName: "✍️ Введите ваше полное имя:",
    askContact: "📱 Введите ваш контактный номер (с кодом страны):",
    askExperience: "💼 Выберите ваш опыт:",
    askState: "🏙️ Введите ваш штат:",
    askCity: "🏘️ Введите ваш город:",
    askZIP: "🏷️ Введите ваш ZIP код:",
    askDriver: "🚗 Есть ли у вас водительские права?",
    confirm: "✅ Пожалуйста, подтвердите вашу заявку:\n",
    confirmBtn: "✅ Подтвердить",
    applied: "✅ Ваша заявка отправлена!",
    invalidOption: "⚠️ Пожалуйста, выберите вариант из меню.",
    expOptions: ["0 лет", "1-3 года", "3+ лет"],
    driverOptions: ["Да", "Нет"],
    langFlags: { en: "🇬🇧", ru: "🇷🇺", es: "🇪🇸" }
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody: "Aquí puede postularse a múltiples vacantes.",
    pressStart: "INICIAR",
    chooseLanguagePrompt: "Elija su idioma preferido:",
    mainMenuTitle: "Menú principal",
    aboutUs: "📖 Sobre nosotros",
    contacts: "📞 Contactos",
    allVacancies: "💼 Todas las vacantes",
    chooseLanguageMenu: "🌐 Elegir idioma",
    back: "↩️ Atrás",
    mainMenu: "🏠 Menú principal",
    vacancyPrompt: "📌 ¿A qué vacante le gustaría postularse?",
    askName: "✍️ Por favor escriba su nombre completo:",
    askContact: "📱 Por favor escriba su número de contacto (con código de país):",
    askExperience: "💼 Seleccione su experiencia:",
    askState: "🏙️ Por favor escriba su estado:",
    askCity: "🏘️ Por favor escriba su ciudad:",
    askZIP: "🏷️ Por favor escriba su código postal:",
    askDriver: "🚗 ¿Tiene licencia de conducir?",
    confirm: "✅ Por favor confirme su solicitud:\n",
    confirmBtn: "✅ Confirmar",
    applied: "✅ Su solicitud ha sido enviada!",
    invalidOption: "⚠️ Por favor seleccione una opción del menú.",
    expOptions: ["0 años", "1-3 años", "3+ años"],
    driverOptions: ["Sí", "No"],
    langFlags: { en: "🇬🇧", ru: "🇷🇺", es: "🇪🇸" }
  }
};

function t(lang, key) {
  if (!lang || !T[lang]) lang = "en";
  return T[lang][key] ?? T.en[key] ?? "";
}

// --------------------------------------------------
// VACANCIES
// --------------------------------------------------
const VACANCIES = JSON.parse(fs.readFileSync("./vacancies.json", "utf-8"));
function findVacancyByLabel(label, lang) {
  return VACANCIES.find(v => v[lang] === label);
}

// --------------------------------------------------
// KEYBOARDS
// --------------------------------------------------
function languageKeyboard() {
  return {
    keyboard: [["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
    one_time_keyboard: true,
    resize_keyboard: true
  };
}

function mainMenuKeyboard(lang) {
  return {
    keyboard: [
      [t(lang, "aboutUs"), t(lang, "contacts")],
      [t(lang, "allVacancies"), `${t(lang, "chooseLanguageMenu")} ${t(lang, "langFlags")[lang]}`]
    ],
    resize_keyboard: true
  };
}

function vacanciesKeyboard(lang) {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push(VACANCIES.slice(i, i + 2).map(v => v[lang] || v.en));
  }
  kb.push([t(lang, "back"), t(lang, "mainMenu")]);
  return { keyboard: kb, resize_keyboard: true };
}

function experienceKeyboard(lang) {
  return { keyboard: [[...t(lang, "expOptions")], [t(lang, "back"), t(lang, "mainMenu")]], resize_keyboard: true };
}

function driverKeyboard(lang) {
  return { keyboard: [[...t(lang, "driverOptions")], [t(lang, "back"), t(lang, "mainMenu")]], resize_keyboard: true };
}

function backMainKeyboard(lang) {
  return { keyboard: [[t(lang, "back"), t(lang, "mainMenu")]], resize_keyboard: true };
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
      resize_keyboard: true
    }
  });
});

// Handle all messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const raw = String(msg.text || "").trim();

  if (!sessions[chatId]) sessions[chatId] = { lang: "en", step: "start" };
  const s = sessions[chatId];
  const lang = s.lang;

  // --- Language switch ---
  if (/English/i.test(raw)) {
    s.lang = "en"; s.step = "main";
    return bot.sendMessage(chatId, "✅ Language set to English", { reply_markup: mainMenuKeyboard("en") });
  }
  if (/Русск|Русский/i.test(raw)) {
    s.lang = "ru"; s.step = "main";
    return bot.sendMessage(chatId, "✅ Язык переключен на русский", { reply_markup: mainMenuKeyboard("ru") });
  }
  if (/Español/i.test(raw)) {
    s.lang = "es"; s.step = "main";
    return bot.sendMessage(chatId, "✅ Idioma cambiado a español", { reply_markup: mainMenuKeyboard("es") });
  }

  // --- Back & Main Menu buttons ---
  if (raw === t(lang, "back")) {
    if (s.previousStep) {
      s.step = s.previousStep;
      s.previousStep = null;
      return bot.sendMessage(chatId, "🔙 Back", { reply_markup: backMainKeyboard(lang) });
    } else {
      s.step = "main";
      return bot.sendMessage(chatId, t(lang, "mainMenuTitle"), { reply_markup: mainMenuKeyboard(lang) });
    }
  }

  if (raw === t(lang, "mainMenu")) {
    s.step = "main";
    return bot.sendMessage(chatId, t(lang, "mainMenuTitle"), { reply_markup: mainMenuKeyboard(lang) });
  }

  // --- Main Menu actions ---
  if (raw === t(lang, "aboutUs")) return bot.sendMessage(chatId, "📖 About us info...", { reply_markup: mainMenuKeyboard(lang) });
  if (raw === t(lang, "contacts")) return bot.sendMessage(chatId, "📞 Contact info...", { reply_markup: mainMenuKeyboard(lang) });

  if (raw === t(lang, "allVacancies")) {
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(lang, "vacancyPrompt"), { reply_markup: vacanciesKeyboard(lang) });
  }

  // --- Application flow ---
  switch (s.step) {
    case "choose_vacancy": {
      const vac = findVacancyByLabel(raw, lang);
      if (!vac) return bot.sendMessage(chatId, t(lang, "invalidOption"), { reply_markup: vacanciesKeyboard(lang) });
      s.vacancy = vac;
      s.previousStep = "choose_vacancy";
      s.step = "ask_name";
      return bot.sendMessage(chatId, t(lang, "askName"), { reply_markup: backMainKeyboard(lang) });
    }
    case "ask_name": {
      if (!raw) return bot.sendMessage(chatId, t(lang, "invalidOption"), { reply_markup: backMainKeyboard(lang) });
      s.name = raw;
      s.previousStep = "ask_name";
      s.step = "ask_contact";
      return bot.sendMessage(chatId, t(lang, "askContact"), { reply_markup: backMainKeyboard(lang) });
    }
    case "ask_contact": {
      s.contact = raw;
      s.previousStep = "ask_contact";
      s.step = "ask_experience";
      return bot.sendMessage(chatId, t(lang, "askExperience"), { reply_markup: experienceKeyboard(lang) });
    }
    case "ask_experience": {
      if (!t(lang, "expOptions").includes(raw)) return bot.sendMessage(chatId, t(lang, "invalidOption"), { reply_markup: experienceKeyboard(lang) });
      s.experience = raw;
      s.previousStep = "ask_experience";
      s.step = "ask_state";
      return bot.sendMessage(chatId, t(lang, "askState"), { reply_markup: backMainKeyboard(lang) });
    }
    case "ask_state": {
      s.state = raw;
      s.previousStep = "ask_state";
      s.step = "ask_city";
      return bot.sendMessage(chatId, t(lang, "askCity"), { reply_markup: backMainKeyboard(lang) });
    }
    case "ask_city": {
      s.city = raw;
      s.previousStep = "ask_city";
      s.step = "ask_zip";
      return bot.sendMessage(chatId, t(lang, "askZIP"), { reply_markup: backMainKeyboard(lang) });
    }
    case "ask_zip": {
      if (!/^\d+$/.test(raw)) return bot.sendMessage(chatId, t(lang, "invalidOption"), { reply_markup: backMainKeyboard(lang) });
      s.zip = raw;
      s.previousStep = "ask_zip";
      s.step = "ask_driver";
      return bot.sendMessage(chatId, t(lang, "askDriver"), { reply_markup: driverKeyboard(lang) });
    }
    case "ask_driver": {
      if (!t(lang, "driverOptions").includes(raw)) return bot.sendMessage(chatId, t(lang, "invalidOption"), { reply_markup: driverKeyboard(lang) });
      s.driver = raw;
      s.step = "confirm";
      const summary = 
        `${t(lang, "confirm")}\n` +
        `🏢 Vacancy: ${s.vacancy[lang]}\n` +
        `✍️ Name: ${s.name}\n` +
        `📱 Contact: ${s.contact}\n` +
        `💼 Experience: ${s.experience}\n` +
        `🏙️ State: ${s.state}\n` +
        `🏘️ City: ${s.city}\n` +
        `🏷️ ZIP: ${s.zip}\n` +
        `🚗 Driver: ${s.driver}`;
      return bot.sendMessage(chatId, summary, { reply_markup: { keyboard: [[t(lang, "confirmBtn")], [t(lang, "back"), t(lang, "mainMenu")]], resize_keyboard: true } });
    }
    case "confirm": {
      if (raw !== t(lang, "confirmBtn")) return bot.sendMessage(chatId, t(lang, "invalidOption"));
      // send to manager
      const msgToManager = 
        `📨 New Application\n` +
        `Vacancy: ${s.vacancy[lang]}\n` +
        `Name: ${s.name}\n` +
        `Contact: ${s.contact}\n` +
        `Experience: ${s.experience}\n` +
        `State: ${s.state}\n` +
        `City: ${s.city}\n` +
        `ZIP: ${s.zip}\n` +
        `Driver: ${s.driver}`;
      await bot.sendMessage(MANAGER_ID, msgToManager);
      await bot.sendMessage(chatId, t(lang, "applied"), { reply_markup: mainMenuKeyboard(lang) });
      s.step = "main";
      return;
    }
  }

  // --- Fallback ---
  return bot.sendMessage(chatId, t(lang, "invalidOption"));
});
