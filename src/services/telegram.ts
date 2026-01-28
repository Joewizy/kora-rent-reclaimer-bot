import { Telegraf } from 'telegraf';
import logger from '../utils/logger';
import config from '../config';

let bot: Telegraf | null = null;

export function initTelegram() {
  if (!config.telegram.enabled) return null;
  const token = config.telegram.botToken;
  if (!token) return null;
  bot = new Telegraf(token);

  bot.command('start', (ctx) => {
    ctx.reply('🤖 *Kora Rent Reclaim Bot*\n\nI help you monitor and reclaim rent from Kora-sponsored accounts!\n\nCommands:\n/status - Current rent status\n/reclaim - Manual reclaim check\n/report - Full analysis report', { parse_mode: 'Markdown' });
  });
  
  bot.command('status', async (ctx) => {
    try {
      const { generateRentAnalysis } = await import('./reporter');
      const analysis = generateRentAnalysis();
      const message = `📊 *Current Status*\n\n🏦 Total Rent: ${(analysis.totalLamports / 1_000_000_000).toFixed(9)} SOL\n💰 Reclaimed: ${(analysis.operatorOwned.reclaimedLamports / 1_000_000_000).toFixed(9)} SOL\n🎯 Available: ${(analysis.operatorOwned.eligibleLamports / 1_000_000_000).toFixed(9)} SOL\n📈 Recovery Rate: ${((analysis.operatorOwned.reclaimedLamports / analysis.operatorOwned.totalLamports) * 100).toFixed(1)}%`;
      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
      ctx.reply('❌ Error getting status');
    }
  });
  
  bot.command('report', async (ctx) => {
    try {
      const { generateRentAnalysis } = await import('./reporter');
      const analysis = generateRentAnalysis();
      const message = `📊 *Full Rent Report*\n\n*Operator-Owned (Reclaimable):*\n📈 Total: ${analysis.operatorOwned.total} accounts | ${(analysis.operatorOwned.totalLamports / 1_000_000_000).toFixed(9)} SOL\n✅ Active: ${analysis.operatorOwned.active} accounts | ${(analysis.operatorOwned.activeLamports / 1_000_000_000).toFixed(9)} SOL\n🎯 Eligible: ${analysis.operatorOwned.eligible} accounts | ${(analysis.operatorOwned.eligibleLamports / 1_000_000_000).toFixed(9)} SOL\n💰 Reclaimed: ${analysis.operatorOwned.reclaimed} accounts | ${(analysis.operatorOwned.reclaimedLamports / 1_000_000_000).toFixed(9)} SOL\n\n*User-Owned (Non-Reclaimable):*\n👤 Total: ${analysis.userOwned.total} accounts | ${(analysis.userOwned.totalLamports / 1_000_000_000).toFixed(9)} SOL`;
      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
      ctx.reply('❌ Error generating report');
    }
  });
  
  bot.command('reclaim', async (ctx) => {
    ctx.reply('🔄 Checking for eligible accounts...\n\nThis will run in dry-run mode for safety. Use the main application to actually reclaim rent.', { parse_mode: 'Markdown' });
  });
  
  bot.command('help', (ctx) => {
    ctx.reply('🤖 *Kora Rent Reclaim Bot Commands*\n\n/start - Welcome message\n/status - Current rent status\n/report - Full analysis report\n/reclaim - Manual reclaim check\n/help - Show this help', { parse_mode: 'Markdown' });
  });

  bot.command('tip', async (ctx) => {
    ctx.reply('💡 *Tip:* Contact Joewizyskills for more info', { parse_mode: 'MarkdownV2' });
  });
  
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
    await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`telegram send failed: ${err}`);
  }
}

// Send formatted rent reclaim notification
export async function sendReclaimNotification(address: string, lamports: number, signature?: string) {
  const sol = (lamports / 1_000_000_000).toFixed(9);
  const message = `💰 *Rent Reclaimed!*
  
  📍 Account: \`${address.slice(0, 8)}...${address.slice(-8)}\`
  💎 Amount: ${sol} SOL
  🔗 Signature: ${signature ? `[View on Solscan](https://solscan.io/tx/${signature})` : 'N/A'}
  ⏰ Time: ${new Date().toLocaleString()}`;
  
  await sendTelegramMessage(message);
}

// Send daily/weekly summary
export async function sendRentSummary(summary: any) {
  const message = `📊 *Rent Analysis Report*

  🏦 Total Rent: ${summary.totalLamports / 1_000_000_000} SOL
  💰 Reclaimed: ${summary.operatorOwned.reclaimedLamports / 1_000_000_000} SOL
  🎯 Available: ${summary.operatorOwned.eligibleLamports / 1_000_000_000} SOL
  📈 Recovery Rate: ${((summary.operatorOwned.reclaimedLamports / summary.operatorOwned.totalLamports) * 100).toFixed(1)}%

  Run \`/status\` for live updates`;
  
  await sendTelegramMessage(message);
}