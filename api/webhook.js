// api/webhook.js
import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = JSON.parse(process.env.VACANCIES || "[]");

if (!TOKEN || !MANAGER_ID) {
  throw new Error("❌ BOT_TOKEN and MANAGER_CHAT_ID must be set in env");
}

// Webhook mode only
const bot = new TelegramBot(TOKEN, { webHook: true });
const sessions = {};

// --------------------------------------------------
// TRANSLATIONS (English, Russian, Spanish)
// --------------------------------------------------
const T = {
  en: {
    startPanelTitle: "Welcome to GIG Investment Recruiting Bot",
    startPanelBody:
      "Here you can apply for multiple job vacancies. Press START to begin your application.",
    pressStart: "START",
    chooseLanguagePrompt: "🌐 Choose your preferred language of communication:",
    mainMenuTitle: "🏠 Main Menu",
    aboutUs: "📖 About Us",
    contacts: "📞 Contacts",
    allVacancies: "💼 All Vacancies",
    chooseLanguageMenu: "🌐 Choose Language",
    back: "🔙 Back",
    mainMenu: "🏠 Main Menu",
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    askName: "👤 What’s your full name?",
    askContact: "📱 Please provide your contact number with country code:",
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
    aboutPlaceholder: "ℹ️ About us: (fill this later).",
    contactsPlaceholder: "☎️ Contacts: (fill this later).",
    chooseLanguageAgain: "🌐 Choose language:",
    startPanelFooter: "Press START to begin.",
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody:
      "Здесь вы можете подать заявку на несколько вакансий. Нажмите START, чтобы начать.",
    pressStart: "СТАРТ",
    chooseLanguagePrompt: "🌐 Выберите предпочитаемый язык общения:",
    mainMenuTitle: "🏠 Главное меню",
    aboutUs: "📖 О нас",
    contacts: "📞 Контакты",
    allVacancies: "💼 Все вакансии",
    chooseLanguageMenu: "🌐 Выбрать язык",
    back: "🔙 Назад",
    mainMenu: "🏠 Главное меню",
    vacancyPrompt: "📌 На какую вакансию вы хотите подать заявку?",
    askName: "👤 Как Вас зовут (полное имя)?",
    askContact: "📱 Укажите контактный номер с кодом страны:",
    askExperience: "💼 Выберите ваш опыт:",
    exp0: "0 лет",
    exp1: "1–3 года",
    exp2: "3+ года",
    askState: "📍 В каком вы регионе/штате?",
    askCity: "🏙️ В каком городе вы живете?",
    askZip: "📮 Укажите почтовый индекс:",
    askDriver: "🚘 У вас есть водительские права?",
    yes: "✅ Да",
    no: "❌ Нет",
    confirmTitle: "✅ Подтвердите вашу заявку:",
    confirmed: "✅ Ваша заявка успешно отправлена!",
    cancelled: "❌ Заявка отменена.",
    invalidOption: "⚠️ Пожалуйста, выберите вариант из меню.",
    aboutPlaceholder: "ℹ️ О нас: (заполните позже).",
    contactsPlaceholder: "☎️ Контакты: (заполните позже).",
    chooseLanguageAgain: "🌐 Выберите язык:",
    startPanelFooter: "Нажмите СТАРТ, чтобы начать.",
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody:
      "Aquí puede postularse a múltiples vacantes. Presione START para comenzar su solicitud.",
    pressStart: "INICIAR",
    chooseLanguagePrompt: "🌐 Elija su idioma preferido de comunicación:",
    mainMenuTitle: "🏠 Menú principal",
    aboutUs: "📖 Sobre nosotros",
    contacts: "📞 Contactos",
    allVacancies: "💼 Todas las vacantes",
    chooseLanguageMenu: "🌐 Elegir idioma",
    back: "🔙 Atrás",
    mainMenu: "🏠 Menú principal",
    vacancyPrompt: "📌 ¿A qué vacante le gustaría postularse?",
    askName: "👤 ¿Cuál es su nombre completo?",
    askContact: "📱 Proporcione su número de contacto con código de país:",
    askExperience: "💼 Seleccione su experiencia:",
    exp0: "0 años",
    exp1: "1–3 años",
    exp2: "3+ años",
    askState: "📍 ¿En qué estado vive?",
    askCity: "🏙️ ¿En qué ciudad vive?",
    askZip: "📮 Proporcione su código postal:",
    askDriver: "🚘 ¿Tiene licencia de conducir?",
    yes: "✅ Sí",
    no: "❌ No",
    confirmTitle: "✅ Por favor confirme su solicitud:",
    confirmed: "✅ ¡Su solicitud ha sido enviada con éxito!",
    cancelled: "❌ Solicitud cancelada.",
    invalidOption: "⚠️ Por favor elija una opción del menú.",
    aboutPlaceholder: "ℹ️ Sobre nosotros: (rellene más tarde).",
    contactsPlaceholder: "☎️ Contactos: (rellene más tarde).",
    chooseLanguageAgain: "🌐 Elegir idioma:",
    startPanelFooter: "Presione INICIAR para comenzar.",
  },
};

function t(lang, key) {
  if (!lang || !T[lang]) lang = "en";
  return T[lang][key] ?? T.en[key] ?? "";
}

// --------------------------------------------------
// Keyboards
// --------------------------------------------------
function appendPersistent(rows = [], lang = "en") {
  return {
    keyboard: [...rows, [t(lang, "back"), t(lang, "mainMenu")]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function languageKeyboard() {
  return {
    keyboard: [["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function vacanciesKeyboard(lang = "en") {
  const kb = [];
  for (let i = 0; i < VACANCIES.length; i += 2) {
    kb.push([VACANCIES[i], VACANCIES[i + 1]].filter(Boolean));
  }
  return appendPersistent(kb, lang);
}

function mainMenuKeyboard(lang = "en") {
  return appendPersistent(
    [
      [t(lang, "aboutUs"), t(lang, "contacts")],
      [t(lang, "allVacancies"), t(lang, "chooseLanguageMenu")],
    ],
    lang
  );
}

function experienceKeyboard(lang = "en") {
  return appendPersistent(
    [[t(lang, "exp0"), t(lang, "exp1")], [t(lang, "exp2")]],
    lang
  );
}

function yesNoInline() {
  return {
    inline_keyboard: [
      [{ text: "✅ Yes", callback_data: "driver_yes" }],
      [{ text: "❌ No", callback_data: "driver_no" }],
    ],
  };
}

function confirmInline(lang = "en") {
  const confirmText =
    lang === "ru" ? "Подтвердить" : lang === "es" ? "Confirmar" : "Confirm";
  const cancelText =
    lang === "ru" ? "Отмена" : lang === "es" ? "Cancelar" : "Cancel";
  return {
    inline_keyboard: [
      [{ text: "✅ " + confirmText, callback_data: "confirm" }],
      [{ text: "❌ " + cancelText, callback_data: "cancel" }],
    ],
  };
}

// --------------------------------------------------
// Steps
// --------------------------------------------------
const stepOrder = [
  "choose_vacancy",
  "name",
  "contact",
  "experience",
  "state",
  "city",
  "zip",
  "driver_license",
  "confirm",
];

function nextStep(current) {
  const i = stepOrder.indexOf(current);
  return stepOrder[i + 1] ?? null;
}
function prevStep(current) {
  const i = stepOrder.indexOf(current);
  return i > 0 ? stepOrder[i - 1] : stepOrder[0];
}

function buildConfirmationText(lang, s) {
  return (
    `${t(lang, "confirmTitle")}\n\n` +
    `👤 ${s.name || "-"}\n` +
    `📱 ${s.contact || "-"}\n` +
    `💼 ${s.experience || "-"}\n` +
    `📍 ${s.state || "-"}, ${s.city || "-"}\n` +
    `📮 ${s.zip || "-"}\n` +
    `🚘 ${s.driverLicense || "-"}\n` +
    `📌 ${s.vacancy || "-"}\n\n`
  );
}

// --------------------------------------------------
// Bot Flow
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
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

// Message handler (language selection + flow) …
// [keep same as your long code above — no changes needed]
// --------------------------------------------------

// --------------------------------------------------
// Webhook handler for Vercel
// --------------------------------------------------
export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      console.log("📩 Incoming update:", JSON.stringify(req.body, null, 2));
      bot.processUpdate(req.body);
      return res.status(200).end();
    } catch (err) {
      console.error("❌ processUpdate error:", err);
      return res.status(500).send("error");
    }
  }
  return res.status(200).send("🤖 Bot is running!");
}
