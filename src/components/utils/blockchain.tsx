// API client for DecentralChain
import type {
  AddressBalances,
  AssetDetails,
  Block,
  BlockHeader,
  DistributionPage,
  FullDistribution,
  HeightResponse,
  Lease,
  NFT,
  NodeStatusResponse,
  NodeVersionResponse,
  OrderbookResponse,
  PairInfoResponse,
  Peer,
  PeersResponse,
  RewardsResponse,
  Transaction,
} from '@/types';

const DEFAULT_BASE_URL = 'https://mainnet-node.decentralchain.io';
const PAGE_LIMIT = 1000;
const REQUEST_TIMEOUT = 20000;
const MAX_RETRIES = 3;

export class BlockchainAPI {
  baseURL: string;

  constructor(customBaseUrl: string | null = null) {
    this.baseURL = customBaseUrl || DEFAULT_BASE_URL;
  }

  setBaseURL(url: string | null): void {
    this.baseURL = url || DEFAULT_BASE_URL;
  }

  async request<T = unknown>(endpoint: string, retries: number = 0): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting and server errors with retry
        if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES) {
          const delay = 2 ** retries * 1000; // Exponential backoff
          console.warn(
            `Retrying ${endpoint} after ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request<T>(endpoint, retries + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`);
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Blocks
  async getHeight(): Promise<HeightResponse> {
    return this.request<HeightResponse>('/blocks/height');
  }

  async getLastBlock(): Promise<Block> {
    return this.request<Block>('/blocks/last');
  }

  async getBlockByHeight(height: number): Promise<Block> {
    return this.request<Block>(`/blocks/at/${height}`);
  }

  async getBlockById(id: string): Promise<Block> {
    return this.request<Block>(`/blocks/${id}`);
  }

  async getBlockHeaders(from: number, to: number): Promise<BlockHeader[]> {
    return this.request<BlockHeader[]>(`/blocks/headers/seq/${from}/${to}`);
  }

  async getBlockHeadersAtHeight(height: number): Promise<BlockHeader> {
    return this.request<BlockHeader>(`/blocks/headers/at/${height}`);
  }

  async getBlocksForgedByAddress(address: string, from: number, to: number): Promise<Block[]> {
    return this.request<Block[]>(`/blocks/address/${address}/${from}/${to}`);
  }

  // Transactions
  async getTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/info/${id}`);
  }

  async getUnconfirmedTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/unconfirmed/info/${id}`);
  }

  async getAddressTransactions(address: string, limit: number = 50): Promise<Transaction[][]> {
    return this.request<Transaction[][]>(`/transactions/address/${address}/limit/${limit}`);
  }

  async getUnconfirmedTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>('/transactions/unconfirmed');
  }

  // Address & Assets
  async getAddressBalances(address: string): Promise<AddressBalances> {
    return this.request<AddressBalances>(`/assets/balance/${address}`);
  }

  async getAddressAssetBalance(address: string, assetId: string): Promise<{ balance: number }> {
    return this.request<{ balance: number }>(`/assets/balance/${address}/${assetId}`);
  }

  async getAddressNFTs(address: string, limit: number = 100): Promise<NFT[]> {
    return this.request<NFT[]>(`/assets/nft/${address}/limit/${limit}`);
  }

  async getAssetDetails(assetId: string): Promise<AssetDetails> {
    return this.request<AssetDetails>(`/assets/details/${assetId}`);
  }

  async getAssetDistribution(
    assetId: string,
    height: number,
    limit: number = PAGE_LIMIT,
    after: string | null = null,
  ): Promise<DistributionPage> {
    let endpoint = `/assets/${assetId}/distribution/${height}/limit/${limit}`;
    if (after) {
      endpoint += `?after=${after}`;
    }
    const response = await this.request<Record<string, unknown>>(endpoint);

    // Normalize response - API may return 'values' or 'items', and 'last' or 'lastItem' or 'lastAddress'
    const items = (response.values || response.items || {}) as Record<string, string>;
    const hasNext = (response.hasNext as boolean) || false;
    const lastAddress = (response.last || response.lastAddress || response.lastItem || null) as
      | string
      | null;

    return {
      hasNext,
      lastAddress,
      items,
    };
  }

  // Fetch ALL distribution pages with pagination
  async getFullAssetDistribution(
    assetId: string,
    height: number,
    onProgress: ((pages: number, holders: number, hasMore: boolean) => void) | null = null,
  ): Promise<FullDistribution> {
    let allItems: Record<string, string> = {};
    let after = null;
    let pageCount = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const page = await this.getAssetDistribution(assetId, height, PAGE_LIMIT, after);

        // Merge this page's items
        allItems = { ...allItems, ...page.items };
        pageCount++;

        const totalHolders = Object.keys(allItems).length;

        // Update progress
        if (onProgress) {
          onProgress(pageCount, totalHolders, page.hasNext);
        }

        // Check if there are more pages
        if (page.hasNext && page.lastAddress) {
          after = page.lastAddress;
          hasMore = true;
          // Small delay between requests to avoid overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching page ${pageCount + 1}:`, error);
        throw error;
      }
    }

    return {
      items: allItems,
      totalPages: pageCount,
      totalHolders: Object.keys(allItems).length,
    };
  }

  // Leasing
  async getActiveLeases(address: string): Promise<Lease[]> {
    return this.request<Lease[]>(`/leasing/active/${address}`);
  }

  // Peers
  async getConnectedPeers(): Promise<PeersResponse> {
    return this.request<PeersResponse>('/peers/connected');
  }

  async getAllPeers(): Promise<PeersResponse> {
    return this.request<PeersResponse>('/peers/all');
  }

  async getBlacklistedPeers(): Promise<Peer[]> {
    return this.request<Peer[]>('/peers/blacklisted');
  }

  async getSuspendedPeers(): Promise<Peer[]> {
    return this.request<Peer[]>('/peers/suspended');
  }

  // Node
  async getNodeStatus(): Promise<NodeStatusResponse> {
    return this.request<NodeStatusResponse>('/node/status');
  }

  async getNodeVersion(): Promise<NodeVersionResponse> {
    return this.request<NodeVersionResponse>('/node/version');
  }

  // Add a method for network statistics, assuming an endpoint like /node/state or /node/stats
  async getNodeState(): Promise<unknown> {
    return this.request('/node/state'); // Common endpoint for overall node/network stats
  }

  // Rewards
  async getRewards(): Promise<RewardsResponse> {
    return this.request<RewardsResponse>('/blockchain/rewards');
  }

  async getRewardsAtHeight(height: number): Promise<RewardsResponse> {
    return this.request<RewardsResponse>(`/blockchain/rewards/${height}`);
  }

  // DEX / Matcher
  async getMatcherOrderbook(): Promise<OrderbookResponse> {
    try {
      const response = await fetch('https://mainnet-matcher.decentralchain.io/matcher/orderbook');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as OrderbookResponse;
    } catch (error: unknown) {
      console.error('Failed to fetch matcher orderbook:', error);
      throw error;
    }
  }

  async getPairInfo(amountAsset: string, priceAsset: string): Promise<PairInfoResponse | null> {
    try {
      const response = await fetch(
        `https://data-service.decentralchain.io/v0/pairs/${amountAsset}/${priceAsset}`,
      );
      if (!response.ok) {
        // Don't log 404 errors as they are expected for many pairs
        if (response.status !== 404) {
          console.error(
            `Failed to fetch pair info for ${amountAsset}/${priceAsset}: HTTP ${response.status}`,
          );
        }
        // Always throw for non-ok responses; the catch block will distinguish 404s
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as PairInfoResponse;
    } catch (error: unknown) {
      // Check if the error is a 404 from our thrown error
      if (error instanceof Error && error.message?.startsWith('HTTP 404')) {
        // Silently fail for 404s: return null to indicate the pair was not found.
        return null;
      }
      // For all other errors (network issues, 5xx, etc.), log and re-throw
      console.error(`Failed to fetch pair info for ${amountAsset}/${priceAsset}:`, error);
      throw error;
    }
  }
}

export const blockchainAPI = new BlockchainAPI();

// Function to create a custom API instance with user's node URL
export const createCustomBlockchainAPI = (nodeUrl: string): BlockchainAPI => {
  return new BlockchainAPI(nodeUrl);
};
