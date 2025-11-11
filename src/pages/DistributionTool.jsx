
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../components/utils/blockchain";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { truncate, formatAmount } from "../components/utils/formatters";
import CopyButton from "../components/shared/CopyButton";
import AssetLogo from "../components/shared/AssetLogo";
import {
  Users,
  AlertCircle,
  Info,
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileJson,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "../components/contexts/LanguageContext";

// Holder Tiers with emojis
const TIERS = {
  WHALE: { threshold: 0.01, name: "Whale", emoji: "🐋", color: "text-blue-600" },
  SHARK: { threshold: 0.001, name: "Shark", emoji: "🦈", color: "text-indigo-600" },
  DOLPHIN: { threshold: 0.0001, name: "Dolphin", emoji: "🐬", color: "text-sky-600" },
  SHRIMP: { threshold: 0, name: "Shrimp", emoji: "🦐", color: "text-gray-500" },
};

const PAGE_SIZE = 25;
const HEIGHT_BUFFER = 10;
const MAX_ROLLBACK = 2000;

export default function DistributionTool() {
  const { t } = useLanguage();
  const location = useLocation();
  const initialAssetId = new URLSearchParams(location.search).get("assetId") || "";

  const [assetId, setAssetId] = useState(initialAssetId);
  const [heightInput, setHeightInput] = useState("");
  const [submittedAssetId, setSubmittedAssetId] = useState(null);
  const [submittedHeight, setSubmittedHeight] = useState(null);
  const [fetchProgress, setFetchProgress] = useState({ pages: 0, holders: 0, hasMore: false });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "balance", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: latestHeightData, isLoading: heightLoading } = useQuery({
    queryKey: ["height"],
    queryFn: () => blockchainAPI.getHeight(),
  });
  const latestHeight = latestHeightData?.height || 0;

  const {
    data: assetData,
    isLoading: assetLoading,
    error: assetError,
  } = useQuery({
    queryKey: ["asset", submittedAssetId],
    queryFn: () => blockchainAPI.getAssetDetails(submittedAssetId),
    enabled: !!submittedAssetId,
  });

  const {
    data: distributionData,
    isLoading: distributionLoading,
    error: distributionError,
  } = useQuery({
    queryKey: ["distribution", submittedAssetId, submittedHeight],
    queryFn: () => blockchainAPI.getFullAssetDistribution(
      submittedAssetId, 
      submittedHeight,
      (pages, holders, hasMore) => {
        setFetchProgress({ pages, holders, hasMore });
      }
    ),
    enabled: !!submittedAssetId && !!submittedHeight,
    retry: false,
  });

  const handleFetch = () => {
    if (!assetId || !latestHeight) {
      if (!latestHeight) {
        alert(t("alertWaitForHeight"));
      }
      return;
    }
    
    let heightToUse;
    const safeMaxHeight = Math.max(1, latestHeight - HEIGHT_BUFFER);
    const absoluteMinHeight = Math.max(1, latestHeight - MAX_ROLLBACK);
    
    if (heightInput) {
      const inputHeight = parseInt(heightInput);
      
      if (inputHeight > safeMaxHeight) {
        alert(t("alertHeightTooRecent")
          .replace("{inputHeight}", inputHeight)
          .replace("{buffer}", HEIGHT_BUFFER)
          .replace("{current}", latestHeight)
          .replace("{safeMaxHeight}", safeMaxHeight));
        return;
      }
      if (inputHeight < absoluteMinHeight) {
        alert(t("alertHeightTooOld")
          .replace("{inputHeight}", inputHeight)
          .replace("{maxRollback}", MAX_ROLLBACK)
          .replace("{absoluteMinHeight}", absoluteMinHeight));
        return;
      }
      if (inputHeight < 1) {
        alert(t("alertHeightMinOne"));
        return;
      }
      heightToUse = inputHeight;
    } else {
      heightToUse = safeMaxHeight;
    }
    
    setSubmittedHeight(heightToUse);
    setSubmittedAssetId(assetId);
    setCurrentPage(1);
    setFetchProgress({ pages: 0, holders: 0, hasMore: false });
  };

  const processedData = useMemo(() => {
    if (!distributionData?.items || !assetData) return null;

    const holders = Object.entries(distributionData.items).map(([address, balance], index) => {
      const balanceBigInt = BigInt(balance);
      const totalSupplyBigInt = BigInt(assetData.quantity);
      const percentage = totalSupplyBigInt > 0 ? Number((balanceBigInt * 1000000n) / totalSupplyBigInt) / 10000 : 0;
      return { rank: index + 1, address, balance: balanceBigInt, percentage };
    });

    holders.sort((a, b) => (b.balance > a.balance ? 1 : -1));
    
    let cumulative = 0;
    const rankedHolders = holders.map((holder, index) => {
        cumulative += holder.percentage;
        return {...holder, rank: index + 1, cumulative: cumulative};
    });

    // Tier analysis
    const tierCounts = { WHALE: 0, SHARK: 0, DOLPHIN: 0, SHRIMP: 0 };
    rankedHolders.forEach(h => {
        if (h.percentage >= TIERS.WHALE.threshold) tierCounts.WHALE++;
        else if (h.percentage >= TIERS.SHARK.threshold) tierCounts.SHARK++;
        else if (h.percentage >= TIERS.DOLPHIN.threshold) tierCounts.DOLPHIN++;
        else tierCounts.SHRIMP++;
    });

    // Gini Coefficient
    let giniNumerator = 0n;
    for (let i = 0; i < rankedHolders.length; i++) {
        for (let j = 0; j < rankedHolders.length; j++) {
            giniNumerator += BigInt(Math.abs(Number(rankedHolders[i].balance - rankedHolders[j].balance)));
        }
    }
    const giniDenominator = 2n * BigInt(rankedHolders.length) * BigInt(assetData.quantity);
    const gini = giniDenominator > 0n ? Number(giniNumerator * 10000n / giniDenominator) / 10000 : 0;

    return {
      holders: rankedHolders,
      stats: {
        holderCount: rankedHolders.length,
        top10Ownership: rankedHolders.slice(0, 10).reduce((acc, h) => acc + h.percentage, 0),
        tierCounts,
        gini
      },
    };
  }, [distributionData, assetData]);

  const sortedAndFilteredData = useMemo(() => {
    if (!processedData) return [];
    let data = [...processedData.holders];
    if (searchTerm) {
      data = data.filter((h) => h.address.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    data.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === 'bigint') {
          return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      }
      if (sortConfig.direction === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });
    return data;
  }, [processedData, searchTerm, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFilteredData.slice(start, start + PAGE_SIZE);
  }, [sortedAndFilteredData, currentPage]);
  
  const totalPages = Math.ceil(sortedAndFilteredData.length / PAGE_SIZE);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };
  
  const download = (filename, text, mime) => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${mime};charset=utf-8,` + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportCSV = () => {
    const headers = `${t("rank")},${t("address")},${t("balanceRaw")},${t("balanceHuman")},${t("supplyPercent")},${t("cumulativePercent")}`;
    const rows = processedData.holders.map(h => 
        `${h.rank},${h.address},${h.balance.toString()},${formatAmount(h.balance, assetData.decimals)},${h.percentage.toFixed(6)},${h.cumulative.toFixed(6)}`
    ).join('\n');
    download(`${assetId}_distribution.csv`, `${headers}\n${rows}`, 'text/csv');
  };

  const handleExportJSON = () => {
    download(`${assetId}_distribution.json`, JSON.stringify(processedData.holders, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2), 'application/json');
  };

  const isLoading = assetLoading || distributionLoading;
  const error = assetError || distributionError;
  const safeMaxHeight = Math.max(1, latestHeight - HEIGHT_BUFFER);
  const absoluteMinHeight = Math.max(1, latestHeight - MAX_ROLLBACK);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{t("assetDistributionTool")}</h1>
          <p className="text-gray-600 mt-1">{t("analyzeHolderDistribution")}</p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("comprehensiveAnalysis")}</AlertTitle>
        <AlertDescription>
          {t("fetchesAllHolders")} {t("forBestResults").replace("{buffer}", HEIGHT_BUFFER).replace("{current}", latestHeight || "...")}
          {latestHeight && ` ${t("validRange").replace("{min}", absoluteMinHeight).replace("{max}", safeMaxHeight)}.`}
        </AlertDescription>
      </Alert>

      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="asset-id" className="block text-sm font-medium text-gray-700 mb-1">{t("assetId")}</label>
              <Input
                id="asset-id"
                placeholder={t("enterAssetId")}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">{t("heightOptional")}</label>
              <Input
                id="height"
                type="number"
                placeholder={latestHeight ? t("defaultHeightValue").replace("{height}", safeMaxHeight) : t("loadingHeight")}
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                max={safeMaxHeight}
                min={absoluteMinHeight}
                disabled={heightLoading}
              />
            </div>
            <Button 
              onClick={handleFetch} 
              disabled={!assetId || isLoading || heightLoading || !latestHeight} 
              className="w-full md:w-auto"
            >
              {heightLoading ? t("loadingHeight") : isLoading ? t("fetching") : t("fetchDistribution")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {distributionLoading && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{t("fetchingData")}</p>
                <p className="text-sm text-gray-600">
                  {t("pagesFetched").replace("{pages}", fetchProgress.pages).replace("{holders}", fetchProgress.holders.toLocaleString())}
                  {fetchProgress.hasMore && ` • ${t("morePagesLoading")}`}
                </p>
              </div>
            </div>
            <Progress value={fetchProgress.hasMore ? 50 : 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errorOccurred")}</AlertTitle>
          <AlertDescription>
            {error.message || t("failedToFetchData")} 
            {latestHeight && (
              <span className="block mt-2">
                <strong>{t("troubleshooting")}:</strong>
                <br />{t("useHeightOrOlder").replace("{height}", safeMaxHeight).replace("{min}", absoluteMinHeight).replace("{max}", safeMaxHeight)}
                <br />{t("ensureCorrectAssetId")}
                <br />{t("tryOlderHeight").replace("{buffer}", HEIGHT_BUFFER).replace("{current}", latestHeight)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && !error && !distributionLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {processedData && !isLoading && (
        <div className="space-y-6">
            {/* Meta and Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-base">{t("asset")}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3 mb-2">
                            <AssetLogo assetId={assetData.assetId} size="md" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xl font-bold truncate">{assetData.name}</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 font-mono truncate">{truncate(assetData.assetId)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-base">{t("supply")}</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatAmount(assetData.quantity, assetData.decimals)}</p>
                        <p className="text-sm text-gray-500">{t("snapshotAt").replace("{height}", submittedHeight)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-base">{t("totalHolders")}</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{processedData.stats.holderCount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{t("uniqueAddresses")}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="text-base">{t("giniCoefficient")}</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{processedData.stats.gini.toFixed(4)}</p>
                        <p className="text-sm text-gray-500">
                          {processedData.stats.gini > 0.7 ? t("highConcentration") : processedData.stats.gini > 0.4 ? t("mediumConcentration") : t("lowConcentration")}
                        </p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>{t("holderTiers")}</CardTitle></CardHeader>
                <CardContent className="flex justify-around items-center text-center">
                    {Object.values(TIERS).map(tier => (
                        <div key={tier.name}>
                            <div className="text-4xl mb-2">{tier.emoji}</div>
                            <p className="text-xl font-bold mt-2">{processedData.stats.tierCounts[tier.name.toUpperCase()]}</p>
                            <p className="text-sm text-gray-500">{t(tier.name.toLowerCase() + "s")}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle>{t("holderList")} {t("totalInParens").replace("{total}", processedData.stats.holderCount.toLocaleString())}</CardTitle>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input placeholder={t("searchAddress")} className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
                            <Button variant="outline" onClick={handleExportJSON}><FileJson className="mr-2 h-4 w-4" />JSON</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('rank')}>{t("rank")} <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead>{t("address")}</TableHead>
                                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('balance')}>{t("balance")} <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('percentage')}>{t("supplyPercent")} <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('cumulative')}>{t("cumulativePercent")} <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length > 0 ? paginatedData.map(h => (
                                    <TableRow key={h.address}>
                                        <TableCell>{h.rank}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Link to={createPageUrl("Address", `?addr=${h.address}`)} className="font-mono text-sm text-blue-600">{h.address}</Link>
                                                <CopyButton text={h.address} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatAmount(h.balance, assetData.decimals)}</TableCell>
                                        <TableCell className="text-right">{h.percentage.toFixed(4)}%</TableCell>
                                        <TableCell className="text-right text-gray-500">{h.cumulative.toFixed(4)}%</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">{t("noResultsFound")}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Pagination */}
                    <div className="border-t p-4 flex items-center justify-between">
                         <span className="text-sm text-gray-600">
                            {t("showingHolders")
                              .replace("{from}", Math.min(1 + (currentPage-1)*PAGE_SIZE, sortedAndFilteredData.length))
                              .replace("{to}", Math.min(currentPage*PAGE_SIZE, sortedAndFilteredData.length))
                              .replace("{total}", sortedAndFilteredData.length)}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}><ChevronLeft className="mr-1 h-4 w-4"/> {t("prev")}</Button>
                            <span className="p-2 text-sm">{t("pageOf").replace("{current}", currentPage).replace("{total}", totalPages)}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>{t("next")} <ChevronRight className="ml-1 h-4 w-4"/></Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
