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
};

export type Config = {
  RPC_URL: string;
  KEYPAIR_PATH: string;
};
