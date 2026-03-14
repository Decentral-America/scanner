import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Clock, TrendingUp, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { BlockHeader, HeightResponse } from '@/types';
import { createPageUrl } from '@/utils';
import { blockchainAPI } from '../utils/blockchain';

export default function NetworkOverviewCard() {
  const { data: height } = useQuery<HeightResponse>({
    queryKey: ['height'],
    queryFn: () => blockchainAPI.getHeight(),
  });

  const currentHeight = height?.height || 0;

  const { data: recentBlocks, isLoading } = useQuery<BlockHeader[]>({
    queryKey: ['recentBlocks', currentHeight],
    queryFn: async () => {
      const from = Math.max(1, currentHeight - 49);
      return blockchainAPI.getBlockHeaders(from, currentHeight);
    },
    enabled: currentHeight > 0,
  });

  const stats = useMemo(() => {
    if (!recentBlocks || recentBlocks.length < 2) return null;

    const sorted = [...recentBlocks].sort((a, b) => a.height - b.height);

    // Calculate average block time
    const blockTimes: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (!previous || !current) {
        continue;
      }
      const timeDiff = (current.timestamp - previous.timestamp) / 1000;
      if (timeDiff > 0) blockTimes.push(timeDiff);
    }
    const avgBlockTime = blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;

    // Calculate TPS
    const totalTxs = sorted.reduce((sum, block) => sum + (block.transactionCount || 0), 0);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) {
      return null;
    }
    const totalTime = (last.timestamp - first.timestamp) / 1000;
    const tps = totalTime > 0 ? totalTxs / totalTime : 0;

    // Transactions in last 24h estimate (50 blocks * 48 = ~2400 blocks/day)
    const txsLast24h = (totalTxs / sorted.length) * 2400;

    return {
      avgBlockTime: avgBlockTime.toFixed(2),
      tps: tps.toFixed(3),
      txsLast24h: Math.round(txsLast24h),
    };
  }, [recentBlocks]);

  const StatItem = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: LucideIcon;
    label: string;
    value: string;
    color: string;
  }) => (
    <div className="flex items-center gap-3">
      <div className={`p-2 ${color} bg-opacity-20 rounded-lg`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        {isLoading ? (
          <Skeleton className="h-5 w-16 mt-1" />
        ) : (
          <p className="text-lg font-bold">{value}</p>
        )}
      </div>
    </div>
  );

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Network Performance
        </CardTitle>
        <Link to={createPageUrl('NetworkStatistics')}>
          <Button variant="ghost" size="sm">
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <StatItem
            icon={Clock}
            label="Avg Block Time"
            value={stats ? `${stats.avgBlockTime}s` : '...'}
            color="text-blue-600"
          />
          <StatItem
            icon={Zap}
            label="TPS"
            value={stats ? stats.tps : '...'}
            color="text-purple-600"
          />
          <StatItem
            icon={TrendingUp}
            label="Est. Txs/24h"
            value={stats ? stats.txsLast24h.toLocaleString() : '...'}
            color="text-green-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}
