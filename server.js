import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import express from "express";

// --------------------------------------------------
// ENVIRONMENT VARIABLES
// --------------------------------------------------
const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = JSON.parse(process.env.VACANCIES || "[]");

if (!TOKEN || !MANAGER_ID) {
  throw new Error("❌ BOT_TOKEN and MANAGER_CHAT_ID must be set in env");
}

// --------------------------------------------------
// START BOT IN POLLING MODE
// --------------------------------------------------
const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 Bot started in polling mode!");

// --------------------------------------------------
// SESSIONS
// --------------------------------------------------
const sessions = {};

// --------------------------------------------------
// TRANSLATIONS
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
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    askName: "👤 What’s your full name?",
    askContact:
      "📱 Please provide your contact number (WhatsApp/Telegram) with country code:",
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
    confirmed: "✅ Your application has been submitted successfully!",
    cancelled: "❌ Application cancelled.",
    invalidOption: "⚠️ Please choose an option from the menu.",
    aboutPlaceholder: "About us: (fill this later).",
    contactsPlaceholder: "Contacts: (fill this later).",
    chooseLanguageAgain: "🌐 Choose language:",
    startPanelFooter: "Press START to begin."
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody:
      "Здесь вы можете подать заявку на несколько вакансий. Нажмите START, чтобы начать.",
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
    confirmed: "✅ Ваша заявка успешно отправлена!",
    cancelled: "❌ Заявка отменена.",
    invalidOption: "⚠️ Пожалуйста, выберите вариант из меню.",
    aboutPlaceholder: "О нас: (заполните позже).",
    contactsPlaceholder: "Контакты: (заполните позже).",
    chooseLanguageAgain: "🌐 Выберите язык:",
    startPanelFooter: "Нажмите СТАРТ, чтобы начать."
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody:
      "Aquí puede postularse a múltiples vacantes. Presione START para comenzar su solicitud.",
    pressStart: "INICIAR",
    chooseLanguagePrompt: "Elija su idioma preferido de comunicación:",
    mainMenuTitle: "Menú principal",
    aboutUs: "📖 Sobre nosotros",
    contacts: "📞 Contactos",
    allVacancies: "💼 Todas las vacantes",
    chooseLanguageMenu: "🌐 Elegir idioma",
    back: "🔙 Atrás",
    mainMenu: "🏠 Menú",
    vacancyPrompt: "📌 ¿A qué vacante le gustaría postularse?",
    askName: "👤 ¿Cuál es su nombre completo?",
    askContact:
      "📱 Proporcione su número de contacto (WhatsApp/Telegram) con código de país:",
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
    confirmed: "✅ ¡Su solicitud ha sido enviada con éxito!",
    cancelled: "❌ Solicitud cancelada.",
    invalidOption: "⚠️ Por favor elija una opción del menú.",
    aboutPlaceholder: "Sobre nosotros: (rellene más tarde).",
    contactsPlaceholder: "Contactos: (rellene más tarde).",
    chooseLanguageAgain: "🌐 Elegir idioma:",
    startPanelFooter: "Presione INICIAR para comenzar."
  }
};

function t(lang, key) {
  if (!lang || !T[lang]) lang = "en";
  return T[lang][key] ?? T.en[key] ?? "";
}

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

function vacanciesKeyboard(lang = "en") {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push([VACANCIES[i], VACANCIES[i + 1]].filter(Boolean));
  }
  return { keyboard: kb, resize_keyboard: true };
}

// --------------------------------------------------
// BOT FLOW
// --------------------------------------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { lang: "en", step: null };

  const panel =
    `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
    `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
    `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}\n\n` +
    `${T.en.startPanelFooter}`;

  await bot.sendMessage(chatId, panel, {
    reply_markup: {
      keyboard: [[T.en.pressStart], ["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// --------------------------------------------------
// Conversation logic
// --------------------------------------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const raw = String(msg.text || "").trim();
  if (!sessions[chatId]) sessions[chatId] = { lang: "en" };

  const s = sessions[chatId];

  // --- Language switching ---
  if (/English/i.test(raw)) {
    s.lang = "en";
    return bot.sendMessage(chatId, "✅ Language set to English", {
      reply_markup: vacanciesKeyboard("en"),
    });
  }
  if (/Русск|Русский/i.test(raw)) {
    s.lang = "ru";
    return bot.sendMessage(chatId, "✅ Язык переключен на русский", {
      reply_markup: vacanciesKeyboard("ru"),
    });
  }
  if (/Español/i.test(raw)) {
    s.lang = "es";
    return bot.sendMessage(chatId, "✅ Idioma cambiado a español", {
      reply_markup: vacanciesKeyboard("es"),
    });
  }

  // --- Vacancy selected ---
  if (VACANCIES.includes(raw)) {
    s.vacancy = raw;
    s.step = "name";
    return bot.sendMessage(chatId, t(s.lang, "askName"));
  }

  // --- Application steps ---
  if (s.step === "name") {
    s.name = raw;
    s.step = "contact";
    return bot.sendMessage(chatId, t(s.lang, "askContact"));
  }

  if (s.step === "contact") {
    s.contact = raw;
    s.step = "experience";
    return bot.sendMessage(chatId, t(s.lang, "askExperience"), {
      reply_markup: {
        keyboard: [[t(s.lang, "exp0")], [t(s.lang, "exp1")], [t(s.lang, "exp2")]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
  }

  if (s.step === "experience") {
    s.experience = raw;
    s.step = "state";
    return bot.sendMessage(chatId, t(s.lang, "askState"));
  }

  if (s.step === "state") {
    s.state = raw;
    s.step = "city";
    return bot.sendMessage(chatId, t(s.lang, "askCity"));
  }

  if (s.step === "city") {
    s.city = raw;
    s.step = "zip";
    return bot.sendMessage(chatId, t(s.lang, "askZip"));
  }

  if (s.step === "zip") {
    s.zip = raw;
    s.step = "driver";
    return bot.sendMessage(chatId, t(s.lang, "askDriver"), {
      reply_markup: {
        keyboard: [[t(s.lang, "yes")], [t(s.lang, "no")]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
  }

  if (s.step === "driver") {
    s.driver = raw;
    s.step = "confirm";

    const summary =
      `${t(s.lang, "confirmTitle")}\n\n` +
      `Vacancy: ${s.vacancy}\n` +
      `Name: ${s.name}\n` +
      `Contact: ${s.contact}\n` +
      `Experience: ${s.experience}\n` +
      `State: ${s.state}\n` +
      `City: ${s.city}\n` +
      `ZIP: ${s.zip}\n` +
      `Driver: ${s.driver}`;

    await bot.sendMessage(chatId, summary, {
      reply_markup: {
        keyboard: [[t(s.lang, "yes")], [t(s.lang, "no")]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  if (s.step === "confirm") {
    if (raw === t(s.lang, "yes")) {
      await bot.sendMessage(chatId, t(s.lang, "confirmed"));
      await bot.sendMessage(MANAGER_ID, `📥 New Application:\n${JSON.stringify(s, null, 2)}`);
      delete sessions[chatId];
    } else {
      await bot.sendMessage(chatId, t(s.lang, "cancelled"));
      delete sessions[chatId];
    }
    return;
  }
});

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
