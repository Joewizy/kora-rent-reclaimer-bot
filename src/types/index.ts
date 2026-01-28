export type TrackedAccount = {
  address: string; // base58
  discoveredAt: string; // ISO
  category: 'operator-owned' | 'user-owned'; // Who owns the account
  reclaimable: boolean; // Can we reclaim rent from this account?
  metadata?: Record<string, any>;
};

export type ReclaimRecord = {
  address: string;
  reclaimedAt: string; // ISO
  lamportsRecovered?: number;
  note?: string;
  tokenMint?: string; // Token mint address
  accountOwner?: string; // Account owner address
  category?: 'operator-owned' | 'user-owned'; // Account category
};

export type Config = {
  RPC_URL: string;
  KEYPAIR_PATH: string;
};

export type RentAnalysis = {
  totalAccounts: number;
  totalLamports: number;
  operatorOwned: {
    total: number;
    totalLamports: number;
    active: number;
    activeLamports: number;
    eligible: number;
    eligibleLamports: number;
    reclaimed: number;
    reclaimedLamports: number;
  };
  userOwned: {
    total: number;
    totalLamports: number;
    active: number;
    activeLamports: number;
    empty: number;
    emptyLamports: number;
  };
}