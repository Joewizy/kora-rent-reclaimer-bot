import { Connection, PublicKey } from '@solana/web3.js';
import { AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import logger from '../utils/logger';
import { readJSON, writeJSON } from '../utils/database';
import { TrackedAccount } from '../types';
import config from '../config';
import path from 'path';

const TRACKED_PATH = path.join(process.cwd(), 'data', 'tracked-accounts.json');

export async function runMonitorOnce() {
  logger.section('MONITORING TRACKED ACCOUNTS');

  const connection = new Connection(config.rpc.url, config.rpc.commitment as any);
  const trackedAccounts = readJSON<Record<string, TrackedAccount>>(TRACKED_PATH);

  if (!trackedAccounts || Object.keys(trackedAccounts).length === 0) {
    logger.warn('No tracked accounts found. Run scanner first.');
    return {
      totalChecked: 0,
      eligible: 0,
      active: 0,
      alreadyClosed: 0,
      errors: 0,
    };
  }

  const accounts = Object.values(trackedAccounts);
  let checked = 0;
  let eligible = 0;
  let active = 0;
  let alreadyClosed = 0;
  let errors = 0;

  logger.info(`Total accounts to check: ${accounts.length}`);

  for (const account of accounts) {
    try {
      const pubkey = new PublicKey(account.address);
      const accountInfo = await connection.getAccountInfo(pubkey);

      if (!accountInfo) {
        // Account doesn't exist (already closed)
        logger.info(`❌ Account already closed: ${account.address}`);
        alreadyClosed++;
        
        // Update status in the database
        account.metadata = {
          ...account.metadata,
          status: 'closed',
          checkedAt: new Date().toISOString(),
        };
        continue;
      }

      const lamports = accountInfo.lamports;
      let tokenBalance = 0;

      // Try to parse as token account
      try {
        if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
          const decoded = AccountLayout.decode(accountInfo.data);
          tokenBalance = Number(decoded.amount);
        }
      } catch (err) {
        logger.debug(`Could not decode token account ${account.address}`);
      }

      // Account is eligible for reclaim if:
      // 1. Has lamports (rent deposit)
      // 2. Token balance is zero
      // 3. Lamports >= minimum threshold
      const isEligible =
        lamports >= config.monitor.minLamportsForReclaim && tokenBalance === 0;

      if (isEligible) {
        logger.success(
          `✨ Eligible for reclaim: ${account.address} (${lamports} lamports, ${tokenBalance} tokens)`
        );
        eligible++;
        
        // Update metadata
        account.metadata = {
          ...account.metadata,
          lamports,
          tokenBalance,
          status: 'eligible',
          checkedAt: new Date().toISOString(),
        };
      } else {
        logger.info(
          `✅ Active account: ${account.address} (${tokenBalance} tokens, ${lamports} lamports)`
        );
        active++;
        
        // Update metadata
        account.metadata = {
          ...account.metadata,
          lamports,
          tokenBalance,
          status: 'active',
          checkedAt: new Date().toISOString(),
        };
      }

      checked++;

      // Rate limiting - small delay between checks
      if (checked % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err: any) {
      errors++;
      logger.error(`Error checking account ${account.address}: ${err.message}`);
    }
  }

  // Save updated accounts
  writeJSON(TRACKED_PATH, trackedAccounts);

  const stats = {
    totalChecked: checked,
    eligible,
    active,
    alreadyClosed,
    errors,
  };

  logger.subsection('MONITORING SUMMARY');
  logger.info('Results:', stats);

  if (eligible > 0) {
    const eligibleAccounts = Object.values(trackedAccounts).filter(
      (a) => a.metadata?.status === 'eligible'
    );
    const totalLamports = eligibleAccounts.reduce(
      (sum, a) => sum + (a.metadata?.lamports || 0),
      0
    );
    logger.success(`Found ${eligible} accounts ready for rent reclaim!`);
    logger.success(
      `Total reclaimable: ${(totalLamports / 1e9).toFixed(6)} SOL (${totalLamports} lamports)`
    );
  } else {
    logger.info('No accounts are eligible for rent reclaim at this time.');
  }

  return stats;
}