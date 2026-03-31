# Bank Linking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Plaid bank account linking and CSV/OFX statement import to the finance tab, populating financeStore with real transaction data.

**Architecture:** Plaid native SDK handles bank auth; three existing Supabase Edge Functions handle token exchange and sync. CSV/OFX files are parsed on-device. A new Accounts tab surfaces connected banks and the import button.

**Tech Stack:** react-native-plaid-link-sdk, expo-document-picker, Supabase Edge Functions (Deno), Zustand, Expo SDK 55, expo-dev-client

---

## Pre-flight: What already exists

- `supabase/functions/plaid-link-token/index.ts` — creates link token ✓
- `supabase/functions/plaid-exchange-token/index.ts` — stores access_token in `plaid_tokens` table ✓
- `supabase/functions/plaid-sync-transactions/index.ts` — upserts to Supabase `transactions` table ✓
- `lib/plaid.ts` — `createLinkToken`, `exchangePublicToken`, `syncTransactions` ✓
- `components/finance/PlaidConnectButton.tsx` — exists but broken (WebBrowser can't capture public_token)
- `supabase/migrations/20260324000000_initial.sql` — `plaid_tokens` and `transactions` tables ✓

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

```bash
npm install react-native-plaid-link-sdk expo-document-picker
```

**Step 2: Rebuild dev client (required for native modules)**

```bash
npx expo run:ios
# or
npx expo run:android
```

Expected: app rebuilds with Plaid native module linked.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add react-native-plaid-link-sdk and expo-document-picker"
```

---

## Task 2: Fix plaid-exchange-token to return account info

The current function returns `{ success: true }` — we need institution name and account masks to display in the UI.

**Files:**
- Modify: `supabase/functions/plaid-exchange-token/index.ts`

**Step 1: After storing the access_token, call Plaid `/accounts/get` to fetch account info**

Replace the current return at the end of the function with:

```typescript
// After the upsert, fetch account details
const accountsRes = await fetch(`${PLAID_BASE}/accounts/get`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: Deno.env.get('PLAID_CLIENT_ID'),
    secret: Deno.env.get('PLAID_SECRET'),
    access_token,
  }),
})
const accountsData = await accountsRes.json()
const accounts = (accountsData.accounts ?? []).map((a: { account_id: string; mask: string; name: string }) => ({
  id: a.account_id,
  mask: a.mask ?? '????',
  name: a.name,
}))

// Also update plaid_tokens with item_id
await supabase
  .from('plaid_tokens')
  .update({ item_id })
  .eq('user_id', userId)

return new Response(JSON.stringify({ success: true, accounts }), {
  headers: { 'Content-Type': 'application/json' },
})
```

**Step 2: Deploy the edge function**

```bash
supabase functions deploy plaid-exchange-token
```

Expected: `Deployed plaid-exchange-token`

**Step 3: Commit**

```bash
git add supabase/functions/plaid-exchange-token/index.ts
git commit -m "feat: return account info from plaid-exchange-token"
```

---

## Task 3: Fix plaid-sync-transactions to return transactions to the app

Currently the function upserts to Supabase but returns only `{ synced: count }`. The app needs the actual transaction rows.

**Files:**
- Modify: `supabase/functions/plaid-sync-transactions/index.ts`

**Step 1: Return the mapped rows in the response**

Replace the final return line:

```typescript
// Was: return new Response(JSON.stringify({ synced: rows.length }), ...
return new Response(JSON.stringify({ synced: rows.length, transactions: rows }), {
  headers: { 'Content-Type': 'application/json' },
})
```

The `rows` array already has the shape `{ type, amount, category, merchant, date, source }`.

**Step 2: Deploy**

```bash
supabase functions deploy plaid-sync-transactions
```

**Step 3: Commit**

```bash
git add supabase/functions/plaid-sync-transactions/index.ts
git commit -m "feat: return transactions from plaid-sync-transactions"
```

---

## Task 4: Update financeStore with BankAccount support

**Files:**
- Modify: `stores/financeStore.ts`

**Step 1: Write the failing test**

Create `stores/__tests__/financeStore.bankAccounts.test.ts`:

```typescript
import { useFinanceStore } from '../financeStore'

beforeEach(() => {
  useFinanceStore.setState({ bankAccounts: [], transactions: [] })
})

test('addBankAccount stores account', () => {
  const account = { id: 'acc_1', institutionName: 'Chase', mask: '4242', lastSynced: 0 }
  useFinanceStore.getState().addBankAccount(account)
  expect(useFinanceStore.getState().bankAccounts).toHaveLength(1)
  expect(useFinanceStore.getState().bankAccounts[0].mask).toBe('4242')
})

test('removeBankAccount removes by id', () => {
  useFinanceStore.getState().addBankAccount({ id: 'acc_1', institutionName: 'Chase', mask: '4242', lastSynced: 0 })
  useFinanceStore.getState().removeBankAccount('acc_1')
  expect(useFinanceStore.getState().bankAccounts).toHaveLength(0)
})

test('setLastSynced updates timestamp', () => {
  useFinanceStore.getState().addBankAccount({ id: 'acc_1', institutionName: 'Chase', mask: '4242', lastSynced: 0 })
  useFinanceStore.getState().setLastSynced('acc_1', 1234567890)
  expect(useFinanceStore.getState().bankAccounts[0].lastSynced).toBe(1234567890)
})
```

**Step 2: Run to verify fail**

```bash
npx jest stores/__tests__/financeStore.bankAccounts.test.ts
```

Expected: FAIL — `bankAccounts` not defined

**Step 3: Add BankAccount type and store actions to `stores/financeStore.ts`**

```typescript
export interface BankAccount {
  id: string
  institutionName: string
  mask: string
  lastSynced: number
}

interface FinanceState {
  transactions: Transaction[]
  bankAccounts: BankAccount[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  removeTransaction: (id: string) => void
  addBankAccount: (account: BankAccount) => void
  removeBankAccount: (id: string) => void
  setLastSynced: (id: string, timestamp: number) => void
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  bankAccounts: [],
  addTransaction: (t) =>
    set((state) => ({ transactions: [...state.transactions, { ...t, id: uuidv4() }] })),
  removeTransaction: (id) =>
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
  addBankAccount: (account) =>
    set((state) => ({ bankAccounts: [...state.bankAccounts, account] })),
  removeBankAccount: (id) =>
    set((state) => ({ bankAccounts: state.bankAccounts.filter((a) => a.id !== id) })),
  setLastSynced: (id, timestamp) =>
    set((state) => ({
      bankAccounts: state.bankAccounts.map((a) => a.id === id ? { ...a, lastSynced: timestamp } : a),
    })),
}))
```

**Step 4: Run tests to verify pass**

```bash
npx jest stores/__tests__/financeStore.bankAccounts.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add stores/financeStore.ts stores/__tests__/financeStore.bankAccounts.test.ts
git commit -m "feat: add BankAccount to financeStore"
```

---

## Task 5: Update lib/plaid.ts to populate financeStore

**Files:**
- Modify: `lib/plaid.ts`

**Step 1: Update `exchangePublicToken` to return accounts and `syncTransactions` to populate the store**

```typescript
import { supabase } from '@/lib/supabase'
import { useFinanceStore } from '@/stores/financeStore'
import type { Transaction, BankAccount } from '@/stores/financeStore'

export async function createLinkToken(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('plaid-link-token', {
    body: { userId },
  })
  if (error) throw new Error(`Failed to create link token: ${error.message}`)
  return data.link_token
}

export async function exchangePublicToken(
  publicToken: string,
  userId: string
): Promise<{ accounts: Array<{ id: string; mask: string; name: string }> }> {
  const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
    body: { publicToken, userId },
  })
  if (error) throw new Error(`Failed to exchange token: ${error.message}`)
  return { accounts: data.accounts ?? [] }
}

export async function syncTransactions(userId: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('plaid-sync-transactions', {
    body: { userId },
  })
  if (error) throw new Error(`Failed to sync transactions: ${error.message}`)

  const incoming: Transaction[] = (data.transactions ?? []).map((t: {
    plaid_transaction_id: string
    type: string
    amount: number
    category: string
    merchant: string
    date: string
  }) => ({
    id: t.plaid_transaction_id,
    type: t.type as Transaction['type'],
    amount: t.amount,
    category: t.category,
    merchant: t.merchant,
    date: new Date(t.date).getTime(),
    source: 'plaid' as const,
  }))

  const { transactions: existing, addTransaction } = useFinanceStore.getState()
  const existingIds = new Set(existing.map((t) => t.id))
  const newOnes = incoming.filter((t) => !existingIds.has(t.id))
  newOnes.forEach((t) => addTransaction(t))

  return newOnes.length
}
```

**Step 2: Commit**

```bash
git add lib/plaid.ts
git commit -m "feat: wire plaid lib to financeStore"
```

---

## Task 6: Build CSV/OFX parser

**Files:**
- Create: `lib/bankImport.ts`
- Create: `lib/__tests__/bankImport.test.ts`

**Step 1: Write failing tests**

```typescript
// lib/__tests__/bankImport.test.ts
import { parseCSV, parseOFX } from '../bankImport'

test('parseCSV Chase format', () => {
  const csv = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2026,01/16/2026,STARBUCKS,Food & Drink,Sale,-5.75,`
  const results = parseCSV(csv)
  expect(results).toHaveLength(1)
  expect(results[0].amount).toBe(5.75)
  expect(results[0].type).toBe('expense')
  expect(results[0].merchant).toBe('STARBUCKS')
})

test('parseCSV income (positive amount)', () => {
  const csv = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2026,01/16/2026,DIRECT DEPOSIT,Income,Credit,2500.00,`
  const results = parseCSV(csv)
  expect(results[0].type).toBe('income')
  expect(results[0].amount).toBe(2500)
})

test('parseCSV generic format with Date/Amount/Description headers', () => {
  const csv = `Date,Description,Amount
2026-01-15,AMAZON,-49.99`
  const results = parseCSV(csv)
  expect(results[0].merchant).toBe('AMAZON')
  expect(results[0].amount).toBe(49.99)
})

test('parseOFX extracts transactions', () => {
  const ofx = `<OFX>
<STMTTRN>
<DTPOSTED>20260115</DTPOSTED>
<TRNAMT>-12.50</TRNAMT>
<NAME>NETFLIX</NAME>
<MEMO>Streaming</MEMO>
</STMTTRN>
</OFX>`
  const results = parseOFX(ofx)
  expect(results).toHaveLength(1)
  expect(results[0].amount).toBe(12.50)
  expect(results[0].merchant).toBe('NETFLIX')
})
```

**Step 2: Run to verify fail**

```bash
npx jest lib/__tests__/bankImport.test.ts
```

Expected: FAIL — `parseCSV` not found

**Step 3: Create `lib/bankImport.ts`**

```typescript
import type { Transaction } from '@/stores/financeStore'
import { v4 as uuidv4 } from 'uuid'

type RawTransaction = Omit<Transaction, 'id'>

function parseDate(dateStr: string): number {
  // Handle YYYYMMDD (OFX), YYYY-MM-DD, MM/DD/YYYY
  const cleaned = dateStr.trim()
  if (/^\d{8}$/.test(cleaned)) {
    return new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`).getTime()
  }
  return new Date(cleaned).getTime()
}

export function parseCSV(content: string): RawTransaction[] {
  const lines = content.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Detect column indices (support Chase, BofA, Wells Fargo, generic)
  const dateIdx = headers.findIndex((h) => h.includes('date') && !h.includes('post'))
  const amountIdx = headers.findIndex((h) => h === 'amount')
  const descIdx = headers.findIndex((h) => ['description', 'memo', 'name', 'payee'].some((k) => h.includes(k)))

  if (dateIdx === -1 || amountIdx === -1) return []

  const results: RawTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
    const amountRaw = parseFloat(cols[amountIdx] ?? '0')
    if (isNaN(amountRaw)) continue

    results.push({
      type: amountRaw < 0 ? 'expense' : 'income',
      amount: Math.abs(amountRaw),
      category: 'Other',
      merchant: descIdx !== -1 ? cols[descIdx] : 'Import',
      date: parseDate(cols[dateIdx] ?? ''),
      source: 'manual',
    })
  }
  return results
}

export function parseOFX(content: string): RawTransaction[] {
  const txnBlocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) ?? []
  const results: RawTransaction[] = []

  for (const block of txnBlocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\n]+)`))
      return m ? m[1].trim() : ''
    }
    const amountRaw = parseFloat(get('TRNAMT') || '0')
    if (isNaN(amountRaw)) continue

    results.push({
      type: amountRaw < 0 ? 'expense' : 'income',
      amount: Math.abs(amountRaw),
      category: 'Other',
      merchant: get('NAME') || get('MEMO') || 'Import',
      date: parseDate(get('DTPOSTED')),
      source: 'manual',
    })
  }
  return results
}

export function deduplicateImport(
  incoming: RawTransaction[],
  existing: Transaction[]
): { newTransactions: RawTransaction[]; duplicateCount: number } {
  // Deduplicate by matching amount + merchant + date (within same day)
  const existingKeys = new Set(
    existing.map((t) => `${t.amount}|${t.merchant}|${new Date(t.date).toISOString().split('T')[0]}`)
  )
  const newTransactions = incoming.filter((t) => {
    const key = `${t.amount}|${t.merchant}|${new Date(t.date).toISOString().split('T')[0]}`
    return !existingKeys.has(key)
  })
  return { newTransactions, duplicateCount: incoming.length - newTransactions.length }
}
```

**Step 4: Run tests to verify pass**

```bash
npx jest lib/__tests__/bankImport.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add lib/bankImport.ts lib/__tests__/bankImport.test.ts
git commit -m "feat: add CSV/OFX bank statement parser"
```

---

## Task 7: Rewrite PlaidConnectButton using native SDK

The existing WebBrowser approach can't capture `public_token` — Plaid doesn't pass it as a URL param. Replace with `react-native-plaid-link-sdk`.

**Files:**
- Modify: `components/finance/PlaidConnectButton.tsx`

**Step 1: Rewrite the component**

```typescript
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'
import { PlaidLink, LinkSuccess, LinkExit, LinkOpenProps } from 'react-native-plaid-link-sdk'
import { supabase } from '@/lib/supabase'
import { createLinkToken, exchangePublicToken, syncTransactions } from '@/lib/plaid'
import { useFinanceStore } from '@/stores/financeStore'

interface Props {
  onConnected?: () => void
}

export function PlaidConnectButton({ onConnected }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const addBankAccount = useFinanceStore((s) => s.addBankAccount)
  const setLastSynced = useFinanceStore((s) => s.setLastSynced)

  const handlePress = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const token = await createLinkToken(user.id)
      setLinkToken(token)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start bank connection')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = async (success: LinkSuccess) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { accounts } = await exchangePublicToken(success.publicToken, user.id)
      // Add each account to the store
      accounts.forEach((a) => {
        addBankAccount({ id: a.id, institutionName: success.metadata.institution?.name ?? 'Bank', mask: a.mask, lastSynced: 0 })
      })
      const synced = await syncTransactions(user.id)
      accounts.forEach((a) => setLastSynced(a.id, Date.now()))
      Alert.alert('Connected!', `${synced} transactions imported.`)
      setLinkToken(null)
      onConnected?.()
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleExit = (_exit: LinkExit) => {
    setLinkToken(null)
  }

  if (linkToken) {
    return (
      <PlaidLink
        tokenConfig={{ token: linkToken }}
        onSuccess={handleSuccess}
        onExit={handleExit}
      >
        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-3 px-6 items-center"
          onPress={() => {}}
        >
          <Text className="text-white font-semibold">Opening Bank Login...</Text>
        </TouchableOpacity>
      </PlaidLink>
    )
  }

  return (
    <TouchableOpacity
      className="bg-blue-600 rounded-xl py-3 px-6 items-center flex-row justify-center gap-2"
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading && <ActivityIndicator color="white" size="small" />}
      <Text className="text-white font-semibold">{isLoading ? 'Loading...' : '+ Connect Bank'}</Text>
    </TouchableOpacity>
  )
}
```

**Step 2: Commit**

```bash
git add components/finance/PlaidConnectButton.tsx
git commit -m "feat: rewrite PlaidConnectButton with native Plaid Link SDK"
```

---

## Task 8: Build FileImportButton component

**Files:**
- Create: `components/finance/FileImportButton.tsx`

**Step 1: Create the component**

```typescript
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { parseCSV, parseOFX, deduplicateImport } from '@/lib/bankImport'
import { useFinanceStore } from '@/stores/financeStore'

export function FileImportButton() {
  const [isLoading, setIsLoading] = useState(false)
  const transactions = useFinanceStore((s) => s.transactions)
  const addTransaction = useFinanceStore((s) => s.addTransaction)

  const handleImport = async () => {
    setIsLoading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.[0]) return

      const file = result.assets[0]
      const content = await FileSystem.readAsStringAsync(file.uri)
      const name = file.name.toLowerCase()

      const parsed = name.endsWith('.ofx') || name.endsWith('.qfx')
        ? parseOFX(content)
        : parseCSV(content)

      if (parsed.length === 0) {
        Alert.alert('No transactions found', 'The file could not be parsed. Make sure it is a CSV or OFX file exported from your bank.')
        return
      }

      const { newTransactions, duplicateCount } = deduplicateImport(parsed, transactions)
      newTransactions.forEach((t) => addTransaction(t))

      Alert.alert(
        'Import complete',
        `${newTransactions.length} transactions imported${duplicateCount > 0 ? `, ${duplicateCount} duplicates skipped` : ''}.`
      )
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TouchableOpacity
      className="bg-gray-100 border border-gray-300 rounded-xl py-3 px-6 items-center flex-row justify-center gap-2"
      onPress={handleImport}
      disabled={isLoading}
    >
      {isLoading && <ActivityIndicator color="#6b7280" size="small" />}
      <Text className="text-gray-700 font-semibold">{isLoading ? 'Importing...' : '↑ Import Statement (CSV/OFX)'}</Text>
    </TouchableOpacity>
  )
}
```

**Step 2: Commit**

```bash
git add components/finance/FileImportButton.tsx
git commit -m "feat: add CSV/OFX file import button"
```

---

## Task 9: Build AccountsTab component

**Files:**
- Create: `components/finance/AccountsTab.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useFinanceStore } from '@/stores/financeStore'
import { PlaidConnectButton } from './PlaidConnectButton'
import { FileImportButton } from './FileImportButton'
import { supabase } from '@/lib/supabase'
import { syncTransactions } from '@/lib/plaid'
import { useState } from 'react'

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'Never'
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function AccountsTab() {
  const bankAccounts = useFinanceStore((s) => s.bankAccounts)
  const setLastSynced = useFinanceStore((s) => s.setLastSynced)
  const removeBankAccount = useFinanceStore((s) => s.removeBankAccount)
  const [syncing, setSyncing] = useState<string | null>(null)

  const handleSync = async (accountId: string) => {
    setSyncing(accountId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const count = await syncTransactions(user.id)
      setLastSynced(accountId, Date.now())
      Alert.alert('Synced', `${count} new transactions.`)
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
      {bankAccounts.length === 0 ? (
        <View className="items-center py-12 px-8">
          <Text className="text-4xl mb-3">🏦</Text>
          <Text className="text-lg font-semibold text-gray-700 mb-1">No banks connected</Text>
          <Text className="text-sm text-gray-400 text-center mb-6">Connect your bank to auto-import transactions, or import a statement file.</Text>
        </View>
      ) : (
        bankAccounts.map((account) => (
          <View key={account.id} className="bg-white rounded-2xl p-4">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="font-semibold text-gray-800">{account.institutionName}</Text>
                <Text className="text-sm text-gray-400">••••{account.mask}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removeBankAccount(account.id)}
                className="p-1"
              >
                <Text className="text-gray-300 text-sm">✕</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-xs text-gray-400">Last synced: {timeAgo(account.lastSynced)}</Text>
              <TouchableOpacity
                className="bg-blue-50 rounded-lg px-3 py-1"
                onPress={() => handleSync(account.id)}
                disabled={syncing === account.id}
              >
                <Text className="text-blue-600 text-sm font-medium">
                  {syncing === account.id ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <PlaidConnectButton />
      <FileImportButton />
    </ScrollView>
  )
}
```

**Step 2: Commit**

```bash
git add components/finance/AccountsTab.tsx
git commit -m "feat: add AccountsTab with connected banks and import"
```

---

## Task 10: Add Accounts tab to finance.tsx

**Files:**
- Modify: `app/(tabs)/finance.tsx`

**Step 1: Add import and update tab state type**

At the top of the file, add:
```typescript
import { AccountsTab } from '@/components/finance/AccountsTab'
```

**Step 2: Update tab state**

```typescript
const [tab, setTab] = useState<'transactions' | 'accounts' | 'vault'>('transactions')
```

**Step 3: Update tab buttons**

Replace the existing tab buttons map:
```typescript
{(['transactions', 'accounts', 'vault'] as const).map((t) => (
  <TouchableOpacity
    key={t}
    className={`px-4 py-2 rounded-full ${tab === t ? 'bg-primary' : 'bg-white border border-gray-200'}`}
    onPress={() => setTab(t)}
  >
    <Text className={tab === t ? 'text-white font-medium text-sm' : 'text-gray-600 text-sm'}>
      {t === 'transactions' ? 'Transactions' : t === 'accounts' ? '🏦 Accounts' : '🛑 Impulse Vault'}
    </Text>
  </TouchableOpacity>
))}
```

**Step 4: Add accounts tab render in the conditional block**

Update the tab conditional from two branches to three:
```typescript
{tab === 'transactions' ? (
  <SectionList ... />
) : tab === 'accounts' ? (
  <AccountsTab />
) : (
  <ImpulseBuyVault />
)}
```

**Step 5: Run the app and verify**

```bash
npx expo start
```

- Navigate to Finance tab
- Confirm three tabs appear: Transactions, Accounts, Vault
- Tap Accounts — see empty state with Connect Bank and Import Statement buttons
- Tap Connect Bank — Plaid Link modal opens
- Tap Import Statement — file picker opens

**Step 6: Commit**

```bash
git add app/(tabs)/finance.tsx
git commit -m "feat: add Accounts tab to finance screen"
```

---

## Setup Checklist (one-time, outside the app)

Before testing with a real bank:

1. **Create free Plaid account** at dashboard.plaid.com
2. **Get credentials**: Client ID + Secret (Development environment)
3. **Set Supabase secrets**:
   ```bash
   supabase secrets set PLAID_CLIENT_ID=your_client_id
   supabase secrets set PLAID_SECRET=your_development_secret
   supabase secrets set PLAID_BASE_URL=https://development.plaid.com
   ```
4. **For sandbox testing** (fake banks, no real credentials needed):
   ```bash
   supabase secrets set PLAID_BASE_URL=https://sandbox.plaid.com
   supabase secrets set PLAID_SECRET=your_sandbox_secret
   ```
5. **Run migration** (already exists — just confirm `plaid_tokens` and `transactions` tables exist):
   ```bash
   supabase db push
   ```
