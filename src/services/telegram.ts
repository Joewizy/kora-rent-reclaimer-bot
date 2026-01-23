import { Telegraf } from 'telegraf';
import logger from '../utils/logger';
import config from '../config';

let bot: Telegraf | null = null;

export function initTelegram() {
  if (!config.telegram.enabled) return null;
  const token = config.telegram.botToken;
  if (!token) return null;
  bot = new Telegraf(token);
  return bot;
}

export async function sendTelegramMessage(text: string) {
  try {
    if (!config.telegram.enabled) return;
    if (!bot) initTelegram();
    if (!bot) return;
    const chatId = config.telegram.chatId;
    if (!chatId) {
      logger.warn('TELEGRAM_CHAT_ID not set');
      return;
    }
    await bot.telegram.sendMessage(chatId, text);
  } catch (err) {
    logger.error(`telegram send failed: ${err}`);
  }
}