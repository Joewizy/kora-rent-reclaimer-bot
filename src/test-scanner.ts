import './config';
import logger from './utils/logger';
import { scanForAccounts } from './services/scanner';
import { readJSON } from './utils/database';
import { TrackedAccount } from './types';

async function main() {
  logger.section('KORA RENT RECLAIM BOT - SCANNER TEST');

  try {
    // Display initial stats
    const existing = readJSON<Record<string, TrackedAccount>>('./data/tracked-accounts.json');
    const initialCount = existing ? Object.keys(existing).length : 0;
    
    logger.subsection('Initial Stats');
    logger.info(`Currently tracking: ${initialCount} accounts`);

    // Run scan
    const results = await scanForAccounts();

    // Display final stats
    logger.subsection('Final Stats');
    logger.info('Scan results:', results);

    logger.section('TEST COMPLETE');
    logger.success('Scanner is working correctly!');
    logger.info('\nNext steps:');
    logger.info('1. Check ./data/tracked-accounts.json to see discovered accounts');
    logger.info('2. Run: npm run test:monitor to check account balances');
    logger.info('3. Run: npm run test:reclaim to recover rent (dry-run first)');
  } catch (err: any) {
    logger.error('Scanner test failed:', err);
    process.exit(1);
  }
}

main();