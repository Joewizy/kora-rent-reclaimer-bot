# 🤖 Kora Rent Reclaim Bot

**Automated rent recovery for Kora operators on Solana**

[![Built with TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Network-purple)](https://solana.com)

---

## What It Does

- **Finds** Kora-sponsored token accounts
- **Recovers** rent from empty operator-owned accounts  
- **Monitors** all accounts for cost analysis
- **Notifies** via Telegram when rent is reclaimed

---

## Quick Start

```bash
git clone <repo>
cd rent-reclaim-bot
npm install
cp .env.example .env
# Edit .env with your Kora operator details
```

### Basic Usage
```bash
npm run test:scanner    # Find accounts
npm run test:monitor    # Check eligibility
npm run test:reclaim    # Recover rent (dry-run by default)
npm run test:report     # Generate report
npm run test:kora-demo  # Run Kora full demo (requires Kora node)
```

## 📁 Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Scanner       │───▶│   Database   │───▶│   Monitor   │
│ Finds accounts  │    │ JSON storage │    │ Check status│
└─────────────────┘    └──────────────┘    └─────────────┘
                                                    │
┌─────────────────┐    ┌──────────────┐            ▼
│   Reporter      │◀───│  Reclaimer   │    ┌─────────────┐
│ Analytics       │    │ Close empty  │    │  Treasury   │
└─────────────────┘    └──────────────┘    │ SOL returns │
                                            └─────────────┘
                                                    │
                                            ┌─────────────┐
                                            │ Telegram    │
                                            │ Alerts      │
                                            └─────────────┘
```

### Core Components

- **Scanner** - Discovers accounts from Kora transaction history
- **Monitor** - Checks balances and eligibility status
- **Reclaimer** - Closes eligible accounts and recovers rent
- **Reporter** - Generates comprehensive analytics
- **Telegram** - Real-time notifications and commands

---

### Run the whole Workflow at once
```bash
# scans, monitors, reclaims (if dry=true), and reports
npm start
```

## 🧠 Understanding the Bot's Intelligence

### Account Classification Logic

```typescript
// Operator-Owned (Reclaimable)
if (account.owner === KORA_OPERATOR_ADDRESS) {
  category = 'operator-owned'
  reclaimable = true
  // Bot can close these when empty
}

// User-Owned (Non-Reclaimable)
else {
  category = 'user-owned'
  reclaimable = false
  // Only tracking for cost analysis
}
```

### Eligibility Criteria

An account is eligible for reclamation when:
1. ✅ Owned by Kora operator
2. ✅ Token balance = 0
3. ✅ Has rent deposit (lamports > 0)
4. ✅ Not already reclaimed

### Issues & Limitations

#### 🚫 Why User Accounts Cannot Be Reclaimed

```
┌─────────────────────────────────────────────┐
│  Solana's Account Ownership Rules:         │
│                                             │
│  • Only the OWNER can modify account data  │
│  • Only the OWNER can close the account    │
│  • When closed, rent goes to OWNER         │
│                                             │
│  This protects users from malicious actors│
└─────────────────────────────────────────────┘
```

#### 📊 Real Data Examples (Devent)
[Solscan Tx Link](https://solscan.io/tx/w1iEtsK2zSJ3reuHb8bhz3uLScLtrQ1H65rxodEup9sHpxbZQre94FJe1skbXb8LVUFNuaK2dQHngJddWZ8QUE5?cluster=devnet)

**Reclaim History (What we've successfully recovered):**
```json
{
  "EK7SJwv8tjniFdZ1oXEKbLWqHccDNbH6kKmWpDLX1ftz": {
    "address": "EK7SJwv8tjniFdZ1oXEKbLWqHccDNbH6kKmWpDLX1ftz",
    "reclaimedAt": "2026-01-28T09:50:13.000Z",
    "lamportsRecovered": 2039280,
    "note": "Successfully closed account",
    "tokenMint": "Fot5eZD5qnXZz7MDgfhZ1Y9iRTXJanJBfhbzYSpAtqVM",
    "accountOwner": "C5q1jVNrKA8QQTgrEmLRQNVkJC6MfQ3khhPChzvc4jS8",
    "category": "operator-owned",
    "signature": "4qdzxPU3hJen6XzoPJNAEqyXvttJTEGHtEtKjFXNHXZ1CgSmXAmiLbQ6AZ5HNsiULW2PBkGusWxRhMbquqFVZUMt"
  }
}
```

**Tracked Accounts (What we monitor):**
```json
{
  "2xevYbVBEK7QLRxZW4iDBKzR39mWenZwNaCgLzbqfKkn": {
    "address": "2xevYbVBEK7QLRxZW4iDBKzR39mWenZwNaCgLzbqfKkn",
    "discoveredAt": "2026-01-28T09:45:00.000Z",
    "category": "operator-owned",
    "reclaimable": true,
    "metadata": {
      "mint": "Fot5eZD5qnXZz7MDgfhZ1Y9iRTXJanJBfhbzYSpAtqVM",
      "owner": "C5q1jVNrKA8QQTgrEmLRQNVkJC6MfQ3khhPChzvc4jS8",
      "tokenBalance": 5231055000,
      "lamports": 2039280,
      "status": "active"
    }
  },
  "5kzAPTptD5DJRbt4mnMYouAdfSBwcFs4pmC9pK9QbfVJ": {
    "address": "5kzAPTptD5DJRbt4mnMYouAdfSBwcFs4pmC9pK9QbfVJ",
    "discoveredAt": "2026-01-28T09:45:00.000Z",
    "category": "user-owned",
    "reclaimable": false,
    "metadata": {
      "mint": "Fot5eZD5qnXZz7MDgfhZ1Y9iRTXJanJBfhbzYSpAtqVM",
      "owner": "7Ga1oAo68ArFhRsSBRoFc4j67M6riRnvZwXRFUmnATAD",
      "tokenBalance": 1000000,
      "lamports": 2039280,
      "status": "active"
    }
  }
}
```

#### 🔍 Key Insights

**Operator-Owned Accounts (Reclaimable ✅)**
- **Owner**: `C5q1jVNrKA8QQTgrEmLRQNVkJC6MfQ3khhPChzvc4jS8` (Kora operator)
- **Can Reclaim**: YES - Operator has full authority
- **Example**: `EK7SJw...LX1ftz` successfully reclaimed 0.002039280 SOL
- **Status**: ✅ **RECOVERED** - Rent returned to operator treasury

**User-Owned Accounts (Non-Reclaimable ❌)**
- **Owner**: `7Ga1oAo68ArFhRsSBRoFc4j67M6riRnvZwXRFUmnATAD` (User wallet)
- **Can Reclaim**: NO - Only user can close their own account
- **Status**: 📊 **MONITORED** - Tracked for cost analysis only

**This is the expected flow for Kora sponsorship:**
- Kora pays rent for user convenience 
- Users maintain control over their accounts
- Bot recovers what's possible (operator accounts)
- Bot tracks what's not recoverable (user accounts)

**This demonstrates the bot correctly handles both scenarios while respecting Solana's security model.**
---