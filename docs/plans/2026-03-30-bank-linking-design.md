# Bank Linking Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add bank account linking to the finance tab via two methods:
1. **Plaid** — automatic sync using Plaid's free development mode (up to 100 bank connections)
2. **CSV/OFX file import** — on-device parsing of downloaded bank statements

Target users: personal use + small circle of friends and family. Estimated total bank connections: <20, well within Plaid's free development tier.

## Cost

- Plaid development mode: free (100 Items limit)
- Supabase free tier: free (500MB DB, 500K Edge Function calls/month)
- CSV/OFX import: free (on-device)
- **Total: $0**

## Architecture

### Plaid Path

```
App → Supabase Edge Function (create-link-token)
    → Plaid Link SDK (native bank auth UI)
    → App sends public_token → Supabase Edge Function (exchange-token)
    → Supabase stores access_token in plaid_items table
    → App requests sync → Supabase Edge Function (sync-transactions)
    → Transactions returned to app → financeStore
```

Plaid access tokens are never stored in the app — only in Supabase.

### CSV/OFX Path

```
User taps "Import File"
→ expo-document-picker opens
→ File read on-device
→ Parsed (CSV columns / OFX structured text) → Transaction[]
→ Deduplicated against existing transactions
→ Saved to financeStore with source: 'manual'
```

### Supabase Schema

```sql
-- plaid_items: stores access tokens server-side
create table plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  access_token text not null,
  institution_name text,
  account_mask text,
  created_at timestamptz default now()
);
```

### Supabase Edge Functions (3 total, ~30 lines each)

| Function | Purpose |
|---|---|
| `plaid-create-link-token` | Calls Plaid API to generate a short-lived link token |
| `plaid-exchange-token` | Exchanges public_token for access_token, stores in DB |
| `plaid-sync-transactions` | Fetches transactions via access_token, returns to app |

## Data Model

### Existing (no changes needed)

```ts
interface Transaction {
  id: string
  type: 'income' | 'expense' | 'subscription' | 'repeat'
  amount: number
  category: string
  merchant?: string
  date: number
  source: 'plaid' | 'manual' | 'receipt'  // already exists
  notes?: string
}
```

### New addition to financeStore

```ts
interface BankAccount {
  id: string            // Plaid account_id
  institutionName: string
  mask: string          // last 4 digits e.g. "4242"
  lastSynced: number    // timestamp
}

// Added to FinanceState:
bankAccounts: BankAccount[]
addBankAccount: (account: BankAccount) => void
removeBankAccount: (id: string) => void
setLastSynced: (id: string, timestamp: number) => void
```

## UI

### Finance Screen — New "Accounts" Tab

Three tabs total: `Transactions` | `Accounts` | `Impulse Vault`

**Accounts tab contents:**
- Connected bank cards showing: institution name, `••••{mask}`, last synced time, "Sync Now" button
- "Connect Bank" button → opens Plaid Link native modal
- "Import File" button → opens expo-document-picker for CSV/OFX

**Transaction list — badge tweak:**
- Plaid-sourced transactions show a small bank icon instead of the manual EXP/INC badge

**Import feedback:**
- Toast after CSV/OFX import: "X transactions imported, Y duplicates skipped"

### Connect Flow
Tap "Connect Bank" → Plaid's native modal (handles bank search, login, MFA) → success/error → returns to app

### Import Flow
Tap "Import File" → file picker → parse on-device → dedup → toast result

## CSV Parsing Strategy

Support the most common US bank export formats:
- **Chase**: Date, Description, Amount (negative = expense)
- **Bank of America**: Date, Description, Amount, Running Bal.
- **Wells Fargo**: Date, Amount, *, *, Description
- **Generic fallback**: detect date/amount/description columns by header name

OFX/QFX: parse `<STMTTRN>` blocks for `<DTPOSTED>`, `<TRNAMT>`, `<NAME>`, `<MEMO>`.

## Dependencies to Add

- `react-native-plaid-link-sdk` — Plaid's official React Native SDK
- `expo-document-picker` — file selection (likely already compatible with Expo SDK 55)
