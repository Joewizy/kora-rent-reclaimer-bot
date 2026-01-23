import logger from '../utils/logger';
import { readJSON, writeJSON } from '../utils/database';
import { ReclaimRecord } from '../types';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { closeTokenAccount, getConnection } from '../utils/solana';
import { sendTelegramMessage } from './telegram';
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
      
      const record: ReclaimRecord = {
        address,
        reclaimedAt: new Date().toISOString(),
        lamportsRecovered: result.lamportsRecovered,
        note: result.message,
      };
      
      // Save to history
      const existing = (readJSON(HISTORY_PATH) as ReclaimRecord[]) || [];
      existing.push(record);
      writeJSON(HISTORY_PATH, existing);
      
      // Send notification
      try {
        await sendTelegramMessage(`✅ Reclaimed ${result.lamportsRecovered} lamports from ${address}`);
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
    
    // For testing, reclaim the first account
    const addresses = Object.keys(trackedAccounts);
    if (addresses.length > 0) {
      const targetAddress = addresses[0];
      logger.info(`Testing reclaim for account: ${targetAddress}`);
      
      if (!dryRun) {
        const result = await reclaimAccount(targetAddress);
        logger.success(`Reclaim completed: ${JSON.stringify(result)}`);
      } else {
        logger.info(`DRY RUN: Would reclaim account ${targetAddress}`);
      }
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
