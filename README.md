# 🏆 Kora Rent Reclaim Bot

**Automated rent recovery system for Kora operators on Solana - providing clarity and reclaiming lost SOL**

## 🎯 Bounty Solution Overview

This bot solves the critical problem identified in the Kora bounty: **rent SOL locked in sponsored accounts**. When Kora nodes sponsor account creation, SOL gets locked as rent deposits. Over time, many accounts become inactive or empty, but the rent remains locked.

Our solution provides both **automated rent reclamation** and **complete visibility** into where rent goes, why some can be recovered, and how to minimize future losses.

## ✨ Key Features

### 🔍 **Smart Discovery & Monitoring**
- **Intelligent Scanner**: Finds operator-owned token accounts from transaction history
- **Real-time Monitoring**: Tracks account balances and detects eligibility for cleanup
- **Ownership Filtering**: Only tracks accounts where Kora operator has reclaim authority

### 💰 **Automated Rent Reclamation**
- **Safe Recovery**: Closes empty accounts and returns SOL to treasury
- **Dry-run Mode**: Test before executing actual transactions
- **Batch Processing**: Efficiently handles multiple accounts

### 📊 **Enhanced Reporting & Analytics**
- **Rent Analysis Dashboard**: Complete visibility into rent allocation
- **Account Classification**: Clear distinction between reclaimable vs non-reclaimable accounts
- **Operational Insights**: Metrics for optimization and cost management

### 🛡️ **Production-Ready Safety**
- **Extensive Logging**: Full audit trail of all actions
- **Error Handling**: Graceful failure recovery
- **Configurable Thresholds**: Customizable minimum rent amounts

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Scanner       │───▶│   Database       │───▶│   Monitor       │
│ (Discovery)    │    │ (JSON Storage)  │    │ (Eligibility)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            ▼
│   Reporter      │◀───│   Reclaimer      │    ┌─────────────────┐
│ (Analytics)    │    │ (Recovery)       │    │   Treasury      │
└─────────────────┘    └──────────────────┘    │ (SOL Recovery)  │
                                                └─────────────────┘
```

## 📈 What Makes This Solution Special

### 🎯 **Technical Excellence**
- **Correct Ownership Logic**: Only tracks accounts where Kora operator has authority
- **Solana Best Practices**: Uses proper transaction handling and error management
- **TypeScript**: Full type safety and maintainability

### 💡 **Business Intelligence**
- **Clarity First**: Explains WHY some rent can't be recovered (user-owned ATAs)
- **Actionable Insights**: Shows operators exactly where their SOL goes
- **Educational Value**: Helps operators understand rent mechanics

### 🚀 **Production Ready**
- **Zero Downtime**: Continues monitoring even if individual operations fail
- **Scalable**: Handles thousands of accounts efficiently
- **Observable**: Comprehensive logging and metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Solana CLI (for local testing)
- Kora operator access

### Installation
```bash
git clone <repository>
cd rent-reclaim-bot
npm install
```

### Configuration
```bash
cp .env.example .env
# Edit .env with your Kora operator details
```

### Testing
```bash
# Test individual components
npm run test:scanner    # Test account discovery
npm run test:monitor    # Test balance monitoring
npm run test:reclaim    # Test rent recovery (dry-run)
npm run test:reporting  # Test enhanced analytics

# Full workflow test
npm run test:scanner    # Discover accounts
npm run test:monitor    # Check eligibility
npm run test:reporting  # View analytics
```

## 📊 Reporting Dashboard

The bot provides comprehensive analytics:

```
============================================================
  KORA RENT ANALYSIS REPORT
============================================================

TOTAL RENT TRACKING:
├── Operator-Owned Accounts: 1.52 SOL (tracking these ✅)
│   ├── Active: 1.02 SOL (50 accounts with tokens)
│   ├── Eligible: 0.30 SOL (15 accounts, 0 balance)
│   └── Reclaimed: 0.20 SOL (10 accounts closed)
│
└── Limitation: User-owned ATAs not trackable
    └── Reason: Created via transferTransaction, owned by users
    └── Impact: Cannot reclaim rent from user accounts
    └── Note: This is expected Solana behavior

RECLAIM POTENTIAL:
├── Ready Now: 0.30 SOL (15 empty accounts)
├── Monitoring: 1.02 SOL (50 active accounts)
└── Recovered: 0.20 SOL (10 accounts)

OPERATOR INSIGHTS:
├── Average rent per account: 0.002039 SOL
├── Accounts created per day: ~25
├── Potential monthly savings: ~1.53 SOL
└── ROI: Automated monitoring saves manual tracking time
```

## 🔧 Account Classification

### ✅ **Operator-Owned Accounts (Reclaimable)**
- **Owner**: Kora operator address
- **Authority**: Can close and reclaim rent
- **When**: Token balance = 0 AND lamports ≥ minimum threshold
- **Example**: `AhJ6y2fcGv6vMW8i34vq9ykaNiW26tfeH8dEaMGFXj4i`

### ❌ **User-Owned Accounts (Non-Reclaimable)**
- **Owner**: Individual user addresses
- **Authority**: Only users can close these accounts
- **Why**: Created via `transferTransaction`, Kora pays rent but user owns
- **Impact**: Rent permanently locked (Solana security model)

## 💡 Understanding the Rent Problem

### Why Rent Gets Locked
1. **Account Creation**: Every token account costs ~0.002 SOL in rent
2. **Kora Sponsorship**: Kora pays this rent for user convenience
3. **Ownership Model**: Account owner gets close authority, not fee payer
4. **Permanent Lock**: User-owned accounts can't be closed by Kora

### What We Can Recover
- **Operator Accounts**: Full rent recovery when empty
- **System Accounts**: Internal processing accounts
- **Fee Accounts**: Collection and distribution accounts

### What We Cannot Recover
- **User ATAs**: Created for users, owned by users
- **Expected Behavior**: This is Solana's security design

## 🛠️ Production Deployment

### Environment Configuration
```bash
# Required
SOLANA_RPC_URL=<rpc-url(local validator or rpc provider)>
KORA_OPERATOR_ADDRESS=<operator-public-key>
KORA_OPERATOR_KEYPAIR=<operator-keypair-base58>

# Optional
KORA_TREASURY_ADDRESS=<treasury-address>
DRY_RUN=true  # Set to false for live reclaiming
LOG_LEVEL=info
TELEGRAM_ENABLED=false
```

### Monitoring Setup
```bash
# Run continuous monitoring
npm start

# Or use cron for scheduled runs
0 */6 * * * cd /path/to/bot && npm run test:monitor
```