// ─── Block ───────────────────────────────────────────────────────

export interface Block {
  height: number;
  signature: string;
  timestamp: number;
  generator: string;
  transactionCount: number;
  reward?: number;
  blocksize?: number;
  version?: number;
  reference?: string;
  nxt_consensus?: {
    'base-target': number;
    'generation-signature': string;
  };
  features?: number[];
  desiredReward?: number;
  totalFee?: number;
  transactions?: Transaction[];
  [key: string]: unknown;
}

export interface BlockHeader {
  height: number;
  signature: string;
  timestamp: number;
  generator: string;
  transactionCount: number;
  blocksize?: number;
  reward?: number;
  totalFee?: number;
  [key: string]: unknown;
}

// ─── Transaction ─────────────────────────────────────────────────

export interface MassTransferItem {
  recipient: string;
  amount: number;
}

export interface Transaction {
  id: string;
  type: number;
  version: number;
  timestamp: number;
  sender: string;
  senderPublicKey?: string;
  recipient?: string;
  amount?: number;
  fee: number;
  feeAssetId?: string | null;
  height?: number;
  assetId?: string | null;
  attachment?: string;
  proofs?: string[];
  transfers?: MassTransferItem[];
  name?: string;
  description?: string;
  quantity?: number;
  decimals?: number;
  reissuable?: boolean;
  script?: string | null;
  leaseId?: string;
  dApp?: string;
  call?: {
    function: string;
    args: Array<{ type: string; value: unknown }>;
  };
  payment?: Array<{ amount: number; assetId: string | null }>;
  data?: Array<{ key: string; type: string; value: unknown }>;
  [key: string]: unknown;
}

// ─── Asset ───────────────────────────────────────────────────────

export interface AssetDetails {
  assetId: string;
  name: string;
  description: string;
  decimals: number;
  quantity: number;
  reissuable: boolean;
  issuer: string;
  issueHeight?: number;
  issueTimestamp?: number;
  scripted?: boolean;
  minSponsoredAssetFee?: number | null;
  originTransactionId?: string;
  [key: string]: unknown;
}

export interface AssetBalance {
  assetId: string;
  balance: number;
  issueTransaction?: {
    name?: string;
    decimals?: number;
    description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AddressBalances {
  address: string;
  balances: AssetBalance[];
}

export interface NFT {
  assetId: string;
  name?: string;
  description?: string;
  decimals?: number;
  issuer?: string;
  [key: string]: unknown;
}

// ─── Lease ───────────────────────────────────────────────────────

export interface Lease {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  status?: string;
  height?: number;
  [key: string]: unknown;
}

// ─── Peer ────────────────────────────────────────────────────────

export interface Peer {
  address: string;
  declaredAddress?: string;
  nodeName?: string;
  peerName?: string;
  peerNonce?: number;
  lastSeen?: number;
  applicationName?: string;
  applicationVersion?: string;
  [key: string]: unknown;
}

export interface PeersResponse {
  peers: Peer[];
}

export interface GeolocatedPeer extends Peer {
  lat: number;
  lng: number;
  city: string;
  country?: string;
}

// ─── Node ────────────────────────────────────────────────────────

export interface HeightResponse {
  height: number;
}

export interface NodeVersionResponse {
  version: string;
}

export interface NodeStatusResponse {
  blockchainHeight: number;
  stateHeight: number;
  updatedTimestamp: number;
  updatedDate: string;
  blockGeneratorStatus?: string;
  historyReplierEnabled?: boolean;
}

// ─── Rewards ─────────────────────────────────────────────────────

export interface RewardsResponse {
  currentReward: number;
  height: number;
  totalWavesAmount?: number;
  [key: string]: unknown;
}

// ─── DEX ─────────────────────────────────────────────────────────

export interface OrderbookMarket {
  amountAsset: string;
  priceAsset: string;
  amountAssetName?: string;
  priceAssetName?: string;
}

export interface OrderbookResponse {
  markets: OrderbookMarket[];
}

export interface PairInfoResponse {
  data: {
    lastPrice: number;
    firstPrice: number;
    volume: number;
    quoteVolume?: number;
    high: number;
    low: number;
    txsCount: number;
    weightedAveragePrice?: number;
  } | null;
}

export interface DexPairData {
  amountAsset: string;
  priceAsset: string;
  amountAssetName: string;
  priceAssetName: string;
  pairName: string;
  lastPrice: number;
  volume: number;
  change24h: number;
  high: number;
  low: number;
  txsCount: number;
}

// ─── Distribution ────────────────────────────────────────────────

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

export interface ProcessedHolder {
  rank: number;
  address: string;
  balance: bigint;
  percentage: number;
  cumulative: number;
}

export interface DistributionStats {
  holderCount: number;
  top10Ownership: number;
  tierCounts: Record<'WHALE' | 'SHARK' | 'DOLPHIN' | 'SHRIMP', number>;
  gini: number;
}

export interface FetchProgress {
  pages: number;
  holders: number;
  hasMore: boolean;
}

// ─── Entity Storage ──────────────────────────────────────────────

export interface EntityRecord {
  id: string;
  created_date: string;
  updated_date: string;
  [key: string]: unknown;
}

export interface EntityAccessor<T extends EntityRecord = EntityRecord> {
  list(sort?: string, limit?: number): Promise<T[]>;
  filter(query?: Record<string, unknown>, sort?: string, limit?: number): Promise<T[]>;
  get(id: string): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface AssetLogoRequestRecord extends EntityRecord {
  asset_id: string;
  asset_name?: string;
  logo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  user_email?: string;
}

export interface NodeRegistrationRecord extends EntityRecord {
  node_name?: string;
  node_url?: string;
  user_email?: string;
  status?: string;
  [key: string]: unknown;
}

// ─── Toast ───────────────────────────────────────────────────────

export interface ToastData {
  id: string;
  open: boolean;
  title?: string;
  description?: string | React.ReactNode;
  variant?: 'default' | 'destructive';
  action?: React.ReactElement;
  onOpenChange?: (open: boolean) => void;
}

export interface ToastState {
  toasts: ToastData[];
}

export type ToastAction =
  | { type: typeof TOAST_ADD; toast: ToastData }
  | { type: typeof TOAST_UPDATE; toast: Partial<ToastData> & { id: string } }
  | { type: typeof TOAST_DISMISS; toastId?: string }
  | { type: typeof TOAST_REMOVE; toastId?: string };

declare const TOAST_ADD: 'ADD_TOAST';
declare const TOAST_UPDATE: 'UPDATE_TOAST';
declare const TOAST_DISMISS: 'DISMISS_TOAST';
declare const TOAST_REMOVE: 'REMOVE_TOAST';

// ─── Context Types ───────────────────────────────────────────────

export type Language = 'en' | 'es';

export interface LanguageContextValue {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ─── Component Props ─────────────────────────────────────────────

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TokenAssetStat {
  assetId: string;
  txCount: number;
  totalAmount: number;
  name?: string;
  decimals?: number;
}
