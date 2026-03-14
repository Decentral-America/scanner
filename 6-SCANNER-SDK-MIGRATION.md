# 6 — Scanner SDK Migration Plan

> **Status**: Planning  
> **Target**: dccscan (scanner) → `@decentralchain/*` SDK integration  
> **Prerequisite**: `5-MONOREPO.md` (monorepo consolidation strategy)  
> **Outcome**: Scanner replaces its hand-rolled 312-line API client with SDK packages, enabling monorepo ingestion under the inclusion rule.

---

## Table of Contents

1. [Executive Summary](#1--executive-summary)
2. [Current Scanner Architecture](#2--current-scanner-architecture)
3. [Endpoint-by-Endpoint SDK Mapping](#3--endpoint-by-endpoint-sdk-mapping)
4. [Type Mapping](#4--type-mapping)
5. [SDK Gaps to Fill Before Migration](#5--sdk-gaps-to-fill-before-migration)
6. [Migration Phases](#6--migration-phases)
7. [What Scanner Gets From the SDK](#7--what-scanner-gets-from-the-sdk)
8. [Risk Assessment](#8--risk-assessment)
9. [Summary](#9--summary)

---

## 1 — Executive Summary

Scanner (dccscan) is a React 19 + Vite blockchain explorer with 17 pages, 90 source files, and a 312-line hand-rolled `BlockchainAPI` class that makes raw `fetch()` calls to the same node REST API that `@decentralchain/node-api-js` already wraps with 86 typed endpoints.

**The problem:** Scanner has **zero `@decentralchain/*` dependencies**. It duplicates ~400 lines of blockchain types and ~300 lines of API client logic that the SDK already provides — tested, versioned, and maintained. Scanner doesn't benefit from SDK improvements (SSRF protection, BigNumber-safe JSON parsing, discriminated union types) and doesn't satisfy the monorepo inclusion rule.

**The fix:** Replace the hand-rolled `BlockchainAPI` with SDK packages. 24 of 27 scanner endpoints map exactly to `node-api-js`. After migration, scanner imports `@decentralchain/*`, triggering the monorepo inclusion rule, and moves into `apps/scanner`.

| Metric | Value |
|---|---|
| Scanner endpoints mapped to SDK | 24/27 exact, 1 partial, 1 gap, 1 dead code |
| Lines of code eliminated | ~355 net |
| SDK packages scanner will import | 3 (`node-api-js`, `ts-types`, `data-service-client-js`) |
| SDK gaps to close first | 1 mandatory (distribution pagination cursor) |
| Monorepo inclusion rule satisfied | Yes — after migration |

---

## 2 — Current Scanner Architecture

### 2.1 — Tech Stack

| Component | Version |
|---|---|
| React | 19 |
| Vite | Latest |
| React Router | v7 |
| TanStack React Query | v5 |
| Radix UI | Primitives |
| Tailwind CSS | v4 |
| TypeScript | 5.x strict |

### 2.2 — Source Layout

```
scanner/src/
├── components/utils/blockchain.tsx   ← 312-line hand-rolled API client (27 endpoints)
├── types/index.ts                    ← ~400 lines of hand-rolled interfaces
├── api/
│   ├── auth.ts                       ← localStorage-based auth (scanner-specific, keep as-is)
│   ├── entities.ts                   ← localStorage CRUD engine (scanner-specific, keep as-is)
│   └── integrations.ts              ← Placeholder stubs (scanner-specific, keep as-is)
├── hooks/
│   └── useBlockPolling.ts            ← React Query hooks wrapping BlockchainAPI
├── pages/                            ← 17 pages, all importing blockchainAPI singleton
└── components/                       ← Dashboard widgets importing blockchainAPI
```

### 2.3 — External APIs Called

| Service | Base URL | Used By |
|---|---|---|
| Node REST API | `https://mainnet-node.decentralchain.io` | `BlockchainAPI` (27 methods) |
| DEX Matcher | `https://mainnet-matcher.decentralchain.io` | `getMatcherOrderbook()` |
| Data Service | `https://data-service.decentralchain.io` | `getPairInfo()` |
| IP Geolocation | `https://ipapi.co` | Peers, Sustainability, NetworkMap pages |
| Green Web Check | `https://api.thegreenwebfoundation.org` | Sustainability, Peers pages |

### 2.4 — The BlockchainAPI Class

The `BlockchainAPI` class in `components/utils/blockchain.tsx`:

- **312 lines**, exported as a singleton `blockchainAPI` and a factory `createCustomBlockchainAPI()`
- Constructor takes optional `customBaseUrl` (default: `https://mainnet-node.decentralchain.io`)
- Private `request<T>()` method: raw `fetch()` with 20s `AbortController` timeout, exponential backoff (3 retries, 1s→2s→4s)
- 27 public typed methods, each calling `this.request<T>(path)`
- Talks to 3 separate services (node, matcher, data-service) — the base URL only applies to the node

### 2.5 — Dead Code

These methods are defined in `BlockchainAPI` but never called from any page or hook:

| Method | Endpoint | Action |
|---|---|---|
| `getNodeState()` | `GET /node/state` | **Delete** — dead code |
| `getRewards()` | `GET /blockchain/rewards` | **Delete** — never called from any page |
| `getBlocksForgedByAddress()` | `GET /blocks/address/{a}/{f}/{t}` | **Delete** — never called from any page |

---

## 3 — Endpoint-by-Endpoint SDK Mapping

Every scanner `BlockchainAPI` method mapped to its SDK replacement.

### 3.1 — Node REST API → `@decentralchain/node-api-js`

| Scanner Method | Endpoint | SDK Replacement | Match |
|---|---|---|---|
| `getHeight()` | `GET /blocks/height` | `api.blocks.fetchHeight()` | **Exact** |
| `getLastBlock()` | `GET /blocks/last` | `api.blocks.fetchLast()` | **Exact** |
| `getBlockByHeight(h)` | `GET /blocks/at/{h}` | `api.blocks.fetchBlockAt(h)` | **Exact** |
| `getBlockById(id)` | `GET /blocks/{id}` | `api.blocks.fetchBlockById(id)` | **Exact** |
| `getBlockHeaders(from, to)` | `GET /blocks/headers/seq/{from}/{to}` | `api.blocks.fetchHeadersSeq(from, to)` | **Exact** |
| `getBlockHeadersAtHeight(h)` | `GET /blocks/headers/at/{h}` | `api.blocks.fetchHeadersAt(h)` | **Exact** |
| `getBlocksForgedByAddress(a,f,t)` | `GET /blocks/address/{a}/{f}/{t}` | `api.blocks.fetchBlocksByAddress(a,f,t)` | **Exact** (dead code) |
| `getTransaction(id)` | `GET /transactions/info/{id}` | `api.transactions.fetchInfo(id)` | **Exact** |
| `getUnconfirmedTransaction(id)` | `GET /transactions/unconfirmed/info/{id}` | `api.transactions.fetchUnconfirmedInfo(id)` | **Exact** |
| `getAddressTransactions(a, limit)` | `GET /transactions/address/{a}/limit/{n}` | `api.transactions.fetchTransactions(a, limit)` | **Exact** |
| `getUnconfirmedTransactions()` | `GET /transactions/unconfirmed` | `api.transactions.fetchUnconfirmed()` | **Exact** |
| `getAddressBalances(a)` | `GET /assets/balance/{a}` | `api.assets.fetchAssetsBalance(a)` | **Exact** |
| `getAddressAssetBalance(a, id)` | `GET /assets/balance/{a}/{id}` | `api.assets.fetchBalanceAddressAssetId(a, id)` | **Exact** |
| `getAddressNFTs(a, limit)` | `GET /assets/nft/{a}/limit/{n}` | `api.assets.fetchAssetsAddressLimit(a, limit)` | **Exact** |
| `getAssetDetails(id)` | `GET /assets/details/{id}` | `api.assets.fetchDetails(id)` | **Exact** |
| `getAssetDistribution(id,h,l,after)` | `GET /assets/{id}/distribution/{h}/limit/{l}` | `api.assets.fetchAssetDistribution(id, h, l)` | **Partial** — SDK lacks `?after=` cursor |
| `getFullAssetDistribution(id,h,cb)` | Paginated wrapper over above | No SDK equivalent | **Gap** — no pagination helper |
| `getActiveLeases(a)` | `GET /leasing/active/{a}` | `api.leasing.fetchActive(a)` | **Exact** |
| `getConnectedPeers()` | `GET /peers/connected` | `api.peers.fetchConnected()` | **Exact** |
| `getAllPeers()` | `GET /peers/all` | `api.peers.fetchAll()` | **Exact** |
| `getBlacklistedPeers()` | `GET /peers/blacklisted` | `api.peers.fetchBlackListed()` | **Exact** |
| `getSuspendedPeers()` | `GET /peers/suspended` | `api.peers.fetchSuspended()` | **Exact** |
| `getNodeStatus()` | `GET /node/status` | `api.node.fetchNodeStatus()` | **Exact** |
| `getNodeVersion()` | `GET /node/version` | `api.node.fetchNodeVersion()` | **Exact** |
| `getNodeState()` | `GET /node/state` | No SDK equivalent | **Dead code** — delete |
| `getRewards()` | `GET /blockchain/rewards` | `api.rewards.fetchRewards()` | **Exact** (dead code) |
| `getRewardsAtHeight(h)` | `GET /blockchain/rewards/{h}` | `api.rewards.fetchRewards(h)` | **Exact** |

**Score: 24/27 exact, 1 partial, 1 gap, 1 dead code.**

### 3.2 — DEX/Matcher → `@decentralchain/data-service-client-js`

| Scanner Method | Endpoint | SDK Replacement | Match |
|---|---|---|---|
| `getMatcherOrderbook()` | `GET /matcher/orderbook` (matcher service) | No SDK equivalent | **Gap** |
| `getPairInfo(a, p)` | `GET /v0/pairs/{a}/{p}` (data service) | `dataClient.getPairs(...)` | **Partial** — different response shape |

### 3.3 — External APIs (Non-Blockchain)

| Endpoint | SDK Equivalent | Action |
|---|---|---|
| `ipapi.co/{ip}/json/` | None — IP geolocation is scanner-specific | **Keep as-is** |
| `thegreenwebfoundation.org` | None — green web check is scanner-specific | **Keep as-is** |

---

## 4 — Type Mapping

Scanner defines ~30 blockchain-related interfaces in `types/index.ts` that overlap with SDK types.

### 4.1 — Types to Replace With SDK Equivalents

| Scanner Type | SDK Type | Package | Notes |
|---|---|---|---|
| `Block` | `IBlock` | `node-api-js` | SDK type is stricter (no `[key: string]: unknown`) |
| `BlockHeader` | `IBlockHeader` | `node-api-js` | SDK type is stricter |
| `Transaction` | `Transaction` (union of 17 types) | `ts-types` | SDK has per-type discrimination; scanner uses single loose interface |
| `MassTransferItem` | `MassTransferItem` | `ts-types` | **Exact** |
| `AssetDetails` | `TAssetDetails` | `node-api-js` | SDK type is stricter |
| `AssetBalance` | `TAssetBalance` | `node-api-js` | **Exact** |
| `AddressBalances` | `TAssetsBalance` | `node-api-js` | **Exact** |
| `NFT` | `TAssetDetails` | `node-api-js` | NFTs are assets with `quantity: 1` |
| `Lease` | `ILeaseInfo` | `node-api-js` | SDK has more fields (`originTransactionId`, `status` enum) |
| `Peer` | `IPeerAllResponse` / `IPeerConnectedResponse` | `node-api-js` | Different shapes — SDK wraps in `{peers: [...]}` |
| `PeersResponse` | `IAllResponse` / `IAllConnectedResponse` | `node-api-js` | **Exact** |
| `HeightResponse` | `{ height: number }` | `node-api-js` | **Exact** |
| `NodeVersionResponse` | `INodeVersion` | `node-api-js` | **Exact** |
| `NodeStatusResponse` | `INodeStatus` | `node-api-js` | **Exact** |
| `RewardsResponse` | `TRewards` | `node-api-js` | **Exact** |
| `DistributionPage` | `IAssetDistribution` | `node-api-js` | Different field names — needs adapter |

### 4.2 — Types to Keep (Scanner-Specific)

These types have no SDK equivalent — they're application logic, not blockchain primitives:

**View models (DEX/Distribution UI):**
`OrderbookMarket`, `OrderbookResponse`, `PairInfoResponse`, `DexPairData`, `ProcessedHolder`, `DistributionStats`, `FetchProgress`, `FullDistribution`

**Application types:**
`User`, `UserWithPassword`, `LoginParams`, `RegisterParams`, `EntityRecord`, `EntityAccessor`, `PageViewRecord`, `AssetLogoRequestRecord`, `WithdrawalRequestRecord`, `BlockchainConfigRecord`, `BlockchainSnapshotRecord`, `NodeRegistrationRecord`

**UI/Context types:**
`GeolocatedPeer`, `ToastData`, `ToastState`, `ToastAction`, `Language`, `LanguageContextValue`, `AuthContextValue`

### 4.3 — Type Compatibility Notes

**Transaction union vs. flat interface:**
SDK's `Transaction` is a **discriminated union** of 17+ types (by `type` field). Scanner's `Transaction` is a single loose interface with optional fields and `[key: string]: unknown`. Page code that accesses `tx.recipient` or `tx.dApp` will need proper type narrowing:

```typescript
// Before (scanner — compiles but unsafe)
const recipient = tx.recipient;

// After (SDK — type-safe)
if (tx.type === 4) {
  const recipient = tx.recipient; // TransferTransaction, `recipient` is guaranteed
}
```

**BigNumber amounts:**
SDK uses `TLong = string | number` for amounts. Scanner uses `number`. No runtime issue (JSON returns numbers), but some type assertions may be needed at call boundaries.

**Index signatures eliminated:**
SDK types don't have `[key: string]: unknown` escape hatches. Pages accessing non-standard fields off a `Block` or `Transaction` will surface as compile errors — which is the point. These are bugs waiting to happen in the current code.

---

## 5 — SDK Gaps to Fill Before Migration

Two gaps must be addressed. One is mandatory, one has a zero-effort workaround.

### Gap 1: Asset Distribution Pagination Cursor (Mandatory)

**Problem:** Scanner's `getAssetDistribution()` passes `?after={lastAddress}` for cursor-based pagination. The SDK's `api.assets.fetchAssetDistribution(assetId, height, limit)` has no `after` parameter.

Scanner also has `getFullAssetDistribution()` — a 50-line pagination-walking wrapper that fetches all pages and calls a progress callback. The SDK has no equivalent.

**Fix in `@decentralchain/node-api-js`:**

```typescript
// In src/api-node/assets.ts — add `after` parameter
fetchAssetDistribution: (
  assetId: string,
  height: number,
  limit: number,
  after?: string,    // ← ADD THIS
  options?: RequestInit
) => Promise<IAssetDistribution>
```

**Effort:** ~5 lines in `node-api-js/src/api-node/assets.ts`. The node endpoint already supports it — the SDK just doesn't expose the parameter.

**Bonus:** Add a `fetchFullAssetDistribution()` helper in the SDK `tools/` namespace that walks all pages automatically with progress callbacks. Scanner's 50-line implementation becomes a one-liner.

### Gap 2: Matcher Orderbook API (Non-Blocking)

**Problem:** Scanner calls `GET https://mainnet-matcher.decentralchain.io/matcher/orderbook` directly. No SDK package wraps the matcher API.

**Options:**

| Option | Description | Effort |
|---|---|---|
| **A. Keep in scanner** | Leave the matcher `fetch()` call in scanner's `lib/api.ts`. Scanner still imports `node-api-js` for everything else, satisfying the inclusion rule. | Zero SDK work |
| **B. Add to node-api-js** | Add a `matcher` namespace to `node-api-js` with `fetchOrderbook()`. | ~30 lines |
| **C. Use data-service-client-js** | Wire up `DataServiceClient.getPairs()` for pair info. Matcher orderbook stays as raw `fetch()`. | ~10 lines |

**Recommendation:** Option A for initial migration (zero SDK changes for matcher). Option B as follow-up. The inclusion rule only cares that scanner imports *any* `@decentralchain/*` package — even one import of `node-api-js` qualifies.

---

## 6 — Migration Phases

### Phase 1: SDK Preparation

Fix the mandatory gap in `@decentralchain/node-api-js`:

| Task | Files | Effort |
|---|---|---|
| Add `after` param to `fetchAssetDistribution()` | `src/api-node/assets.ts` | ~5 lines |
| Add `fetchFullAssetDistribution()` helper in tools | `src/tools/assets.ts` (new) | ~50 lines |
| Export new types: `IAssetDistributionPage`, `IFullDistribution` | `src/api-node/assets.ts` | ~10 lines |
| Add tests for pagination | `test/api-node/assets.test.ts` | ~30 lines |
| Bump version, publish | `package.json` | Changeset |

### Phase 2: Add SDK Dependencies to Scanner

```json
// scanner/package.json — add to dependencies
{
  "@decentralchain/node-api-js": "workspace:*",
  "@decentralchain/ts-types": "workspace:*",
  "@decentralchain/data-service-client-js": "workspace:*"
}
```

This step alone triggers the monorepo inclusion rule.

### Phase 3: Create SDK-Backed API Layer

Replace `components/utils/blockchain.tsx` (312 lines) with a thin wrapper:

```typescript
// src/lib/api.ts (~40 lines)
import { create } from '@decentralchain/node-api-js';
import { DataServiceClient } from '@decentralchain/data-service-client-js';

const DEFAULT_NODE_URL = 'https://mainnet-node.decentralchain.io';
const DEFAULT_DATA_SERVICE_URL = 'https://data-service.decentralchain.io/v0';

let nodeApi = create(DEFAULT_NODE_URL);
let dataService = new DataServiceClient({ rootUrl: DEFAULT_DATA_SERVICE_URL });

export function setNodeUrl(url: string): void {
  nodeApi = create(url || DEFAULT_NODE_URL);
}

export function getNodeApi() { return nodeApi; }
export function getDataService() { return dataService; }

// Matcher stays as raw fetch until SDK wraps it (Gap 2, Option A)
const MATCHER_URL = 'https://mainnet-matcher.decentralchain.io';

export async function fetchMatcherOrderbook(): Promise<OrderbookResponse> {
  const res = await fetch(`${MATCHER_URL}/matcher/orderbook`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<OrderbookResponse>;
}
```

**312 lines → ~40 lines.** The SDK handles timeout, SSRF protection, and BigNumber-safe parsing.

### Phase 4: Page-by-Page API Migration

Replace `blockchainAPI.*` calls in all 17 pages:

| Page | Current Call | Replacement |
|---|---|---|
| **Dashboard** | `blockchainAPI.getNodeVersion()` | `getNodeApi().node.fetchNodeVersion()` |
| | `blockchainAPI.getBlockHeaders(from, to)` | `getNodeApi().blocks.fetchHeadersSeq(from, to)` |
| **Blocks** | `blockchainAPI.getHeight()` | `getNodeApi().blocks.fetchHeight()` |
| | `blockchainAPI.getBlockHeaders(from, to)` | `getNodeApi().blocks.fetchHeadersSeq(from, to)` |
| **BlockDetail** | `blockchainAPI.getBlockByHeight(h)` | `getNodeApi().blocks.fetchBlockAt(h)` |
| | `blockchainAPI.getBlockById(id)` | `getNodeApi().blocks.fetchBlockById(id)` |
| **BlockFeed** | Uses `useLatestBlock()` hook | Update hook to use SDK |
| **Transaction** | `blockchainAPI.getTransaction(id)` | `getNodeApi().transactions.fetchInfo(id)` |
| | `blockchainAPI.getUnconfirmedTransaction(id)` | `getNodeApi().transactions.fetchUnconfirmedInfo(id)` |
| **UnconfirmedTxs** | `blockchainAPI.getUnconfirmedTransactions()` | `getNodeApi().transactions.fetchUnconfirmed()` |
| **Address** | `blockchainAPI.getAddressBalances(a)` | `getNodeApi().assets.fetchAssetsBalance(a)` |
| | `blockchainAPI.getAddressTransactions(a, 50)` | `getNodeApi().transactions.fetchTransactions(a, 50)` |
| | `blockchainAPI.getAddressNFTs(a, 100)` | `getNodeApi().assets.fetchAssetsAddressLimit(a, 100)` |
| | `blockchainAPI.getActiveLeases(a)` | `getNodeApi().leasing.fetchActive(a)` |
| **Asset** | `blockchainAPI.getAssetDetails(id)` | `getNodeApi().assets.fetchDetails(id)` |
| | `blockchainAPI.getHeight()` | `getNodeApi().blocks.fetchHeight()` |
| | `blockchainAPI.getBlockHeaders(from, to)` | `getNodeApi().blocks.fetchHeadersSeq(from, to)` |
| | `blockchainAPI.getBlockByHeight(h)` | `getNodeApi().blocks.fetchBlockAt(h)` |
| **DistributionTool** | `blockchainAPI.getHeight()` | `getNodeApi().blocks.fetchHeight()` |
| | `blockchainAPI.getAssetDetails(id)` | `getNodeApi().assets.fetchDetails(id)` |
| | `blockchainAPI.getFullAssetDistribution(...)` | `getNodeApi().tools.assets.fetchFullDistribution(...)` (new) |
| **DexPairs** | `blockchainAPI.getMatcherOrderbook()` | `fetchMatcherOrderbook()` (raw fetch, kept) |
| | `blockchainAPI.getPairInfo(a, p)` | `getDataService().getPairs(...)` |
| | `blockchainAPI.getAssetDetails(id)` | `getNodeApi().assets.fetchDetails(id)` |
| **Peers** | `blockchainAPI.getConnectedPeers()` | `getNodeApi().peers.fetchConnected()` |
| | `blockchainAPI.getAllPeers()` | `getNodeApi().peers.fetchAll()` |
| | `blockchainAPI.getSuspendedPeers()` | `getNodeApi().peers.fetchSuspended()` |
| | `blockchainAPI.getBlacklistedPeers()` | `getNodeApi().peers.fetchBlackListed()` |
| **NetworkStatistics** | `blockchainAPI.getHeight()` | `getNodeApi().blocks.fetchHeight()` |
| | `blockchainAPI.getNodeStatus()` | `getNodeApi().node.fetchNodeStatus()` |
| | `blockchainAPI.getNodeVersion()` | `getNodeApi().node.fetchNodeVersion()` |
| | `blockchainAPI.getConnectedPeers()` | `getNodeApi().peers.fetchConnected()` |
| | `blockchainAPI.getBlockHeaders(from, to)` | `getNodeApi().blocks.fetchHeadersSeq(from, to)` |
| **NetworkMap** | `blockchainAPI.getConnectedPeers()` | `getNodeApi().peers.fetchConnected()` |
| | `blockchainAPI.getAllPeers()` | `getNodeApi().peers.fetchAll()` |
| **Node** | `blockchainAPI.getNodeStatus()` | `getNodeApi().node.fetchNodeStatus()` |
| | `blockchainAPI.getNodeVersion()` | `getNodeApi().node.fetchNodeVersion()` |
| **Sustainability** | `blockchainAPI.getConnectedPeers()` | `getNodeApi().peers.fetchConnected()` |
| **TransactionMap** | `blockchainAPI.getAddressTransactions(a, n)` | `getNodeApi().transactions.fetchTransactions(a, n)` |

### Phase 5: Type Migration

Replace scanner's hand-rolled blockchain types with SDK canonical types:

| Action | Lines Removed | SDK Import |
|---|---|---|
| Delete `Block`, `BlockHeader` | ~30 | `import type { IBlock, IBlockHeader } from '@decentralchain/node-api-js'` |
| Delete `Transaction`, `MassTransferItem` | ~35 | `import type { Transaction } from '@decentralchain/ts-types'` |
| Delete `AssetDetails`, `AssetBalance`, `AddressBalances`, `NFT` | ~30 | `import type { TAssetDetails, TAssetBalance, TAssetsBalance } from '@decentralchain/node-api-js'` |
| Delete `Lease` | ~10 | `import type { ILeaseInfo } from '@decentralchain/node-api-js'` |
| Delete `Peer`, `PeersResponse` | ~15 | `import type { IAllResponse, IPeerConnectedResponse } from '@decentralchain/node-api-js'` |
| Delete `HeightResponse`, `NodeVersionResponse`, `NodeStatusResponse` | ~15 | `import type { INodeStatus, INodeVersion } from '@decentralchain/node-api-js'` |
| Delete `RewardsResponse` | ~5 | `import type { TRewards } from '@decentralchain/node-api-js'` |

**Net result:** ~140 lines of hand-rolled types deleted, replaced by imports from SDK packages.

### Phase 6: Hook Migration

Update React Query hooks to use the SDK:

```typescript
// Before (useBlockPolling.ts)
import { BlockchainAPI } from '../components/utils/blockchain';
const api = new BlockchainAPI();
queryFn: () => api.getHeight()

// After
import { getNodeApi } from '@/lib/api';
queryFn: () => getNodeApi().blocks.fetchHeight()
```

Applies to `useBlockPolling.ts`, `DexPairsWidget.tsx`, and other dashboard components.

### Phase 7: Delete Dead Code

| File | Action |
|---|---|
| `src/components/utils/blockchain.tsx` | **Delete entirely** (312 lines) |
| `src/components/utils/blockchain.test.ts` | **Delete entirely** (replaced by SDK's own tests) |
| `getNodeState()` references | Already dead code — nothing calls it |
| `getRewards()` references | Already dead code — nothing calls it |
| `getBlocksForgedByAddress()` references | Already dead code — nothing calls it |

### Phase 8: Move Into Monorepo

Once scanner imports `@decentralchain/node-api-js`, `@decentralchain/ts-types`, and `@decentralchain/data-service-client-js`:

1. `git subtree add --prefix=apps/scanner` (preserves full commit history)
2. Update `pnpm-workspace.yaml` to include `apps/scanner`
3. Change dep versions from npm registry versions to `workspace:*`
4. `pnpm install` — resolves to local SDK source
5. `turbo run build --filter=@decentralchain/scanner...` — verify build succeeds

Scanner is now a full monorepo citizen. SDK changes automatically trigger scanner rebuilds via Turborepo's dependency graph.

---

## 7 — What Scanner Gets From the SDK

| Capability | Hand-Rolled (Before) | SDK-Backed (After) |
|---|---|---|
| **Timeout handling** | Custom 20s `AbortController` per request | SDK: 30s `AbortSignal.timeout()` with proper cleanup |
| **Retry logic** | Custom exponential backoff (3 retries, 1s→2s→4s) | SDK: none built-in, but composable with React Query's `retry` (already in place) |
| **SSRF protection** | None | SDK enforces HTTPS for remote hosts, HTTP only for localhost |
| **BigNumber-safe parsing** | None — `JSON.parse()` truncates large integers silently | SDK uses BigNumber-safe JSON parser (critical for blockchain amounts >2^53) |
| **Type safety** | Loose interfaces with `[key: string]: unknown` escape hatches | Discriminated union types, per-transaction-type fields, no escape hatches |
| **Endpoint coverage** | 27 endpoints (subset) | 86 endpoints — scanner can use any node API without writing new fetch code |
| **Distribution pagination** | Custom 50-line implementation | SDK helper with progress callbacks (after Gap 1 fix) |
| **Transaction type handling** | Single `Transaction` interface, `switch(tx.type)` with no compiler help | `switchTransactionByType()` utility with exhaustive type narrowing |
| **Maintenance** | Scanner team maintains API layer independently | Single source of truth maintained once in `node-api-js` |

---

## 8 — Risk Assessment

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SDK type shapes differ from scanner's expectations | High | Medium | Phase 5 is explicit about every type change. Run `tsc --noEmit` after each type migration to catch all breakage at compile time, not runtime. |
| `Transaction` discriminated union breaks page code | High | Medium | Transaction rendering code will need type narrowing (`if (tx.type === 4)`). Add a `getTransactionField()` helper that safely extracts optional fields with proper type guards. |
| SDK's 30s timeout vs scanner's 20s timeout | Low | Low | React Query already has its own timeout/retry logic. The SDK timeout is a safety net, not the primary UX timeout. |
| Scanner's exponential backoff removed | Medium | Low | React Query's `retry` and `retryDelay` configuration replaces this. Already configured in scanner's query client. |
| `getPairInfo` response shape mismatch | Medium | Medium | Write a thin adapter function that maps `DataServiceClient.getPairs()` response to scanner's `PairInfoResponse` shape. ~10 lines. |
| Monorepo migration breaks scanner CI | Low | High | Run scanner build in monorepo CI as a verification step before removing the standalone repo. Keep both running in parallel during transition. |

### Non-Risks

| Concern | Why It's Not a Risk |
|---|---|
| Runtime behavior change | SDK hits the exact same REST endpoints with the same HTTP methods. Response JSON is identical. |
| Bundle size increase | `node-api-js` is already tree-shakeable. Scanner only imports the namespaces it uses. Net bundle impact is negligible — may even decrease by removing the 312-line class. |
| Breaking external API calls | `ipapi.co` and `thegreenwebfoundation.org` calls are untouched. They stay as raw `fetch()` in the pages. |

---

## 9 — Summary

| Metric | Value |
|---|---|
| **Lines of scanner code deleted** | ~450 (blockchain.tsx + test + ~140 lines of types) |
| **Lines of SDK code added** | ~55 (asset distribution pagination helper) |
| **Lines of scanner code added** | ~40 (thin `lib/api.ts` wrapper + matcher raw fetch) |
| **Net lines of code eliminated** | **~355** |
| **Files deleted from scanner** | 2 (blockchain.tsx, blockchain.test.ts) |
| **Files added to scanner** | 1 (lib/api.ts) |
| **Scanner pages modified** | 17 (all pages import the new API layer) |
| **SDK packages scanner will import** | 3 (`node-api-js`, `ts-types`, `data-service-client-js`) |
| **SDK gaps to close first** | 1 mandatory (distribution pagination cursor) |
| **Monorepo inclusion rule satisfied** | Yes — scanner imports `@decentralchain/*` |
| **Migration phases** | 8 (SDK prep → deps → API layer → pages → types → hooks → delete → monorepo) |
