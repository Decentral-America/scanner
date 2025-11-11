
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssetLogo from "../shared/AssetLogo";
import { useLanguage } from "../contexts/LanguageContext";

export default function DexPairsWidget() {
  const { t } = useLanguage();
  const [pairsData, setPairsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch trading pairs
  const { data: orderbook } = useQuery({
    queryKey: ["matcherOrderbook"],
    queryFn: () => blockchainAPI.getMatcherOrderbook(),
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
        const pairs = [];
        const maxPairsToShow = 10;
        
        // Try to fetch more pairs than we need, in case some fail
        const marketsToFetch = orderbook.markets.slice(0, 30);

        for (const market of marketsToFetch) {
          // Stop if we already have enough pairs
          if (pairs.length >= maxPairsToShow) break;

          try {
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const pairInfo = await blockchainAPI.getPairInfo(
              market.amountAsset,
              market.priceAsset
            );

            if (pairInfo?.data) {
              // Fetch asset details
              let amountAssetName = "Unknown";
              let priceAssetName = "Unknown";

              try {
                if (market.amountAsset !== "DCC" && market.amountAsset !== "WAVES") {
                  const amountDetails = await blockchainAPI.getAssetDetails(market.amountAsset);
                  amountAssetName = amountDetails.name || "Unknown";
                } else {
                  amountAssetName = "DCC";
                }

                if (market.priceAsset !== "DCC" && market.priceAsset !== "WAVES") {
                  const priceDetails = await blockchainAPI.getAssetDetails(market.priceAsset);
                  priceAssetName = priceDetails.name || "Unknown";
                } else {
                  priceAssetName = "DCC";
                }
              } catch (err) {
                // Silently skip if asset details fail
                continue;
              }

              // Calculate 24h change
              const change24h = pairInfo.data.firstPrice > 0
                ? ((pairInfo.data.lastPrice - pairInfo.data.firstPrice) / pairInfo.data.firstPrice) * 100
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
                high: pairInfo.data.high,
                low: pairInfo.data.low,
                txsCount: pairInfo.data.txsCount,
              });
            }
          } catch (error) {
            // Silently skip pairs that return 404 or other errors
            // This is expected as not all pairs have data in the data service
            continue;
          }
        }

        // Sort by volume (descending)
        pairs.sort((a, b) => b.volume - a.volume);
        setPairsData(pairs.slice(0, maxPairsToShow));
      } catch (error) {
        console.error("Failed to fetch pairs data:", error);
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
          {t("dexTradingPairs")}
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
          <p className="text-center text-gray-500 py-8">{t("noTradingPairs")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pair")}</TableHead>
                  <TableHead className="text-right">{t("lastPrice")}</TableHead>
                  <TableHead className="text-right">{t("change24h")}</TableHead>
                  <TableHead className="text-right">{t("volume24h")}</TableHead>
                  <TableHead className="text-right">{t("trades")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairsData.map((pair, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
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
                        variant={pair.change24h >= 0 ? "default" : "destructive"}
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
                    <TableCell className="text-right text-gray-600">
                      {pair.txsCount}
                    </TableCell>
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
