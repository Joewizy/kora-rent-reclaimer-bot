import logger from '../utils/logger';
import { readJSON, writeJSON } from '../utils/database';
import { ReclaimRecord } from '../types';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { closeTokenAccount, getConnection } from '../utils/solana';
import { sendTelegramMessage, sendReclaimNotification } from './telegram';
import config from '../config';
import path from 'path';

const HISTORY_PATH = path.join(process.cwd(), 'data', 'reclaim-history.json');
const TRACKED_PATH = path.join(process.cwd(), 'data', 'tracked-accounts.json');

export async function reclaimAccount(address: string) {
  logger.info(`Attempting reclaim for ${address}`);
  
  const connection = getConnection(config.rpc.url);
  const pub = new PublicKey(address);
  
  // Check if we're in dry run mode
  const dryRun = config.reclaimer.dryRun;
  
  if (dryRun) {
    logger.info(`DRY RUN: Would reclaim account ${address}`);
    const record: ReclaimRecord = {
      address,
      reclaimedAt: new Date().toISOString(),
      note: 'Dry run - account would be reclaimed if DRY_RUN=false',
    };
    
    // Save to history
    const existing = (readJSON(HISTORY_PATH) as ReclaimRecord[]) || [];
    existing.push(record);
    writeJSON(HISTORY_PATH, existing);
    
    return record;
  }
  
  // Actual reclaim logic
  try {
    // Load operator keypair from base58 encoded string
    if (!config.kora.operatorKeypairBase58) {
      throw new Error('Operator keypair not configured. Set KORA_OPERATOR_KEYPAIR in .env');
    }
    
    // Convert base58 to actual Keypair
    const secretKey = bs58.decode(config.kora.operatorKeypairBase58);
    const operatorKeypair = Keypair.fromSecretKey(secretKey);
    
    // Attempt to close the token account
    const result = await closeTokenAccount(connection, pub, operatorKeypair);
    
    if (result.success) {
      logger.success(`Successfully reclaimed ${result.lamportsRecovered} lamports from ${address}`);
      
      const trackedAccounts = readJSON<Record<string, any>>(TRACKED_PATH);
      const accountData = trackedAccounts?.[address];
      
      const record: ReclaimRecord = {
        address,
        reclaimedAt: new Date().toISOString(),
        lamportsRecovered: result.lamportsRecovered,
        note: result.message,
        tokenMint: accountData?.metadata?.mint,
        accountOwner: accountData?.metadata?.owner,
        category: accountData?.category,
      }; 
      
      // Save to history
      const existing = (readJSON(HISTORY_PATH) as ReclaimRecord[]) || [];
      existing.push(record);
      writeJSON(HISTORY_PATH, existing);
      
      // Update tracked accounts status
      if (trackedAccounts && accountData) {
        accountData.metadata = {
          ...accountData.metadata,
          status: 'reclaimed',
          reclaimedAt: new Date().toISOString(),
          lamportsRecovered: result.lamportsRecovered,
        };
        writeJSON(TRACKED_PATH, trackedAccounts);
        logger.info(`Updated account status to 'reclaimed' in tracked accounts`);
      }
      
      // Send notification
      try {
        await sendReclaimNotification(address, result.lamportsRecovered || 0, result.signature);
      } catch (e) {
        logger.warn('telegram notify failed');
      }
      
      return record;
    } else {
      logger.error(`Failed to reclaim ${address}: ${result.message}`);
      throw new Error(result.message);
    }
    
  } catch (error: any) {
    logger.error(`Reclaim failed for ${address}: ${error.message}`);
    throw error;
  }
}

// Main function for standalone execution
async function main() {
  logger.section('KORA RENT RECLAIM BOT - RECLAIMER TEST');
  
  try {
    const dryRun = process.env.DRY_RUN !== 'false';
    logger.info(`Dry run mode: ${dryRun}`);
    
    // Load tracked accounts
    const trackedAccounts = readJSON<Record<string, any>>(TRACKED_PATH);
    
    if (!trackedAccounts || Object.keys(trackedAccounts).length === 0) {
      logger.warn('No tracked accounts found. Run scanner first.');
      return;
    }
    
    logger.info(`Found ${Object.keys(trackedAccounts).length} tracked accounts`);
    
    // Find accounts that are eligible for reclaim (token balance = 0)
    const addresses = Object.keys(trackedAccounts);
    const eligibleAccounts = addresses.filter((addr: string) => {
      const account = trackedAccounts[addr];
      const tokenBalance = account?.metadata?.tokenBalance || 0;
      const status = account?.metadata?.status;
      return tokenBalance === 0 && status !== 'reclaimed' && status !== 'closed';
    });
    
    if (eligibleAccounts.length === 0) {
      logger.info('No accounts with zero token balance available for reclaim test');
      logger.info('Try running the monitor first to find eligible accounts');
      return;
    }
    
    // For testing, reclaim the first eligible account
    const targetAddress = eligibleAccounts[0];
    logger.info(`Testing reclaim for eligible account: ${targetAddress}`);
    
    if (!dryRun) {
      const result = await reclaimAccount(targetAddress);
      logger.success(`Reclaim completed: ${JSON.stringify(result)}`);
    } else {
      logger.info(`DRY RUN: Would reclaim account ${targetAddress}`);
    }
    
    logger.section('RECLAIM TEST COMPLETE');
    logger.success('Reclaimer is working correctly!');
    
  } catch (err: any) {
    logger.error('Reclaimer test failed:', err);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}
