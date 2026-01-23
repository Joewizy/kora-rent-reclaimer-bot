import 'dotenv/config';
import path from 'path';

// Configuration for the rent reclaim bot
const config = {
  // Solana RPC Configuration
  rpc: {
    // Use devnet for testing, mainnet for production
    url: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    commitment: 'confirmed',
  },

  // Kora Operator Configuration
  kora: {
    // The Kora operator's public key (fee payer address)
    operatorAddress: process.env.KORA_OPERATOR_ADDRESS,
    // The operator's keypair for signing transactions (base58 encoded)
    operatorKeypairBase58: process.env.KORA_OPERATOR_KEYPAIR,
    // Treasury where reclaimed rent goes
    treasuryAddress: process.env.KORA_TREASURY_ADDRESS || process.env.KORA_OPERATOR_ADDRESS,
  },

  // Scanner Configuration
  scanner: {
    // How many transactions to fetch in each batch
    batchSize: 100,
    // How far back to scan (in transaction signatures)
    maxSignatures: 1000,
    // Only scan transactions after this signature (optional)
    untilSignature: process.env.SCAN_UNTIL_SIGNATURE || null,
  },

  // Monitor Configuration
  monitor: {
    // How often to check accounts (in milliseconds)
    checkInterval: 5 * 60 * 1000, // 5 minutes
    // Minimum lamports to consider for reclaim
    minLamportsForReclaim: 2000000, // ~0.002 SOL
  },

  // Reclaimer Configuration
  reclaimer: {
    // Enable dry run mode (don't actually close accounts)
    dryRun: process.env.DRY_RUN === 'true',
    // Batch size for closing accounts
    batchSize: 10,
    // Accounts to whitelist (never close these)
    whitelist: [],
  },

  // Database Configuration
  database: {
    trackedAccountsPath: path.join(process.cwd(), 'data', 'tracked-accounts.json'),
    reclaimHistoryPath: path.join(process.cwd(), 'data', 'reclaim-history.json'),
  },

  // Telegram Configuration (optional)
  telegram: {
    enabled: process.env.TELEGRAM_ENABLED === 'true',
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};

// Validation
function validateConfig() {
  if (!config.kora.operatorAddress) {
    throw new Error('KORA_OPERATOR_ADDRESS is required in .env file');
  }

  if (!config.kora.operatorKeypairBase58 && !config.reclaimer.dryRun) {
    console.warn('⚠️  KORA_OPERATOR_KEYPAIR not set - running in dry-run mode only');
    config.reclaimer.dryRun = true;
  }

  if (config.telegram.enabled && (!config.telegram.botToken || !config.telegram.chatId)) {
    throw new Error('Telegram is enabled but TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing');
  }
}

validateConfig();

export default config;