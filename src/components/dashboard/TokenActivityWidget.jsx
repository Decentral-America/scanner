import React, { useState, useEffect } from "react";
import { blockchainAPI } from "../utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssetLogo from "../shared/AssetLogo";
import { truncate, formatAmount } from "../utils/formatters";
import { useLanguage } from "../contexts/LanguageContext";

export default function TokenActivityWidget() {
  const { t } = useLanguage();
  const [tokenActivity, setTokenActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTokenActivity = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current height
        const heightData = await blockchainAPI.getHeight();
        const currentHeight = heightData?.height;

        if (!currentHeight || !isMounted) return;

        // Fetch only last 5 blocks to minimize API calls
        const from = Math.max(1, currentHeight - 4);
        const blockHeaders = await blockchainAPI.getBlockHeaders(from, currentHeight);

        if (!isMounted) return;

        const assetStats = {};
        let processedBlocks = 0;
        const maxBlocks = 5;

        // Process blocks with timeout protection
        for (const block of blockHeaders.slice(-maxBlocks)) {
          if (!isMounted) return;
          if (processedBlocks >= maxBlocks) break;

          try {
            // Add timeout for each block fetch
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Block fetch timeout")), 5000)
            );

            const blockPromise = blockchainAPI.getBlockByHeight(block.height);
            const fullBlock = await Promise.race([blockPromise, timeoutPromise]);

            if (!isMounted) return;

            if (fullBlock?.transactions) {
              processedBlocks++;

              for (const tx of fullBlock.transactions) {
                // Track Transfer (Type 4) and Mass Transfer (Type 11)
                if ([4, 11].includes(tx.type) && tx.assetId) {
                  if (!assetStats[tx.assetId]) {
                    assetStats[tx.assetId] = {
                      txCount: 0,
                      totalAmount: 0,
                      assetId: tx.assetId,
                    };
                  }
                  assetStats[tx.assetId].txCount++;

                  if (tx.type === 4 && tx.amount) {
                    assetStats[tx.assetId].totalAmount += tx.amount;
                  } else if (tx.type === 11 && tx.transfers) {
                    for (const transfer of tx.transfers) {
                      assetStats[tx.assetId].totalAmount += transfer.amount || 0;
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch block ${block.height}:`, err.message);
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
              setTimeout(() => reject(new Error("Asset details timeout")), 3000)
            );

            const detailsPromise = blockchainAPI.getAssetDetails(asset.assetId);
            const details = await Promise.race([detailsPromise, timeoutPromise]);

            if (isMounted && details) {
              asset.name = details.name || truncate(asset.assetId, 8);
              asset.decimals = details.decimals || 8;
            }
          } catch (err) {
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
      } catch (err) {
        console.error("Token activity fetch error:", err);
        if (isMounted) {
          setError(err.message || "Failed to load token activity");
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
            {t("tokenActivity")}
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
            {t("tokenActivity")}
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
            {t("tokenActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            {t("noTokenActivity")} ({tokenActivity?.blocksAnalyzed || 0} blocks analyzed)
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
          {t("mostActiveTokens")} ({tokenActivity.blocksAnalyzed} blocks)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokenActivity.assets.map((asset, index) => (
            <Link
              key={asset.assetId}
              to={createPageUrl("Asset", `?id=${asset.assetId}`)}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <AssetLogo assetId={asset.assetId} size="sm" />
                <div>
                  <p className="font-medium text-sm">{asset.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatAmount(asset.totalAmount, asset.decimals)} {t("transferred")}
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