#!/usr/bin/env tsx

import logger from './utils/logger';
import { printRentAnalysisReport } from './services/reporter';

async function testReporter() {
  logger.section('KORA RENT RECLAIM BOT - REPORTER TEST');
  
  try {
    // Generate and print the comprehensive rent analysis
    const analysis = printRentAnalysisReport();
    
    logger.section('REPORTER TEST COMPLETE');
    logger.success('✅ Reporter is working correctly!');
    
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Run: npm run test:scanner to discover more accounts');
    logger.info('2. Run: npm run test:monitor to check account balances');
    logger.info('3. Run: npm run test:reclaim to recover rent (dry-run first)');
    logger.info('4. Run: npm run test:report to see updated analysis');
    
  } catch (error: any) {
    logger.error(`Reporter test failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  testReporter();
}
