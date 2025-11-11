import React, { useEffect, useState, Suspense, lazy } from "react";
import { blockchainAPI } from "../components/utils/blockchain";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { fromUnix, truncate, timeAgo, formatAmount } from "../components/utils/formatters";
import CopyButton from "../components/shared/CopyButton";
import {
  Box,
  Activity,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "../components/contexts/LanguageContext";

// Lazy load heavy components
const DexPairsWidget = lazy(() => import("../components/dashboard/DexPairsWidget"));
const TokenActivityWidget = lazy(() => import("../components/dashboard/TokenActivityWidget"));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Widget error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load this widget. {this.state.error?.message || ""}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Loading component for lazy-loaded widgets
const WidgetSkeleton = () => (
  <Card className="border-none shadow-lg">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const { t } = useLanguage();

  // Load widgets after 1 second to ensure core content loads first
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWidgets(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const { data: height, isLoading: heightLoading } = useQuery({
    queryKey: ["height"],
    queryFn: () => blockchainAPI.getHeight(),
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: lastBlock, isLoading: blockLoading } = useQuery({
    queryKey: ["lastBlock"],
    queryFn: () => blockchainAPI.getLastBlock(),
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: nodeVersion } = useQuery({
    queryKey: ["nodeVersion"],
    queryFn: () => blockchainAPI.getNodeVersion(),
  });

  const currentHeight = height?.height || 0;

  const { data: blockHeaders, isLoading: headersLoading } = useQuery({
    queryKey: ["blockHeaders", currentHeight],
    queryFn: async () => {
      const from = Math.max(1, currentHeight - 49);
      return blockchainAPI.getBlockHeaders(from, currentHeight);
    },
    enabled: currentHeight > 0,
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const StatCard = ({ title, value, icon: Icon, gradient, badge }) => (
    <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
      <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} rounded-full opacity-10 transform translate-x-12 -translate-y-12`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <div className={`p-2.5 rounded-xl ${gradient} bg-opacity-20`}>
            <Icon className={`w-5 h-5 ${gradient.replace("bg-", "text-")}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {badge && (
            <Badge variant="secondary" className="mb-1">
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t("networkOverview")}
          </h1>
          <p className="text-gray-600">
            {t("realtimeStats")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="auto-refresh" className="text-sm text-gray-600">
            {t("autoRefresh")}
          </Label>
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          {autoRefresh && (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title={t("currentHeight")}
          value={heightLoading ? "..." : currentHeight.toLocaleString()}
          icon={Activity}
          gradient="bg-blue-600"
        />
        <StatCard
          title={t("nodeVersion")}
          value={nodeVersion?.version || "..."}
          icon={Zap}
          gradient="bg-purple-600"
        />
        <StatCard
          title={t("lastBlock")}
          value={
            blockLoading
              ? "..."
              : timeAgo(lastBlock?.timestamp)
          }
          icon={Clock}
          gradient="bg-orange-600"
        />
      </div>

      {/* Last Block Card */}
      {lastBlock && (
        <Card className="border-none shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              {t("latestBlock")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("blockId")}</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{truncate(lastBlock.signature, 12)}</code>
                  <CopyButton text={lastBlock.signature} label={t("copyBlockId")} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("height")}</p>
                <Link
                  to={createPageUrl("BlockDetail", `?height=${lastBlock.height}`)}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {lastBlock.height.toLocaleString()}
                </Link>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("transactions")}</p>
                <p className="font-semibold">{lastBlock.transactionCount || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("timestamp")}</p>
                <p className="text-sm">{fromUnix(lastBlock.timestamp)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("reward")}</p>
                <p className="font-semibold">{formatAmount(lastBlock.reward || 0)} DC</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">{t("generator")}</p>
                <Link
                  to={createPageUrl("Address", `?addr=${lastBlock.generator}`)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-mono"
                >
                  {truncate(lastBlock.generator, 16)}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lazy-loaded Widgets */}
      {showWidgets && (
        <>
          <ErrorBoundary>
            <Suspense fallback={<WidgetSkeleton />}>
              <TokenActivityWidget />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<WidgetSkeleton />}>
              <DexPairsWidget />
            </Suspense>
          </ErrorBoundary>
        </>
      )}

      {/* Recent Blocks */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>{t("recentBlocks")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("height")}</TableHead>
                  <TableHead>{t("blockId")}</TableHead>
                  <TableHead>{t("time")}</TableHead>
                  <TableHead>{t("generator")}</TableHead>
                  <TableHead className="text-right">{t("txs")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headersLoading ? (
                  Array(10)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  blockHeaders?.slice().reverse().map((block) => (
                    <TableRow
                      key={block.signature}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        (window.location.href = createPageUrl(
                          "BlockDetail",
                          `?height=${block.height}`
                        ))
                      }
                    >
                      <TableCell className="font-medium">
                        <Link
                          to={createPageUrl("BlockDetail", `?height=${block.height}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {block.height.toLocaleString()}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{truncate(block.signature, 10)}</code>
                          <CopyButton text={block.signature} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {timeAgo(block.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={createPageUrl("Address", `?addr=${block.generator}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {truncate(block.generator, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        {block.transactionCount || 0}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}