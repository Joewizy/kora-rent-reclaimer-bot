#!/usr/bin/env tsx

import logger from './utils/logger';
import { initTelegram } from './services/telegram';
import config from './config';

async function main() {
  logger.section('KORA TELEGRAM BOT');
  
  try {
    if (!config.telegram.enabled) {
      logger.info('Telegram is disabled. Set TELEGRAM_ENABLED=true in .env to enable.');
      return;
    }
    
    const bot = initTelegram();
    if (!bot) {
      logger.error('Failed to initialize Telegram bot. Check your configuration.');
      return;
    }
    
    logger.info('🤖 Telegram bot started successfully!');
    logger.info('Bot commands:');
    logger.info('  /start  - Welcome message');
    logger.info('  /status - Current rent status');
    logger.info('  /report - Full analysis report');
    logger.info('  /reclaim - Manual reclaim check');
    logger.info('  /tip - Get tips');
    logger.info('  /help   - Show this help');
    
    // Start the bot
    await bot.launch();
    
    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    logger.error('Telegram bot failed to start:', error);
    process.exit(1);
  }
}

main().catch((e) => console.error('Error:', e));
