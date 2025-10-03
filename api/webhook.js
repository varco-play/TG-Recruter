// api/webhook.js
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

/**
 * REQUIRED ENV:
 * BOT_TOKEN - Telegram bot token
 * MANAGER_CHAT_ID - where to send submitted applications
 * VACANCIES - JSON array, e.g. ["Cashier","Deli Clerk","Store Manager"]
 *
 * NOTE:
 * - This file expects you to set the webhook externally:
 *   https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<your-vercel-domain>/api/webhook
 *
 * - Sessions are stored in-memory. On serverless redeploys sessions reset.
 */

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = process.env.MANAGER_CHAT_ID;
const VACANCIES = JSON.parse(process.env.VACANCIES || "[]");

// Basic validation
if (!TOKEN || !MANAGER_ID) {
  throw new Error("BOT_TOKEN and MANAGER_CHAT_ID must be set in environment");
}

// Create bot instance (no polling; we receive updates via processUpdate)
const bot = new TelegramBot(TOKEN);
const sessions = {}; // { chatId: { step, lang, ... } }

// --- Translations ---
const T = {
  en: {
    startPanelTitle: "Welcome to GIG Investment Recruiting Bot",
    startPanelBody:
      "Here you can apply for multiple job vacancies. Press START to begin your application.",
    pressStart: "START",
    chooseLanguage: "Choose your preferred language of communication:",
    mainMenuTitle: "Main Menu",
    aboutUs: "About Us",
    contacts: "Contacts",
    allVacancies: "All Vacancies",
    chooseLanguageMenu: "Choose Language",
    back: "⬅️ Back",
    mainMenu: "🏠 Main Menu",
    vacancyPrompt: "📌 Which vacancy would you like to apply for?",
    askName: "👤 What’s your full name?",
    askContact: "📱 Please provide your contact number (WhatsApp/Telegram) with country code:",
    askExperience: "💼 Please select your experience:",
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
    aboutPlaceholder: "About us: (you can edit this later).",
    contactsPlaceholder: "Contacts: (you can edit this later).",
    backDone: "🔙 Went back.",
    chooseLanguageAgain: "🌐 Choose language:",
  },
  ru: {
    startPanelTitle: "Добро пожаловать в GIG Investment Recruiting Bot",
    startPanelBody:
      "Здесь вы можете подать заявку на несколько вакансий. Нажмите START, чтобы начать.",
    pressStart: "СТАРТ",
    chooseLanguage: "Выберите предпочитаемый язык общения:",
    mainMenuTitle: "Главное меню",
    aboutUs: "О нас",
    contacts: "Контакты",
    allVacancies: "Все вакансии",
    chooseLanguageMenu: "Выбрать язык",
    back: "⬅️ Назад",
    mainMenu: "🏠 Главное меню",
    vacancyPrompt: "📌 На какую вакансию вы хотите подать заявку?",
    askName: "👤 Как Вас зовут (полное имя)?",
    askContact: "📱 Укажите ваш контакт (WhatsApp/Telegram) с кодом страны:",
    askExperience: "💼 Укажите ваш опыт:",
    exp0: "0 лет",
    exp1: "1–3 года",
    exp2: "3+ года",
    askState: "📍 В каком вы штате/области?",
    askCity: "🏙️ В каком вы городе?",
    askZip: "📮 Укажите почтовый индекс (ZIP):",
    askDriver: "🚘 Есть ли у вас водительские права?",
    yes: "✅ Да",
    no: "❌ Нет",
    confirmTitle: "✅ Подтвердите вашу заявку:",
    confirmed: "✅ Ваша заявка успешно отправлена!",
    cancelled: "❌ Заявка отменена.",
    invalidOption: "⚠️ Пожалуйста, выберите вариант из меню.",
    aboutPlaceholder: "О нас: (заполните позже).",
    contactsPlaceholder: "Контакты: (заполните позже).",
    backDone: "🔙 Возвращено.",
    chooseLanguageAgain: "🌐 Выберите язык:",
  },
  es: {
    startPanelTitle: "Bienvenido a GIG Investment Recruiting Bot",
    startPanelBody:
      "Aquí puede postularse a múltiples vacantes. Presione START para comenzar su solicitud.",
    pressStart: "INICIAR",
    chooseLanguage: "Elija su idioma preferido de comunicación:",
    mainMenuTitle: "Menú principal",
    aboutUs: "Sobre nosotros",
    contacts: "Contactos",
    allVacancies: "Todas las vacantes",
    chooseLanguageMenu: "Elegir idioma",
    back: "⬅️ Volver",
    mainMenu: "🏠 Menú",
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
    confirmTitle: "✅ Confirme su solicitud:",
    confirmed: "✅ ¡Su solicitud ha sido enviada con éxito!",
    cancelled: "❌ Solicitud cancelada.",
    invalidOption: "⚠️ Por favor elija una opción del menú.",
    aboutPlaceholder: "Sobre nosotros: (rellene más tarde).",
    contactsPlaceholder: "Contactos: (rellene más tarde).",
    backDone: "🔙 Regresado.",
    chooseLanguageAgain: "🌐 Elegir idioma:",
  },
};

// helper: get text by lang with fallback to en
function t(lang, key) {
  return (T[lang] && T[lang][key]) || T.en[key] || "";
}

// --- Keyboards helpers ---

function appendPersistent(rows = [], lang = "en") {
  // ensure persistent row (Back, Main Menu) present as last row
  const persistent = [t(lang, "back"), t(lang, "mainMenu")];
  // if last row already contains them, don't duplicate
  const lastRow = rows[rows.length - 1] || [];
  if (lastRow.includes(persistent[0]) && lastRow.includes(persistent[1])) {
    return { keyboard: rows, one_time_keyboard: false, resize_keyboard: true };
  }
  return {
    keyboard: [...rows, persistent],
    one_time_keyboard: false,
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

function languageSelectionKeyboard() {
  return {
    keyboard: [
      ["🇬🇧 English", "🇷🇺 Русский"],
      ["🇪🇸 Español", "🇺🇿 (other)"],
    ],
    one_time_keyboard: true,
    resize_keyboard: true,
  };
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
      [{ text: "✅ Yes", callback_data: "driver_yes" }],
      [{ text: "❌ No", callback_data: "driver_no" }],
    ],
  };
}

function confirmInline(lang = "en") {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ " + (lang === "ru" ? "Подтвердить" : lang === "es" ? "Confirmar" : "Confirm"), callback_data: "confirm" }],
        [{ text: "❌ " + (lang === "ru" ? "Отмена" : lang === "es" ? "Cancelar" : "Cancel"), callback_data: "cancel" }],
      ],
    },
  };
}

// --- Step helpers ---
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
  const idx = stepOrder.indexOf(current);
  if (idx < 0 || idx + 1 >= stepOrder.length) return null;
  return stepOrder[idx + 1];
}

function prevStep(current) {
  const idx = stepOrder.indexOf(current);
  if (idx <= 0) return "choose_vacancy";
  return stepOrder[idx - 1];
}

// --- Confirmation message builder ---
function buildConfirmationText(lang, s) {
  return (
    `${t(lang, "confirmTitle")}\n\n` +
    `👤 ${s.name}\n` +
    `📱 ${s.contact}\n` +
    `💼 ${s.experience}\n` +
    `📍 ${s.state}, ${s.city}, ${s.zip}\n` +
    `🚘 ${s.driverLicense || "No"}\n` +
    `📌 ${s.vacancy || "-"}\n\n`
  );
}

// --- Bot handlers (define once) ---

// /start sends localized start panel and a START button
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  // default session language 'en' until user chooses
  sessions[chatId] = { lang: "en", step: null };
  const allLangsPanel =
    `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
    `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
    `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}\n\n` +
    `${T.en.pressStart} / ${T.ru.pressStart} / ${T.es.pressStart}`;

  // reply with a keyboard containing the START button and language buttons
  await bot.sendMessage(chatId, allLangsPanel, {
    reply_markup: {
      keyboard: [[T.en.pressStart, "🇬🇧 English"], ["🇷🇺 Русский", "🇪🇸 Español"]],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// Helper sendMainMenu
async function sendMainMenu(chatId) {
  const s = sessions[chatId] || { lang: "en" };
  await bot.sendMessage(chatId, t(s.lang, "mainMenuTitle"), {
    reply_markup: mainMenuKeyboard(s.lang),
  });
}

// Process plain messages (buttons or typed values)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = String(msg.text || "").trim();

  // ignore webhooks or bot startup messages that come from system
  if (!text) return;

  // If there's no session, create default and prompt with start panel
  if (!sessions[chatId]) {
    sessions[chatId] = { lang: "en", step: null };
    // send start panel localized in all languages (same as /start)
    const panel =
      `🇬🇧 ${T.en.startPanelTitle}\n${T.en.startPanelBody}\n\n` +
      `🇷🇺 ${T.ru.startPanelTitle}\n${T.ru.startPanelBody}\n\n` +
      `🇪🇸 ${T.es.startPanelTitle}\n${T.es.startPanelBody}\n\n` +
      `${T.en.pressStart} / ${T.ru.pressStart} / ${T.es.pressStart}`;
    return bot.sendMessage(chatId, panel, {
      reply_markup: {
        keyboard: [[T.en.pressStart, "🇬🇧 English"], ["🇷🇺 Русский", "🇪🇸 Español"]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
  }

  const s = sessions[chatId];

  // language selection handlers (user clicks language or START with language choice)
  if (/^(🇬🇧|English|English)$/i.test(text)) {
    s.lang = "en";
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }
  if (/^(🇷🇺|Русский|Русский)$/i.test(text)) {
    s.lang = "ru";
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }
  if (/^(🇪🇸|Español|Español)$/i.test(text)) {
    s.lang = "es";
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguageAgain"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }

  // if user clicked the START localized button (English/Русский/ES)
  if (
    text === T.en.pressStart ||
    text === T.ru.pressStart ||
    text === T.es.pressStart
  ) {
    s.lang = s.lang || "en";
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguage"), {
      reply_markup: languageSelectionKeyboard(),
    });
  }

  // Main Menu actions
  if (text === t(s.lang, "aboutUs")) {
    return bot.sendMessage(chatId, t(s.lang, "aboutPlaceholder"), {
      reply_markup: mainMenuKeyboard(s.lang),
    });
  }
  if (text === t(s.lang, "contacts")) {
    return bot.sendMessage(chatId, t(s.lang, "contactsPlaceholder"), {
      reply_markup: mainMenuKeyboard(s.lang),
    });
  }
  if (text === t(s.lang, "chooseLanguageMenu")) {
    s.step = null;
    return bot.sendMessage(chatId, t(s.lang, "chooseLanguage"), {
      reply_markup: languageSelectionKeyboard(),
    });
  }
  if (text === t(s.lang, "allVacancies")) {
    s.step = "choose_vacancy";
    return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), {
      reply_markup: vacanciesKeyboard(s.lang),
    });
  }

  // Persistent Back / Main Menu buttons
  if (text === t(s.lang, "back")) {
    // go to previous step if any
    s.step = prevStep(s.step || "choose_vacancy");
    // send question for current step
    switch (s.step) {
      case "choose_vacancy":
        return bot.sendMessage(chatId, t(s.lang, "vacancyPrompt"), {
          reply_markup: vacanciesKeyboard(s.lang),
        });
      case "name":
        return bot.sendMessage(chatId, t(s.lang, "askName"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      case "contact":
        return bot.sendMessage(chatId, t(s.lang, "askContact"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      case "experience":
        return bot.sendMessage(chatId, t(s.lang, "askExperience"), {
          reply_markup: experienceKeyboard(s.lang),
        });
      case "state":
        return bot.sendMessage(chatId, t(s.lang, "askState"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      case "city":
        return bot.sendMessage(chatId, t(s.lang, "askCity"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      case "zip":
        return bot.sendMessage(chatId, t(s.lang, "askZip"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      default:
        return bot.sendMessage(chatId, t(s.lang, "backDone"), {
          reply_markup: mainMenuKeyboard(s.lang),
        });
    }
  }

  if (text === t(s.lang, "mainMenu")) {
    return sendMainMenu(chatId);
  }

  // Application flow handling depending on step
  switch (s.step) {
    case "choose_vacancy":
      if (VACANCIES.includes(text)) {
        s.vacancy = text;
        s.step = "name";
        return bot.sendMessage(chatId, t(s.lang, "askName"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      } else {
        // Not a vacancy - show vacancies again
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), {
          reply_markup: vacanciesKeyboard(s.lang),
        });
      }

    case "name":
      s.name = text;
      s.step = "contact";
      return bot.sendMessage(chatId, t(s.lang, "askContact"), {
        reply_markup: backMainKeyboard(s.lang),
      });

    case "contact":
      s.contact = text;
      s.step = "experience";
      return bot.sendMessage(chatId, t(s.lang, "askExperience"), {
        reply_markup: experienceKeyboard(s.lang),
      });

    case "experience":
      // check experience buttons
      if (
        text === t(s.lang, "exp0") ||
        text === t(s.lang, "exp1") ||
        text === t(s.lang, "exp2")
      ) {
        s.experience = text;
        s.step = "state";
        return bot.sendMessage(chatId, t(s.lang, "askState"), {
          reply_markup: backMainKeyboard(s.lang),
        });
      } else {
        return bot.sendMessage(chatId, t(s.lang, "invalidOption"), {
          reply_markup: experienceKeyboard(s.lang),
        });
      }

    case "state":
      s.state = text;
      s.step = "city";
      return bot.sendMessage(chatId, t(s.lang, "askCity"), {
        reply_markup: backMainKeyboard(s.lang),
      });

    case "city":
      s.city = text;
      s.step = "zip";
      return bot.sendMessage(chatId, t(s.lang, "askZip"), {
        reply_markup: backMainKeyboard(s.lang),
      });

    case "zip":
      s.zip = text;
      s.step = "driver_license";
      return bot.sendMessage(chatId, t(s.lang, "askDriver"), {
        reply_markup: yesNoInline(),
      });

    case "driver_license":
      // user typed yes/no (we prefer inline buttons, but check text)
      if (
        text.toLowerCase() === "yes" ||
        text === t(s.lang, "yes") ||
        text.toLowerCase() === "да" ||
        text.toLowerCase() === "sí" ||
        text === t(s.lang, "no") ||
        text === t(s.lang, "no")
      ) {
        s.driverLicense = text;
        s.step = "confirm";
        const conf = buildConfirmationText(s.lang, s);
        return bot.sendMessage(chatId, conf, confirmInline(s.lang));
      }
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), {
        reply_markup: yesNoInline(),
      });

    case null:
    case undefined:
      // if user typed something at a time no step is active:
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), {
        reply_markup: mainMenuKeyboard(s.lang),
      });

    case "confirm":
      // If user typed "confirm" manually
      if (text.toLowerCase() === "confirm" || text === "✅") {
        // submit
        const managerMsg = buildConfirmationText(s.lang, s) + `Telegram ID: ${chatId}`;
        await bot.sendMessage(MANAGER_ID, managerMsg, { parse_mode: "Markdown" });
        await bot.sendMessage(chatId, t(s.lang, "confirmed"), {
          reply_markup: mainMenuKeyboard(s.lang),
        });
        delete sessions[chatId];
        return;
      }
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), {
        reply_markup: confirmInline(s.lang).reply_markup,
      });

    default:
      return bot.sendMessage(chatId, t(s.lang, "invalidOption"), {
        reply_markup: mainMenuKeyboard(s.lang),
      });
  }
});

// Callback queries (inline buttons)
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
      ...confirmInline(s.lang),
    });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "driver_no") {
    s.driverLicense = t(s.lang, "no");
    s.step = "confirm";
    const conf = buildConfirmationText(s.lang, s);
    await bot.editMessageText(conf, {
      chat_id: chatId,
      message_id: query.message.message_id,
      ...confirmInline(s.lang),
    });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "confirm") {
    const managerMsg = buildConfirmationText(s.lang, s) + `Telegram ID: ${chatId}`;
    await bot.sendMessage(MANAGER_ID, managerMsg, { parse_mode: "Markdown" });
    await bot.sendMessage(chatId, t(s.lang, "confirmed"), {
      reply_markup: mainMenuKeyboard(s.lang),
    });
    delete sessions[chatId];
    await bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "cancel") {
    await bot.sendMessage(chatId, t(s.lang, "cancelled"), {
      reply_markup: mainMenuKeyboard(s.lang),
    });
    delete sessions[chatId];
    await bot.answerCallbackQuery(query.id);
    return;
  }

  await bot.answerCallbackQuery(query.id);
});

// Vercel handler: Telegram posts updates to this function
export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      bot.processUpdate(req.body);
      return res.status(200).end();
    } catch (err) {
      console.error("processUpdate error:", err);
      return res.status(500).send("error");
    }
  } else {
    // allow browsing the URL for a quick health check
    return res.status(200).send("🤖 Bot is running!");
  }
}
