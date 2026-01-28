import logger from '../utils/logger';
import { readJSON } from '../utils/database';
import { TrackedAccount } from '../types';
import config from '../config';
import { RentAnalysis } from '../types';
import { lamportsToSol } from '../utils/solana';

export function generateRentAnalysis(): RentAnalysis {
  const trackedAccounts = readJSON<Record<string, TrackedAccount>>(config.database.trackedAccountsPath) || {};
  const reclaimHistory = readJSON<Record<string, any>>(config.database.reclaimHistoryPath) || {};

  const analysis: RentAnalysis = {
    totalAccounts: 0,
    totalLamports: 0,
    operatorOwned: {
      total: 0,
      totalLamports: 0,
      active: 0,
      activeLamports: 0,
      eligible: 0,
      eligibleLamports: 0,
      reclaimed: 0,
      reclaimedLamports: 0,
    },
    userOwned: {
      total: 0,
      totalLamports: 0,
      active: 0,
      activeLamports: 0,
      empty: 0,
      emptyLamports: 0,
    },
  };

  // Analyze tracked accounts
  for (const account of Object.values(trackedAccounts)) {
    analysis.totalAccounts++;
    const lamports = account.metadata?.lamports || 0;
    analysis.totalLamports += lamports;

    if (account.category === 'operator-owned') {
      analysis.operatorOwned.total++;
      analysis.operatorOwned.totalLamports += lamports;

      const tokenBalance = account.metadata?.tokenBalance || 0;
      const status = account.metadata?.status;

      if (status === 'reclaimed') {
        analysis.operatorOwned.reclaimed++;
        analysis.operatorOwned.reclaimedLamports += lamports;
      } else if (tokenBalance === 0 && lamports >= config.monitor.minLamportsForReclaim) {
        analysis.operatorOwned.eligible++;
        analysis.operatorOwned.eligibleLamports += lamports;
      } else {
        analysis.operatorOwned.active++;
        analysis.operatorOwned.activeLamports += lamports;
      }
    } else if (account.category === 'user-owned') {
      analysis.userOwned.total++;
      analysis.userOwned.totalLamports += lamports;

      const tokenBalance = account.metadata?.tokenBalance || 0;
      
      if (tokenBalance === 0) {
        analysis.userOwned.empty++;
        analysis.userOwned.emptyLamports += lamports;
      } else {
        analysis.userOwned.active++;
        analysis.userOwned.activeLamports += lamports;
      }
    }
  }

  return analysis;
}

export function printRentAnalysisReport() {
  const analysis = generateRentAnalysis();
  
  logger.section('KORA RENT ANALYSIS REPORT');
  
  logger.info('TOTAL RENT PAID BY KORA:');
  logger.info(`├── Total Accounts: ${analysis.totalAccounts} | ${lamportsToSol(analysis.totalLamports)} SOL`);
  logger.info(`├── Operator-Owned: ${analysis.operatorOwned.total} | ${lamportsToSol(analysis.operatorOwned.totalLamports)} SOL`);
  logger.info(`└── User-Owned: ${analysis.userOwned.total} | ${lamportsToSol(analysis.userOwned.totalLamports)} SOL`);
  
  logger.info('');
  logger.info('OPERATOR-OWNED ACCOUNTS: (Reclaimable)');
  logger.info(`├── Total: ${analysis.operatorOwned.total} accounts | ${lamportsToSol(analysis.operatorOwned.totalLamports)} SOL`);
  logger.info(`├── Active: ${analysis.operatorOwned.active} accounts | ${lamportsToSol(analysis.operatorOwned.activeLamports)} SOL (has tokens)`);
  logger.info(`├── Eligible: ${analysis.operatorOwned.eligible} accounts | ${lamportsToSol(analysis.operatorOwned.eligibleLamports)} SOL (ready to reclaim)`);
  logger.info(`└── Reclaimed: ${analysis.operatorOwned.reclaimed} accounts | ${lamportsToSol(analysis.operatorOwned.reclaimedLamports)} SOL (already recovered)`);
  
  logger.info('');
  logger.info('USER-OWNED ACCOUNTS: (Non-Reclaimable)');
  logger.info(`├── Total: ${analysis.userOwned.total} accounts | ${lamportsToSol(analysis.userOwned.totalLamports)} SOL`);
  logger.info(`├── Active: ${analysis.userOwned.active} accounts | ${lamportsToSol(analysis.userOwned.activeLamports)} SOL (has tokens)`);
  logger.info(`└── Empty: ${analysis.userOwned.empty} accounts | ${lamportsToSol(analysis.userOwned.emptyLamports)} SOL`);
  logger.info(`└── Note: Rent paid by Kora but cannot be recovered`);
  
  logger.info('');
  logger.info('INSIGHTS:');
  const recoveryPotential = analysis.totalLamports > 0 ? (analysis.operatorOwned.eligibleLamports / analysis.totalLamports * 100) : 0;
  const nonRecoverable = analysis.totalLamports > 0 ? (analysis.userOwned.totalLamports / analysis.totalLamports * 100) : 0;
  
  logger.info(`├── Rent Recovery Potential: ${lamportsToSol(analysis.operatorOwned.eligibleLamports)} SOL (${recoveryPotential.toFixed(1)}%)`);
  logger.info(`├── Non-Recoverable Rent: ${lamportsToSol(analysis.userOwned.totalLamports)} SOL (${nonRecoverable.toFixed(1)}%)`);
  logger.info(`└── Reason: User-owned ATAs created via transferTransaction`);
  
  return analysis;
}