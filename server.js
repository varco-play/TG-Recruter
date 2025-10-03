// server.js
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// ENV vars
const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = JSON.parse(process.env.VACANCIES || "[]");

if (!TOKEN || !MANAGER_ID) {
  throw new Error("❌ BOT_TOKEN and MANAGER_CHAT_ID must be set in environment");
}

// Start bot in polling mode
const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 Bot started in polling mode!");

// In-memory sessions
const sessions = {};

// --------------------------------------------------
// Translations
// --------------------------------------------------
const T = {
  en: {
    startPanelTitle: "Welcome to GIG Investment Recruiting Bot",
    startPanelBody: "Here you can apply for multiple job vacancies.",
    pressStart: "START",
    chooseLanguagePrompt: "🌐 Choose your preferred language:",
    mainMenuTitle: "🏠 Main Menu",
    aboutUs: "📖 About Us",
    contacts: "📞 Contacts",
    allVacancies: "💼 All Vacancies",
    chooseLanguageMenu: "🌐 Change Language",
    back: "🔙 Back",
    mainMenu: "🏠 Main Menu",
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    askName: "👤 What’s your full name?",
    askContact: "📱 Provide your contact number with country code:",
    askExperience: "💼 Please choose your experience:",
    exp0: "0 years",
    exp1: "1–3 years",
    exp2: "3+ years",
    askState: "📍 Which state do you live in?",
    askCity: "🏙️ Which city do you live in?",
    askZip: "📮 ZIP code?",
    askDriver: "🚘 Do you have a driver’s license?",
    yes: "✅ Yes",
    no: "❌ No",
    confirmTitle: "✅ Please confirm your application:",
    confirmed: "✅ Your application has been submitted successfully!",
    cancelled: "❌ Application cancelled.",
    invalidOption: "⚠️ Please choose from the menu.",
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody: "Здесь вы можете подать заявку на вакансии.",
    pressStart: "СТАРТ",
    chooseLanguagePrompt: "🌐 Выберите предпочитаемый язык:",
    mainMenuTitle: "🏠 Главное меню",
    aboutUs: "📖 О нас",
    contacts: "📞 Контакты",
    allVacancies: "💼 Все вакансии",
    chooseLanguageMenu: "🌐 Сменить язык",
    back: "🔙 Назад",
    mainMenu: "🏠 Главное меню",
    vacancyPrompt: "📌 На какую вакансию хотите подать заявку?",
    askName: "👤 Ваше полное имя?",
    askContact: "📱 Укажите контакт с кодом страны:",
    askExperience: "💼 Выберите опыт работы:",
    exp0: "0 лет",
    exp1: "1–3 года",
    exp2: "3+ лет",
    askState: "📍 В каком регионе вы живете?",
    askCity: "🏙️ В каком городе вы живете?",
    askZip: "📮 Почтовый индекс?",
    askDriver: "🚘 У вас есть водительские права?",
    yes: "✅ Да",
    no: "❌ Нет",
    confirmTitle: "✅ Подтвердите заявку:",
    confirmed: "✅ Ваша заявка успешно отправлена!",
    cancelled: "❌ Заявка отменена.",
    invalidOption: "⚠️ Выберите вариант из меню.",
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody: "Aquí puede postularse a varias vacantes.",
    pressStart: "INICIAR",
    chooseLanguagePrompt: "🌐 Elija su idioma preferido:",
    mainMenuTitle: "🏠 Menú principal",
    aboutUs: "📖 Sobre nosotros",
    contacts: "📞 Contactos",
    allVacancies: "💼 Todas las vacantes",
    chooseLanguageMenu: "🌐 Cambiar idioma",
    back: "🔙 Atrás",
    mainMenu: "🏠 Menú principal",
    vacancyPrompt: "📌 ¿A qué vacante desea postularse?",
    askName: "👤 ¿Cuál es su nombre completo?",
    askContact: "📱 Proporcione su número con código de país:",
    askExperience: "💼 Seleccione su experiencia:",
    exp0: "0 años",
    exp1: "1–3 años",
    exp2: "3+ años",
    askState: "📍 ¿En qué estado vive?",
    askCity: "🏙️ ¿En qué ciudad vive?",
    askZip: "📮 Código postal?",
    askDriver: "🚘 ¿Tiene licencia de conducir?",
    yes: "✅ Sí",
    no: "❌ No",
    confirmTitle: "✅ Confirme su aplicación:",
    confirmed: "✅ ¡Su aplicación fue enviada con éxito!",
    cancelled: "❌ Aplicación cancelada.",
    invalidOption: "⚠️ Elija una opción del menú.",
  },
};

function t(lang, key) {
  return T[lang]?.[key] || T["en"][key];
}

// --------------------------------------------------
// Keyboards
// --------------------------------------------------
function languageKeyboard() {
  return {
    keyboard: [["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
    resize_keyboard: true,
  };
}
function vacanciesKeyboard(lang) {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push([VACANCIES[i], VACANCIES[i + 1]].filter(Boolean));
  }
  return { keyboard: kb, resize_keyboard: true };
}
function experienceKeyboard(lang) {
  return {
    keyboard: [[t(lang, "exp0"), t(lang, "exp1")], [t(lang, "exp2")]],
    resize_keyboard: true,
  };
}
function yesNoKeyboard(lang) {
  return {
    keyboard: [[t(lang, "yes"), t(lang, "no")]],
    resize_keyboard: true,
  };
}

// --------------------------------------------------
// Bot Flow
// --------------------------------------------------
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { lang: "en", step: null };
  bot.sendMessage(
    chatId,
    `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
      `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
      `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}`,
    { reply_markup: languageKeyboard() }
  );
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!sessions[chatId]) sessions[chatId] = { lang: "en", step: null };
  const s = sessions[chatId];

  // Language selection
  if (/English/i.test(text)) {
    s.lang = "en";
    s.step = "vacancy";
    return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }
  if (/Рус/i.test(text)) {
    s.lang = "ru";
    s.step = "vacancy";
    return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }
  if (/Español/i.test(text)) {
    s.lang = "es";
    s.step = "vacancy";
    return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }

  // Flow
  switch (s.step) {
    case "vacancy":
      if (VACANCIES.includes(text)) {
        s.vacancy = text;
        s.step = "name";
        return bot.sendMessage(chatId, t(s.lang, "askName"));
      }
      break;

    case "name":
      s.name = text;
      s.step = "contact";
      return bot.sendMessage(chatId, t(s.lang, "askContact"));

    case "contact":
      s.contact = text;
      s.step = "experience";
      return bot.sendMessage(chatId, t(s.lang, "askExperience"), {
        reply_markup: experienceKeyboard(s.lang),
      });

    case "experience":
      s.experience = text;
      s.step = "state";
      return bot.sendMessage(chatId, t(s.lang, "askState"));

    case "state":
      s.state = text;
      s.step = "city";
      return bot.sendMessage(chatId, t(s.lang, "askCity"));

    case "city":
      s.city = text;
      s.step = "zip";
      return bot.sendMessage(chatId, t(s.lang, "askZip"));

    case "zip":
      s.zip = text;
      s.step = "driver";
      return bot.sendMessage(chatId, t(s.lang, "askDriver"), {
        reply_markup: yesNoKeyboard(s.lang),
      });

    case "driver":
      s.driverLicense = text;
      s.step = "confirm";
      const summary =
        `${t(s.lang, "confirmTitle")}\n\n` +
        `👤 ${s.name}\n📱 ${s.contact}\n💼 ${s.experience}\n` +
        `📍 ${s.state}, ${s.city}\n📮 ${s.zip}\n🚘 ${s.driverLicense}\n📌 ${s.vacancy}`;
      bot.sendMessage(chatId, summary);
      bot.sendMessage(MANAGER_ID, summary);
      bot.sendMessage(chatId, t(s.lang, "confirmed"));
      delete sessions[chatId];
      break;
  }
});
