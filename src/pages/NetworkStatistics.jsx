
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../components/utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Clock,
  Zap,
  Network,
  BarChart3,
}
 from "lucide-react";
import { useLanguage } from "../components/contexts/LanguageContext";

export default function NetworkStatistics() {
  const { t } = useLanguage();

  const { data: height } = useQuery({
    queryKey: ["height"],
    queryFn: () => blockchainAPI.getHeight(),
  });

  const { data: nodeStatus } = useQuery({
    queryKey: ["nodeStatus"],
    queryFn: () => blockchainAPI.getNodeStatus(),
  });

  const { data: nodeVersion } = useQuery({
    queryKey: ["nodeVersion"],
    queryFn: () => blockchainAPI.getNodeVersion(),
  });

  const { data: connectedPeers } = useQuery({
    queryKey: ["peers", "connected"],
    queryFn: () => blockchainAPI.getConnectedPeers(),
  });

  const currentHeight = height?.height || 0;

  const { data: recentBlocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["recentBlocks", currentHeight],
    queryFn: async () => {
      const from = Math.max(1, currentHeight - 99);
      return blockchainAPI.getBlockHeaders(from, currentHeight);
    },
    enabled: currentHeight > 0,
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!recentBlocks || recentBlocks.length < 2) return null;

    const sorted = [...recentBlocks].sort((a, b) => a.height - b.height);

    // Block time analysis
    const blockTimes = [];
    for (let i = 1; i < sorted.length; i++) {
      const timeDiff = (sorted[i].timestamp - sorted[i - 1].timestamp) / 1000;
      if (timeDiff > 0) blockTimes.push(timeDiff);
    }

    const avgBlockTime =
      blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;

    // Transaction analysis
    const totalTxs = sorted.reduce(
      (sum, block) => sum + (block.transactionCount || 0),
      0
    );
    const avgTxPerBlock = totalTxs / sorted.length;

    // TPS calculation
    const totalTime =
      (sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 1000;
    const tps = totalTime > 0 ? totalTxs / totalTime : 0;

    // Chart data for last 50 blocks
    const chartData = sorted.slice(-50).map((block) => ({
      height: block.height,
      txCount: block.transactionCount || 0,
      timestamp: block.timestamp,
    }));

    // Block time chart data
    const blockTimeData = [];
    for (let i = 1; i < Math.min(sorted.length, 50); i++) {
      const timeDiff =
        (sorted[sorted.length - 50 + i].timestamp -
          sorted[sorted.length - 50 + i - 1].timestamp) /
        1000;
      blockTimeData.push({
        height: sorted[sorted.length - 50 + i].height,
        time: timeDiff,
      });
    }

    // Transaction Volume Trend (hourly aggregation for last 24h estimate)
    const volumeTrendData = [];
    const blocksPerHour = 3600 / avgBlockTime; // Estimate
    const hoursToShow = 24;
    const blocksPerInterval = Math.floor(sorted.length / hoursToShow);
    
    for (let i = 0; i < hoursToShow && i * blocksPerInterval < sorted.length; i++) {
      const start = i * blocksPerInterval;
      const end = Math.min(start + blocksPerInterval, sorted.length);
      const intervalBlocks = sorted.slice(start, end);
      const intervalTxs = intervalBlocks.reduce((sum, b) => sum + (b.transactionCount || 0), 0);
      
      volumeTrendData.push({
        hour: `${i}h ago`,
        transactions: intervalTxs,
        avgPerBlock: intervalTxs / intervalBlocks.length,
      });
    }

    // Network Utilization (block size analysis)
    const blockSizeData = sorted.slice(-50).map(block => ({
      height: block.height,
      size: block.blocksize || 0,
    }));

    const avgBlockSize = sorted.reduce((sum, b) => sum + (b.blocksize || 0), 0) / sorted.length;
    const maxBlockSize = Math.max(...sorted.map(b => b.blocksize || 0));

    return {
      avgBlockTime: avgBlockTime.toFixed(2),
      avgTxPerBlock: avgTxPerBlock.toFixed(2),
      tps: tps.toFixed(3),
      totalTxs,
      chartData,
      blockTimeData,
      volumeTrendData: volumeTrendData.reverse(),
      blockSizeData,
      avgBlockSize: avgBlockSize.toFixed(0),
      maxBlockSize,
    };
  }, [recentBlocks]);

  const StatCard = ({ title, value, icon: Icon, color, badge }) => (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-2">{title}</p>
            {blocksLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {badge && <Badge className="mt-2">{badge}</Badge>}
          </div>
          <div className={`p-3 ${color} bg-opacity-20 rounded-xl`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {t("networkStatisticsTitle")}
        </h1>
        <p className="text-gray-600">
          {t("advancedAnalytics")}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t("avgBlockTime")}
          value={analytics ? `${analytics.avgBlockTime}s` : "..."}
          icon={Clock}
          color="text-blue-600"
        />
        <StatCard
          title={t("transactionsPerSecond")}
          value={analytics ? analytics.tps : "..."}
          icon={Zap}
          color="text-purple-600"
        />
        <StatCard
          title={t("avgTxPerBlock")}
          value={analytics ? analytics.avgTxPerBlock : "..."}
          icon={BarChart3}
          color="text-green-600"
        />
        <StatCard
          title={t("connectedPeers")}
          value={connectedPeers?.peers?.length || 0}
          icon={Network}
          color="text-orange-600"
        />
      </div>

      {/* Node Information */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t("nodeInformation")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("nodeVersion")}</p>
              <p className="font-semibold text-lg">
                {nodeVersion?.version || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("currentHeight")}</p>
              <p className="font-semibold text-lg">
                {currentHeight.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("blockGeneratorStatus")}</p>
              <Badge
                variant={
                  nodeStatus?.blockGeneratorStatus === "active"
                    ? "default"
                    : "secondary"
                }
              >
                {nodeStatus?.blockGeneratorStatus || "N/A"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {analytics && (
        <>
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>{t("transactionVolumeTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.volumeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    label={{ value: t("transactions"), angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="transactions" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>{t("transactionsPerBlock")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="height"
                    tick={{ fontSize: 12 }}
                    label={{ value: t("blockHeight"), position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    label={{ value: t("transactions"), angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="txCount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>{t("blockTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.blockTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="height"
                    tick={{ fontSize: 12 }}
                    label={{ value: t("blockHeight"), position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    label={{ value: t("seconds"), angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="time"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>{t("networkUtilization")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.blockSizeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="height"
                    tick={{ fontSize: 12 }}
                    label={{ value: t("blockHeight"), position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    label={{ value: t("bytes"), angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="size"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Summary Statistics */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>{t("summaryStats")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("totalTransactions")}</p>
              <p className="text-2xl font-bold">
                {analytics?.totalTxs.toLocaleString() || "..."}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("blocksAnalyzed")}</p>
              <p className="text-2xl font-bold">
                {recentBlocks?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("avgBlockSize")}</p>
              <p className="text-2xl font-bold">
                {analytics?.avgBlockSize ? `${analytics.avgBlockSize} ${t("bytes")}` : "..."}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("maxBlockSize")}</p>
              <p className="text-2xl font-bold">
                {analytics?.maxBlockSize ? `${analytics.maxBlockSize.toLocaleString()} ${t("bytes")}` : "..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
