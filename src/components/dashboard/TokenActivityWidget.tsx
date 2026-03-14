import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAssetDetailsById, getNodeApi, type IBlock, type TAssetDetails } from '@/lib/api';
import type { TokenAssetStat, Transaction } from '@/types';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../contexts/LanguageContext';
import AssetLogo from '../shared/AssetLogo';
import { formatAmount, truncate } from '../utils/formatters';

export default function TokenActivityWidget() {
  const { t } = useLanguage();
  const [tokenActivity, setTokenActivity] = useState<{
    assets: TokenAssetStat[];
    blocksAnalyzed: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTokenActivity = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current height
        const heightData = await getNodeApi().blocks.fetchHeight();
        const currentHeight = heightData?.height;

        if (!currentHeight || !isMounted) return;

        // Fetch only last 5 blocks to minimize API calls
        const from = Math.max(1, currentHeight - 4);
        const blockHeaders = await getNodeApi().blocks.fetchHeadersSeq(from, currentHeight);

        if (!isMounted) return;

        const assetStats: Record<string, TokenAssetStat> = {};
        let processedBlocks = 0;
        const maxBlocks = 5;

        // Process blocks with timeout protection
        for (const block of blockHeaders.slice(-maxBlocks)) {
          if (!isMounted) return;
          if (processedBlocks >= maxBlocks) break;

          try {
            // Add timeout for each block fetch
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Block fetch timeout')), 5000),
            );

            const blockPromise = getNodeApi().blocks.fetchBlockAt(block.height);
            const fullBlock = (await Promise.race([blockPromise, timeoutPromise])) as IBlock;

            if (!isMounted) return;

            if (fullBlock?.transactions) {
              processedBlocks++;

              for (const tx of fullBlock.transactions as unknown as Transaction[]) {
                // Track Transfer (Type 4) and Mass Transfer (Type 11)
                if ([4, 11].includes(tx.type) && tx.assetId) {
                  if (!assetStats[tx.assetId]) {
                    assetStats[tx.assetId] = {
                      txCount: 0,
                      totalAmount: 0,
                      assetId: tx.assetId,
                    };
                  }
                  const stat = assetStats[tx.assetId];
                  if (!stat) {
                    continue;
                  }
                  stat.txCount++;

                  if (tx.type === 4 && tx.amount) {
                    stat.totalAmount += tx.amount;
                  } else if (tx.type === 11 && tx.transfers) {
                    for (const transfer of tx.transfers) {
                      stat.totalAmount += transfer.amount || 0;
                    }
                  }
                }
              }
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`Failed to fetch block ${block.height}:`, message);
            // Continue with other blocks
            continue;
          }

          // Small delay between blocks
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!isMounted) return;

        // Get top 5 most active assets
        const topAssets = Object.values(assetStats)
          .sort((a, b) => b.txCount - a.txCount)
          .slice(0, 5);

        if (topAssets.length === 0) {
          setTokenActivity({ assets: [], blocksAnalyzed: processedBlocks });
          setLoading(false);
          return;
        }

        // Fetch asset details with timeout
        for (const asset of topAssets) {
          if (!isMounted) return;

          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Asset details timeout')), 3000),
            );

            const detailsPromise = fetchAssetDetailsById(asset.assetId);
            const details = (await Promise.race([detailsPromise, timeoutPromise])) as TAssetDetails;

            if (isMounted && details) {
              asset.name = details.name || truncate(asset.assetId, 8);
              asset.decimals = details.decimals || 8;
            }
          } catch (_err) {
            asset.name = truncate(asset.assetId, 8);
            asset.decimals = 8;
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (isMounted) {
          setTokenActivity({
            assets: topAssets,
            blocksAnalyzed: processedBlocks,
          });
        }
      } catch (err: unknown) {
        console.error('Token activity fetch error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load token activity');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTokenActivity();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('tokenActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-red-500 py-8">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('tokenActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16">
            <img
              src="https://i.imgur.com/MsLURjt.gif"
              alt="Loading..."
              className="w-32 h-32 object-contain"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenActivity || tokenActivity.assets.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('tokenActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            {t('noTokenActivity')} ({tokenActivity?.blocksAnalyzed || 0} blocks analyzed)
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t('mostActiveTokens')} ({tokenActivity.blocksAnalyzed} blocks)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokenActivity.assets.map((asset) => (
            <Link
              key={asset.assetId}
              to={createPageUrl('Asset', `?id=${asset.assetId}`)}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <AssetLogo assetId={asset.assetId} size="sm" />
                <div>
                  <p className="font-medium text-sm">{asset.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatAmount(asset.totalAmount, asset.decimals)} {t('transferred')}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{asset.txCount} tx</Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
