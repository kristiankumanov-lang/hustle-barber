const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type ReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

type TelegramPayload = Record<string, unknown>;

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN липсва.");
  }
  return token;
}

async function callTelegram(method: string, payload: TelegramPayload) {
  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API_BASE}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.ok) {
    console.error("Telegram API error:", method, json);
    throw new Error(`Telegram API error: ${method}`);
  }

  return json;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: ReplyMarkup
) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  });
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: ReplyMarkup
) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  });
}

export async function answerTelegramCallback(
  callbackQueryId: string,
  text?: string,
  showAlert = false
) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

export function buildTelegramConfirmUrl(token: string): string {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) {
    throw new Error("TELEGRAM_BOT_USERNAME липсва.");
  }

  return `https://t.me/${username.replace("@", "")}?start=${encodeURIComponent(token)}`;
}

export function buildConfirmKeyboard(token: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: "✅ Потвърждавам часа", callback_data: `confirm:${token}` }],
    ],
  };
}
