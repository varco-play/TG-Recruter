// api/webhook.js
import dotenv from "dotenv";
dotenv.config(); // loads local .env when running locally (safe to keep)

import TelegramBot from "node-telegram-bot-api";

/**
 * REQUIREMENTS (set as Vercel Environment Variables)
 * BOT_TOKEN - Telegram bot token (from BotFather)
 * MANAGER_CHAT_ID - your Telegram user id (where apps are sent)
 * VACANCIES - JSON array, e.g. ["Cashier","Deli Clerk","Store Manager"]
 *
 * On Vercel: set these in Project → Settings → Environment Variables
 */

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = JSON.parse(process.env.VACANCIES || "[]");

if (!TOKEN || !MANAGER_ID) {
  throw new Error("BOT_TOKEN and MANAGER_CHAT_ID must be set in environment");
}

// create bot (we don't poll — webhook posts to this function)
const bot = new TelegramBot(TOKEN);
const sessions = {}; // in-memory per chat sessions (resets on redeploy)

// --------------------------------------------------
// TRANSLATIONS (full texts in En / Ru / Es)
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
    askContact:
      "📱 Укажите контакт (WhatsApp/Telegram) с кодом страны:",
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
  },
};

function t(lang, key) {
  if (!lang || !T[lang]) lang = "en";
  return T[lang][key] ?? T.en[key] ?? "";
}

// --------------------------------------------------
// Keyboards - localized & with emojis
// --------------------------------------------------
function appendPersistent(rows = [], lang = "en") {
  const persistent = [t(lang, "back"), t(lang, "mainMenu")];
  // ensure last row has the persistent pair
  const last = rows[rows.length - 1];
  if (last && last.includes(persistent[0]) && last.includes(persistent[1])) {
    return { keyboard: rows, one_time_keyboard: false, resize_keyboard: true };
  }
  return {
    keyboard: [...rows, persistent],
    one_time_keyboard: false,
    resize_keyboard: true,
  };
}

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

function backMainKeyboard(lang = "en") {
  return appendPersistent([], lang);
}

function yesNoInline() {
  return {
    inline_keyboard: [
      [{ text: "✅", callback_data: "driver_yes" }],
      [{ text: "❌", callback_data: "driver_no" }],
    ],
  };
}

function confirmInline(lang = "en") {
  const confirmText = lang === "ru" ? "Подтвердить" : lang === "es" ? "Confirmar" : "Confirm";
  const cancelText = lang === "ru" ? "Отмена" : lang === "es" ? "Cancelar" : "Cancel";
  return {
    inline_keyboard: [
      [{ text: "✅ " + confirmText, callback_data: "confirm" }],
      [{ text: "❌ " + cancelText, callback_data: "cancel" }],
    ],
  };
}

// --------------------------------------------------
// Steps & helpers
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
  if (i < 0) return stepOrder[0];
  return stepOrder[i + 1] ?? null;
}
function prevStep(current) {
  const i = stepOrder.indexOf(current);
  if (i <= 0) return stepOrder[0];
  return stepOrder[i - 1];
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
// Bot flow
// --------------------------------------------------

// /start: sends combined multilingual panel + Start keyboard
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { lang: "en", step: null, history: [] };

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

// helper to send main menu
async function sendMainMenu(chatId) {
  const s = sessions[chatId] || { lang: "en" };
  await bot.sendMessage(chatId, t(s.lang, "mainMenuTitle"), {
    reply_markup: mainMenuKeyboard(s.lang),
  });
}

// main message handler
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const raw = String(msg.text || "").trim();
  if (!raw) return; // ignore non-text

  // ensure session
  if (!sessions[chatId]) {
    sessions[chatId] = { lang: "en", step: null, history: [] };
    // show start panel again
    const panel =
      `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
      `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
      `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}\n\n` +
      `${T.en.startPanelFooter}`;
    return bot.sendMessage(chatId, panel, {
      reply_markup: {
        keyboard: [[T.en.pressStart], ["🇬🇧 English", "🇷🇺 Русский", "🇪🇸 Español"]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
  }

  const s = sessions[chatId];

  // Language selection by pressing language button
  if (/^(🇬🇧|English)$/i.test(raw)) {
    s.lang = "en";
    s.step = "choose_vacancy";
    s.history = [];
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain") || t(s.lang, "chooseLanguagePrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }
  if (/^(🇷🇺|Русск|Русский|Русский)$/i.test(raw)) {
    s.lang = "ru";
    s.step = "choose_vacancy";
    s.history = [];
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain") || t(s.lang, "chooseLanguagePrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }
  if (/^(🇪🇸|Español|Español|Español)$/i.test(raw)) {
    s.lang = "es";
    s.step = "choose_vacancy";
    s.history = [];
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain") || t(s.lang, "chooseLanguagePrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }

  // If START button localized (user pressed the one from panel)
  if (raw === T.en.pressStart || raw === T.ru.pressStart || raw === T.es.pressStart) {
    // Ask to choose preferred language
    s.step = "choose_vacancy"; // next we'll ask language explicitly
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguagePrompt"), {
      reply_markup: languageKeyboard(),
    });
  }

  // Main Menu buttons (localized)
  if (raw === t(s.lang, "aboutUs")) {
    return bot.sendMessage(chatId, t(s.lang, "aboutPlaceholder"), {
      reply_markup: mainMenuKeyboard(s.lang),
    });
  }
  if (raw === t(s.lang, "contacts")) {
    return bot.sendMessage(chatId, t(s.lang, "contactsPlaceholder"), {
      reply_markup: mainMenuKeyboard(s.lang),
    });
  }
  if (raw === t(s.lang, "chooseLanguageMenu")) {
    s.step = null;
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguagePrompt"), { reply_markup: languageKeyboard() });
  }
  if (raw === t(s.lang, "allVacancies")) {
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
  }

  // Persistent Back & Main Menu handling
  if (raw === t(s.lang, "back")) {
    s.step = prevStep(s.step || "choose_vacancy");
    // send relevant prompt for that step
    switch (s.step) {
      case "choose_vacancy":
        return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), { reply_markup: vacanciesKeyboard(s.lang) });
      case "name":
        return bot.sendMessage(chatId, t(s.lang, "askName"), { reply_markup: backMainKeyboard(s.lang) });
      case "contact":
        return bot.sendMessage(chatId, t(s.lang, "askContact"), { reply_markup: backMainKeyboard(s.lang) });
      case "experience":
        return bot.sendMessage(chatId, t(s.lang, "askExperience"), { reply_markup: experienceKeyboard(s.lang) });
      case "state":
        return bot.sendMessage(chatId, t(s.lang, "askState"), { reply_markup: backMainKeyboard(s.lang) });
      case "city":
        return bot.sendMessage(chatId, t(s.lang, "askCity"), { reply_markup: backMainKeyboard(s.lang) });
      case "zip":
        return bot.sendMessage(chatId, t(s.lang, "askZip"), { reply_markup: backMainKeyboard(s.lang) });
      default:
        return bot.sendMessage(chatId, t(s.lang, "backDone"), { reply_markup: mainMenuKeyboard(s.lang) });
    }
  }
  if (raw === t(s.lang, "mainMenu")) {
    return sendMainMenu(chatId);
  }

  // Application flow by step
  switch (s.step) {
    case "choose_vacancy":
      if (VACANCIES.includes(raw)) {
        s.vacancy = raw;
        s.step = "name";
        return bot.sendMessage(chatId, t(s.lang, "askName"), { reply_markup: backMainKeyboard(s.lang) });
      } else {
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: vacanciesKeyboard(s.lang) });
      }

    case "name":
      s.name = raw;
      s.step = "contact";
      return bot.sendMessage(chatId, t(s.lang, "askContact"), { reply_markup: backMainKeyboard(s.lang) });

    case "contact":
      s.contact = raw;
      s.step = "experience";
      return bot.sendMessage(chatId, t(s.lang, "askExperience"), { reply_markup: experienceKeyboard(s.lang) });

    case "experience":
      if ([t(s.lang, "exp0"), t(s.lang, "exp1"), t(s.lang, "exp2")].includes(raw)) {
        s.experience = raw;
        s.step = "state";
        return bot.sendMessage(chatId, t(s.lang, "askState"), { reply_markup: backMainKeyboard(s.lang) });
      } else {
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: experienceKeyboard(s.lang) });
      }

    case "state":
      s.state = raw;
      s.step = "city";
      return bot.sendMessage(chatId, t(s.lang, "askCity"), { reply_markup: backMainKeyboard(s.lang) });

    case "city":
      s.city = raw;
      s.step = "zip";
      return bot.sendMessage(chatId, t(s.lang, "askZip"), { reply_markup: backMainKeyboard(s.lang) });

    case "zip":
      s.zip = raw;
      s.step = "driver_license";
      return bot.sendMessage(chatId, t(s.lang, "askDriver"), { reply_markup: yesNoInline() });

    case "driver_license":
      // user typed answer instead of clicking inline (accept basic variants)
      if (/^(yes|no|да|нет|sí|si|sí)$/i.test(raw) || raw === t(s.lang, "yes") || raw === t(s.lang, "no")) {
        s.driverLicense = raw;
        s.step = "confirm";
        const conf = buildConfirmationText(s.lang, s);
        return bot.sendMessage(chatId, conf, { reply_markup: { inline_keyboard: confirmInline(s.lang) } });
      }
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: yesNoInline() });

    case "confirm":
      // user typed confirm
      if (/confirm|подтверд|confirmar|✅/i.test(raw)) {
        const managerMsg = buildConfirmationText(s.lang, s) + `Telegram ID: ${chatId}`;
        await bot.sendMessage(MANAGER_ID, managerMsg, { parse_mode: "Markdown" });
        await bot.sendMessage(chatId, t(s.lang, "confirmed"), { reply_markup: mainMenuKeyboard(s.lang) });
        delete sessions[chatId];
        return;
      }
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: { inline_keyboard: confirmInline(s.lang) } });

    default:
      // if no active step: show main menu
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), { reply_markup: mainMenuKeyboard(s.lang) });
  }
});

// callback queries (inline)
bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const s = sessions[chatId] || { lang: "en" };

  if (data === "driver_yes") {
    s.driverLicense = t(s.lang, "yes");
    s.step = "confirm";
    const conf = buildConfirmationText(s.lang, s);
    await bot.editMessageText(conf, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: confirmInline(s.lang) },
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === "driver_no") {
    s.driverLicense = t(s.lang, "no");
    s.step = "confirm";
    const conf = buildConfirmationText(s.lang, s);
    await bot.editMessageText(conf, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: confirmInline(s.lang) },
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === "confirm") {
    const managerMsg = buildConfirmationText(s.lang, s) + `Telegram ID: ${chatId}`;
    await bot.sendMessage(MANAGER_ID, managerMsg, { parse_mode: "Markdown" });
    await bot.sendMessage(chatId, t(s.lang, "confirmed"), { reply_markup: mainMenuKeyboard(s.lang) });
    delete sessions[chatId];
    return bot.answerCallbackQuery(query.id);
  }

  if (data === "cancel") {
    await bot.sendMessage(chatId, t(s.lang, "cancelled"), { reply_markup: mainMenuKeyboard(s.lang) });
    delete sessions[chatId];
    return bot.answerCallbackQuery(query.id);
  }

  return bot.answerCallbackQuery(query.id);
});

// Vercel handler
export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      bot.processUpdate(req.body);
      return res.status(200).end();
    } catch (err) {
      console.error("processUpdate error:", err);
      return res.status(500).send("error");
    }
  }
  // GET -> health check
  return res.status(200).send("🤖 Bot is running!");
}
