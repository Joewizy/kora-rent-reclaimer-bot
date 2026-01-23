import './config';
import logger from './utils/logger';
import { runMonitorOnce } from './services/monitor';
import { scanForAccounts } from './services/scanner';
import { initTelegram } from './services/telegram';

async function main() {
  initTelegram();
  logger.info('rent-reclaim-bot starting');
  try {
    await scanForAccounts();
    await runMonitorOnce();
  } catch (err) {
    logger.error(`startup error: ${err}`);
  }
}

main();
