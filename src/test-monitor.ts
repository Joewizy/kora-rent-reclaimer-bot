import './config';
import logger from './utils/logger';
import { runMonitorOnce } from './services/monitor';

async function main() {
  logger.section('KORA RENT RECLAIM BOT - MONITOR TEST');

  try {
    // Run monitor
    const results = await runMonitorOnce();

    logger.section('TEST COMPLETE');
    logger.success('Monitor is working correctly!');
    
    if (results.eligible > 0) {
      logger.info('\nNext steps:');
      logger.info('1. Review eligible accounts in ./data/tracked-accounts.json');
      logger.info('2. Run: npm run test:reclaim to recover rent (test with DRY_RUN=true first)');
      logger.info('3. Set DRY_RUN=false to actually reclaim rent');
    } else {
      logger.info('\nNo eligible accounts found yet.');
      logger.info('This is expected if all accounts still have token balances.');
      logger.info('Accounts become eligible when their token balance reaches zero.');
    }
  } catch (err: any) {
    logger.error('Monitor test failed:', err);
    process.exit(1);
  }
}

main();