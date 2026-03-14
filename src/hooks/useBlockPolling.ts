import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Block, HeightResponse } from '@/types';
import { BlockchainAPI } from '../components/utils/blockchain';

const api = new BlockchainAPI();
const POLL_INTERVAL = 5_000; // 5 seconds

/**
 * Shared hook for real-time block height polling.
 * All consumers share the same React Query cache entry.
 */
export function useBlockHeight(enabled = true): UseQueryResult<HeightResponse> {
  return useQuery({
    queryKey: ['height'],
    queryFn: () => api.getHeight(),
    refetchInterval: enabled ? POLL_INTERVAL : false,
    staleTime: POLL_INTERVAL - 1_000,
  });
}

/**
 * Shared hook for real-time latest block polling.
 */
export function useLatestBlock(enabled = true): UseQueryResult<Block> {
  return useQuery({
    queryKey: ['lastBlock'],
    queryFn: () => api.getLastBlock(),
    refetchInterval: enabled ? POLL_INTERVAL : false,
    staleTime: POLL_INTERVAL - 1_000,
  });
}
