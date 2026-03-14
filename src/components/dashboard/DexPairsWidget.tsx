import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type DexPairData,
  fetchAssetDetailsById,
  fetchMatcherOrderbook,
  fetchPairInfo,
  type OrderbookResponse,
} from '@/lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import AssetLogo from '../shared/AssetLogo';

export default function DexPairsWidget() {
  const { t } = useLanguage();
  const [pairsData, setPairsData] = useState<DexPairData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch trading pairs
  const { data: orderbook } = useQuery<OrderbookResponse>({
    queryKey: ['matcherOrderbook'],
    queryFn: () => fetchMatcherOrderbook(),
    staleTime: 60000, // Cache for 1 minute
  });

  useEffect(() => {
    const fetchPairsData = async () => {
      if (!orderbook?.markets) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const pairs: DexPairData[] = [];
        const maxPairsToShow = 10;

        // Try to fetch more pairs than we need, in case some fail
        const marketsToFetch = orderbook.markets.slice(0, 30);

        for (const market of marketsToFetch) {
          // Stop if we already have enough pairs
          if (pairs.length >= maxPairsToShow) break;

          try {
            // Small delay between requests
            await new Promise((resolve) => setTimeout(resolve, 150));

            const pairInfo = await fetchPairInfo(market.amountAsset, market.priceAsset);

            if (pairInfo?.data) {
              // Fetch asset details
              let amountAssetName = 'Unknown';
              let priceAssetName = 'Unknown';

              try {
                if (market.amountAsset !== 'DCC' && market.amountAsset !== 'WAVES') {
                  const amountDetails = await fetchAssetDetailsById(market.amountAsset);
                  amountAssetName = amountDetails.name || 'Unknown';
                } else {
                  amountAssetName = 'DCC';
                }

                if (market.priceAsset !== 'DCC' && market.priceAsset !== 'WAVES') {
                  const priceDetails = await fetchAssetDetailsById(market.priceAsset);
                  priceAssetName = priceDetails.name || 'Unknown';
                } else {
                  priceAssetName = 'DCC';
                }
              } catch (_err) {
                // Silently skip if asset details fail
                continue;
              }

              // Calculate 24h change
              const change24h =
                pairInfo.data.firstPrice > 0
                  ? ((pairInfo.data.lastPrice - pairInfo.data.firstPrice) /
                      pairInfo.data.firstPrice) *
                    100
                  : 0;

              pairs.push({
                amountAsset: market.amountAsset,
                priceAsset: market.priceAsset,
                amountAssetName,
                priceAssetName,
                pairName: `${amountAssetName}/${priceAssetName}`,
                lastPrice: pairInfo.data.lastPrice,
                volume: pairInfo.data.volume,
                change24h,
                high: pairInfo.data.high || 0,
                low: pairInfo.data.low || 0,
                txsCount: pairInfo.data.txsCount,
              });
            }
          } catch (_error) {}
        }

        // Sort by volume (descending)
        pairs.sort((a, b) => b.volume - a.volume);
        setPairsData(pairs.slice(0, maxPairsToShow));
      } catch (error) {
        console.error('Failed to fetch pairs data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPairsData();
  }, [orderbook]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5" />
          {t('dexTradingPairs')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <img
              src="https://i.imgur.com/MsLURjt.gif"
              alt="Loading..."
              className="w-32 h-32 object-contain"
            />
          </div>
        ) : pairsData.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noTradingPairs')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pair')}</TableHead>
                  <TableHead className="text-right">{t('lastPrice')}</TableHead>
                  <TableHead className="text-right">{t('change24h')}</TableHead>
                  <TableHead className="text-right">{t('volume24h')}</TableHead>
                  <TableHead className="text-right">{t('trades')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairsData.map((pair) => (
                  <TableRow
                    key={`${pair.amountAsset}-${pair.priceAsset}-${pair.pairName}`}
                    className="hover:bg-gray-50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AssetLogo assetId={pair.amountAsset} size="xs" />
                        <span className="font-medium">{pair.pairName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {pair.lastPrice.toFixed(8)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={pair.change24h >= 0 ? 'default' : 'destructive'}
                        className="gap-1"
                      >
                        {pair.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {pair.change24h.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {pair.volume.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">{pair.txsCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
