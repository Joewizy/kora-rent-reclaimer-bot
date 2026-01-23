import { Connection, PublicKey } from '@solana/web3.js';
import logger from '../utils/logger';
import { readJSON, writeJSON } from '../utils/database';
import { TrackedAccount } from '../types';
import config from '../config';
import path from 'path';

const TRACKED_PATH = path.join(process.cwd(), 'data', 'tracked-accounts.json');

export async function scanForAccounts() {
  logger.section('SCANNING KORA TRANSACTIONS');

  const connection = new Connection(config.rpc.url, config.rpc.commitment as any);
  const operatorAddress = new PublicKey(config.kora.operatorAddress!);

  let trackedAccounts: Record<string, TrackedAccount> = {};
  
  // Load existing tracked accounts
  const existing = readJSON<Record<string, TrackedAccount>>(TRACKED_PATH);
  if (existing) {
    trackedAccounts = existing;
    logger.info(`Loaded ${Object.keys(existing).length} existing tracked accounts`);
  }

  try {
    let beforeSignature: string | undefined = undefined;
    let totalScanned = 0;
    let newAccountsFound = 0;
    const maxSignatures = config.scanner.maxSignatures;
    const batchSize = config.scanner.batchSize;

    logger.info(`Scanning transactions for operator: ${operatorAddress.toBase58()}`);
    logger.info(`Max signatures to scan: ${maxSignatures}`);

    while (totalScanned < maxSignatures) {
      // Fetch batch of signatures
      logger.progress(`Fetching signatures batch (${totalScanned}/${maxSignatures})...`);

      const signatures = await connection.getSignaturesForAddress(
        operatorAddress,
        {
          limit: batchSize,
          before: beforeSignature,
        }
      );

      if (signatures.length === 0) {
        logger.info('No more signatures to fetch');
        break;
      }
      console.log("Signatures",signatures)
      logger.info(`Found ${signatures.length} signatures in batch`);

      // Process each transaction
      for (const sigInfo of signatures) {
        if (sigInfo.err) {
          // Skip failed transactions
          continue;
        }

        try {
          const accounts = await parseTransaction(connection, sigInfo.signature, operatorAddress);
          
          if (accounts.length > 0) {
            const operatorAccounts = accounts.filter(a => a.category === 'operator-owned').length;
            const userAccounts = accounts.filter(a => a.category === 'user-owned').length;
            logger.info(`Found ${accounts.length} accounts: ${operatorAccounts} operator-owned, ${userAccounts} user-owned`);
          }
          
          for (const account of accounts) {
            if (!trackedAccounts[account.address]) {
              trackedAccounts[account.address] = account;
              newAccountsFound++;
              const icon = account.category === 'operator-owned' ? '✅' : 'ℹ️';
              logger.success(`${icon} New ${account.category} account tracked: ${account.address}`);
            }
          }
        } catch (err: any) {
          logger.error(`Error parsing transaction ${sigInfo.signature}: ${err.message}`);
        }
      }

      totalScanned += signatures.length;
      beforeSignature = signatures[signatures.length - 1].signature;

      // Save progress after each batch
      writeJSON(TRACKED_PATH, trackedAccounts);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.section('SCAN COMPLETE');
    logger.success(`Total transactions scanned: ${totalScanned}`);
    logger.success(`New accounts found: ${newAccountsFound}`);
    logger.success(`Total accounts tracked: ${Object.keys(trackedAccounts).length}`);

    // Final save to ensure all data is persisted
    writeJSON(TRACKED_PATH, trackedAccounts);

    return {
      totalScanned,
      newAccountsFound,
      totalTracked: Object.keys(trackedAccounts).length,
    };
  } catch (err: any) {
    logger.error(`Error scanning transactions: ${err.message}`);
    throw err;
  }
}

async function parseTransaction(
  connection: Connection,
  signature: string,
  operatorAddress: PublicKey
): Promise<TrackedAccount[]> {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      logger.warn(`No transaction data found for ${signature}`);
      return [];
    }

    const accounts: TrackedAccount[] = [];

    // Look for token accounts in preTokenBalances and postTokenBalances
    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    logger.info(`Transaction ${signature}: preBalances=${preBalances.length}, postBalances=${postBalances.length}`);

    const preBalanceIndexes = new Set(preBalances.map((b) => b.accountIndex));

    for (const postBalance of postBalances) {
      const accountKeys = tx.transaction.message.getAccountKeys();
      const accountPubkey = accountKeys.get(postBalance.accountIndex);

      // Track ALL token accounts, categorize by ownership
      if (accountPubkey && postBalance.mint && postBalance.owner) {
        const isOperatorOwned = postBalance.owner === operatorAddress.toBase58();
        
        const account: TrackedAccount = {
          address: accountPubkey.toBase58(),
          discoveredAt: new Date().toISOString(),
          category: isOperatorOwned ? 'operator-owned' : 'user-owned',
          reclaimable: isOperatorOwned, // Only operator-owned accounts can be reclaimed
          metadata: {
            mint: postBalance.mint,
            owner: postBalance.owner,
            createdInTx: signature,
            createdAt: tx.blockTime || Date.now() / 1000,
            isNew: !preBalanceIndexes.has(postBalance.accountIndex),
          },
        };

        accounts.push(account);
        
        // Log what we found
        if (isOperatorOwned) {
          logger.info(`✅ Operator-owned account: ${accountPubkey.toBase58()} (reclaimable)`);
        } else {
          logger.info(`ℹ️  User-owned account: ${accountPubkey.toBase58()} (non-reclaimable, tracked for reporting)`);
        }
      } else {
        logger.warn(`Skipping account ${postBalance.accountIndex} - missing required data: pubkey=${!!accountPubkey}, mint=${!!postBalance.mint}, owner=${!!postBalance.owner}`);
      }
    }

    return accounts;
  } catch (err: any) {
    logger.error(`Error parsing transaction ${signature}: ${err.message}`);
    return [];
  }
}