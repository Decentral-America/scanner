/**
 * SDK-backed API layer for DecentralChain scanner.
 *
 * Replaces the hand-rolled BlockchainAPI class with @decentralchain/node-api-js.
 * Keeps raw fetch for: matcher orderbook, data-service pair info, and
 * asset distribution pagination (SDK lacks `after` cursor parameter).
 */
import { create } from '@decentralchain/node-api-js';
import type {
  IAssetDistribution,
  TAssetBalance,
  TAssetDetails,
  TAssetsBalance,
} from '@decentralchain/node-api-js/api-node/assets';
import type { IBlock, IBlockHeader } from '@decentralchain/node-api-js/api-node/blocks';
import type {
  INodeStatus as INodeStatusBase,
  INodeVersion,
} from '@decentralchain/node-api-js/api-node/node';
import type { Transaction, WithApiMixin } from '@decentralchain/ts-types';

/** Augmented node status – the real API returns extra fields the SDK omits. */
export interface INodeStatus extends INodeStatusBase {
  blockGeneratorStatus?: string;
  historyReplierEnabled?: boolean;
}

// Re-export SDK types for consumers
export type {
  IAssetDistribution,
  IBlock,
  IBlockHeader,
  INodeVersion,
  TAssetBalance,
  TAssetDetails,
  TAssetsBalance,
  Transaction,
  WithApiMixin,
};

// ── Constants ──────────────────────────────────────────────────────────
const DEFAULT_NODE_URL = 'https://mainnet-node.decentralchain.io';
const MATCHER_URL = 'https://mainnet-matcher.decentralchain.io';
const DATA_SERVICE_URL = 'https://data-service.decentralchain.io/v0';
const DISTRIBUTION_PAGE_LIMIT = 1000;

// ── SDK Instance ───────────────────────────────────────────────────────
let nodeApi = create(DEFAULT_NODE_URL);

export function setNodeUrl(url: string): void {
  nodeApi = create(url || DEFAULT_NODE_URL);
}

export function getNodeApi() {
  return nodeApi;
}

/** Fetch details for a single asset (SDK takes string[]). */
export async function fetchAssetDetailsById(assetId: string): Promise<TAssetDetails> {
  const results = await nodeApi.assets.fetchDetails([assetId]);
  return results[0] as TAssetDetails;
}

// ── Scanner-specific types (not in SDK) ────────────────────────────────
export interface DistributionPage {
  hasNext: boolean;
  lastAddress: string | null;
  items: Record<string, string>;
}

export interface FullDistribution {
  items: Record<string, string>;
  totalPages: number;
  totalHolders: number;
}

export interface OrderbookMarket {
  amountAsset: string;
  priceAsset: string;
}

export interface OrderbookResponse {
  markets: OrderbookMarket[];
}

export interface PairInfoResponse {
  __type?: string;
  data: {
    firstPrice: number;
    lastPrice: number;
    volume: number;
    volumeWaves?: number;
    quoteVolume?: number;
    txsCount: number;
    weightedAveragePrice?: number;
    high?: number;
    low?: number;
  } | null;
}

export interface DexPairData {
  amountAsset: string;
  priceAsset: string;
  amountAssetName: string;
  priceAssetName: string;
  lastPrice: number;
  volume24h?: number;
  pairName: string;
  volume: number;
  change24h: number;
  high: number;
  low: number;
  txsCount: number;
}

export interface Peer {
  address: string;
  declaredAddress?: string;
  peerName?: string;
  peerNonce?: number;
  applicationName?: string;
  applicationVersion?: string;
}

export interface PeersResponse {
  peers: Peer[];
}

// ── Asset distribution (SDK lacks `after` cursor) ──────────────────────
export async function fetchAssetDistribution(
  assetId: string,
  height: number,
  limit: number = DISTRIBUTION_PAGE_LIMIT,
  after: string | null = null,
): Promise<DistributionPage> {
  let endpoint = `${DEFAULT_NODE_URL}/assets/${assetId}/distribution/${height}/limit/${limit}`;
  if (after) {
    endpoint += `?after=${encodeURIComponent(after)}`;
  }

  const response = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.values || data.items || {}) as Record<string, string>;
  const hasNext = (data.hasNext as boolean) || false;
  const lastAddress = (data.last || data.lastAddress || data.lastItem || null) as string | null;

  return { hasNext, lastAddress, items };
}

export async function fetchFullAssetDistribution(
  assetId: string,
  height: number,
  onProgress: ((pages: number, holders: number, hasMore: boolean) => void) | null = null,
): Promise<FullDistribution> {
  let allItems: Record<string, string> = {};
  let after: string | null = null;
  let pageCount = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchAssetDistribution(assetId, height, DISTRIBUTION_PAGE_LIMIT, after);
    allItems = { ...allItems, ...page.items };
    pageCount++;

    if (onProgress) {
      onProgress(pageCount, Object.keys(allItems).length, page.hasNext);
    }

    if (page.hasNext && page.lastAddress) {
      after = page.lastAddress;
      hasMore = true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else {
      hasMore = false;
    }
  }

  return {
    items: allItems,
    totalPages: pageCount,
    totalHolders: Object.keys(allItems).length,
  };
}

// ── Matcher / DEX (no SDK equivalent) ──────────────────────────────────
export async function fetchMatcherOrderbook(): Promise<OrderbookResponse> {
  const response = await fetch(`${MATCHER_URL}/matcher/orderbook`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as OrderbookResponse;
}

export async function fetchPairInfo(
  amountAsset: string,
  priceAsset: string,
): Promise<PairInfoResponse | null> {
  const response = await fetch(`${DATA_SERVICE_URL}/pairs/${amountAsset}/${priceAsset}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as PairInfoResponse;
}
