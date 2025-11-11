
import React, { useState, useRef, useEffect } from "react";
import { blockchainAPI } from "../components/utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Network,
  PlayCircle,
  Trash2,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../components/contexts/LanguageContext";

export default function TransactionMap() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    assetId: "",
    treatAsNative: false,
    rootAddress: "",
    maxHops: 2,
    perAddressLimit: 200,
  });

  const [ui, setUi] = useState({
    loading: false,
    error: null,
    progress: "",
  });

  const [graph, setGraph] = useState({
    nodes: {},
    edges: [],
    hopsBuilt: 0,
  });

  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const visitedRef = useRef({ addresses: new Set(), txIds: new Set() });
  const rawCacheRef = useRef({});

  // Load Cytoscape.js on mount
  useEffect(() => {
    if (!window.cytoscape) {
      const script1 = document.createElement("script");
      script1.src = "https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js";
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src = "https://unpkg.com/cytoscape-fcose@2.2.0/cytoscape-fcose.js";
      script2.async = true;
      document.body.appendChild(script2);

      return () => {
        document.body.removeChild(script1);
        document.body.removeChild(script2);
      };
    }
  }, []);

  // Helper to check if address is valid (not an alias)
  const isValidAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return false;
    // Skip alias addresses (format: alias:X:name)
    if (addr.startsWith('alias:')) return false;
    // Valid addresses are typically 35 characters and start with '3'
    return addr.length >= 30 && addr.startsWith('3');
  };

  const parseTxsForAsset = (txArrays, { assetId, treatAsNative }) => {
    const flat = Array.isArray(txArrays?.[0]) ? txArrays.flat() : txArrays || [];
    const out = [];

    for (const t_item of flat) { // Renamed 't' to 't_item' to avoid conflict with i18n 't' function
      const type = t_item.type;
      const isNative = treatAsNative || t_item.assetId == null;

      // Skip if sender is an alias
      if (!isValidAddress(t_item.sender)) {
        continue;
      }

      // Simple transfer (type 4)
      if (type === 4) {
        const ok = assetId ? t_item.assetId === assetId : isNative;
        if (ok && isValidAddress(t_item.recipient)) {
          out.push({
            kind: "transfer",
            id: t_item.id,
            ts: t_item.timestamp,
            from: t_item.sender,
            to: t_item.recipient,
            amount: t_item.amount,
            fee: t_item.fee,
            assetId: t_item.assetId || null,
          });
        }
      }
      // Mass transfer (type 11)
      else if (type === 11) {
        const ok = assetId ? t_item.assetId === assetId : isNative;
        if (ok && Array.isArray(t_item.transfers)) {
          for (const it of t_item.transfers) {
            if (isValidAddress(it.recipient)) {
              out.push({
                kind: "mass",
                id: t_item.id,
                ts: t_item.timestamp,
                from: t_item.sender,
                to: it.recipient,
                amount: it.amount,
                fee: t_item.fee,
                assetId: t_item.assetId || null,
              });
            }
          }
        }
      }
      // Invoke-script payments (type 16)
      else if (type === 16) {
        const sc = t_item.stateChanges || {};
        const pays = sc.payments || [];
        for (const p of pays) {
          const ok = assetId
            ? p.assetId === assetId
            : p.assetId == null && (treatAsNative || true);
          const recipient = t_item.recipient || p.recipient || t_item.sender;
          if (ok && isValidAddress(recipient)) {
            out.push({
              kind: "invokePay",
              id: t_item.id,
              ts: t_item.timestamp,
              from: t_item.sender,
              to: recipient,
              amount: p.amount,
              fee: t_item.fee,
              assetId: p.assetId || null,
            });
          }
        }
      }
    }
    return out;
  };

  const buildGraph = async () => {
    const { assetId, treatAsNative, rootAddress, maxHops, perAddressLimit } = form;

    if (!rootAddress.trim()) {
      setUi({ loading: false, error: t("errorRootAddressRequired"), progress: "" });
      return;
    }

    // Validate root address
    if (!isValidAddress(rootAddress.trim())) {
      setUi({ loading: false, error: t("errorInvalidAddressFormat"), progress: "" });
      return;
    }

    setUi({ loading: true, error: null, progress: t("initializingProgress") });
    const newGraph = { nodes: {}, edges: [], hopsBuilt: 0 };
    visitedRef.current = { addresses: new Set(), txIds: new Set() };
    rawCacheRef.current = {};

    const Q = [{ addr: rootAddress.trim(), hop: 0 }];
    visitedRef.current.addresses.add(rootAddress.trim());

    const addNode = (a) => {
      if (!newGraph.nodes[a]) {
        newGraph.nodes[a] = { id: a, weight: 0 };
      }
    };

    const addEdge = (tx) => {
      const key = `${tx.id}:${tx.from}->${tx.to}`;
      if (!visitedRef.current.txIds.has(key)) {
        visitedRef.current.txIds.add(key);
        newGraph.edges.push({
          id: key,
          source: tx.from,
          target: tx.to,
          amount: tx.amount,
          ts: tx.ts,
          txid: tx.id,
        });
        newGraph.nodes[tx.from].weight += Number(tx.amount || 0);
        addNode(tx.to);
        newGraph.nodes[tx.to].weight += 0;
      }
    };

    try {
      let processed = 0;
      while (Q.length) {
        const { addr, hop } = Q.shift();
        processed++;
        
        setUi(prev => ({
          ...prev,
          progress: t("processingAddressProgress", { processed: processed, totalRemaining: processed + Q.length, hop: hop }),
        }));

        // Skip if not a valid address
        if (!isValidAddress(addr)) {
          console.warn(t("warningSkippingInvalidAddress", { address: addr }));
          continue;
        }

        addNode(addr);

        // Fetch or reuse txs
        let res = rawCacheRef.current[addr];
        if (!res) {
          try {
            res = await blockchainAPI.getAddressTransactions(addr, perAddressLimit);
            rawCacheRef.current[addr] = res;
          } catch (error) {
            console.warn(t("warningFailedToFetchTxs", { address: addr, message: error.message }));
            // Continue with other addresses even if one fails
            continue;
          }
        }

        const transfers = parseTxsForAsset(res, { assetId, treatAsNative });

        for (const tx of transfers) {
          // tx.from and tx.to are guaranteed to be valid addresses by parseTxsForAsset
          addNode(tx.from);
          addNode(tx.to);
          addEdge(tx);

          // Only add to Q if not visited and is a valid address (parseTxsForAsset already filtered it, but good to double check)
          if (hop + 1 <= maxHops && !visitedRef.current.addresses.has(tx.to) && isValidAddress(tx.to)) {
            visitedRef.current.addresses.add(tx.to);
            Q.push({ addr: tx.to, hop: hop + 1 });
          }
        }
      }

      newGraph.hopsBuilt = maxHops;
      setGraph(newGraph);
      setUi({ loading: false, error: null, progress: "" });

      // Render after state update
      setTimeout(() => renderGraph(newGraph), 100);
    } catch (error) {
      console.error(t("errorBuildingGraph"), error);
      setUi({
        loading: false,
        error: error.message || t("errorFailedToBuildGraph"),
        progress: "",
      });
    }
  };

  const renderGraph = (graphData) => {
    const container = containerRef.current;
    if (!container || !window.cytoscape) {
      console.warn(t("cytoscapeNotLoaded"));
      return;
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const nodes = Object.values(graphData.nodes).map((n) => ({
      data: { id: n.id, label: truncateAddress(n.id), weight: n.weight },
    }));

    const edges = graphData.edges.map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        amount: e.amount,
        ts: e.ts,
        txid: e.txid,
      },
    }));

    try {
      cyRef.current = window.cytoscape({
        container,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "font-size": "10px",
              "text-valign": "center",
              "text-halign": "center",
              "background-color": "#3b82f6",
              width: "mapData(weight, 0, 1e10, 20, 60)",
              height: "mapData(weight, 0, 1e10, 20, 60)",
              color: "#fff",
            },
          },
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#6366f1",
              "line-color": "#6366f1",
              width: "mapData(amount, 0, 1e9, 1, 8)",
              "line-opacity": 0.5,
            },
          },
          {
            selector: ":selected",
            style: {
              "border-width": 3,
              "border-color": "#ef4444",
            },
          },
        ],
        layout: {
          name: window.cytoscapeFcose ? "fcose" : "cose",
          quality: "proof",
          randomize: true,
          packComponents: true,
          nodeSeparation: 100,
        },
      });

      // Click handlers
      cyRef.current.on("tap", "edge", (evt) => {
        const d = evt.target.data();
        const info = `Tx: ${d.txid}\nAmount: ${d.amount}\nTime: ${new Date(d.ts).toISOString()}`;
        navigator.clipboard.writeText(d.txid);
        alert(`${t("txIdCopied")}\n\n${info}`);
      });

      cyRef.current.on("tap", "node", (evt) => {
        const id = evt.target.data("id");
        navigator.clipboard.writeText(id);
        alert(`${t("addressCopied")}: ${id}`);
      });
    } catch (error) {
      console.error(t("errorRenderingGraph"), error);
      setUi(prev => ({ ...prev, error: t("errorFailedToRenderGraph") }));
    }
  };

  const clearGraph = () => {
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
    setGraph({ nodes: {}, edges: [], hopsBuilt: 0 });
    visitedRef.current = { addresses: new Set(), txIds: new Set() };
    rawCacheRef.current = {};
    setUi({ loading: false, error: null, progress: "" });
  };

  const truncateAddress = (addr) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const nodeCount = Object.keys(graph.nodes).length;
  const edgeCount = graph.edges.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("transactionMapTitle")}</h1>
        <p className="text-gray-600">{t("visualizeTransactionFlow")}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("demoDataNote")}</AlertTitle>
        <AlertDescription>
          {t("demoDataDescription")}
        </AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            {t("graphConfigurationTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetId">{t("assetIdLabel")}</Label>
              <Input
                id="assetId"
                placeholder={t("assetIdPlaceholder")}
                value={form.assetId}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    assetId: val,
                    treatAsNative: val.trim() === "",
                  });
                }}
                disabled={ui.loading}
              />
            </div>

            <div>
              <Label htmlFor="rootAddress">{t("rootAddressLabel")}</Label>
              <Input
                id="rootAddress"
                placeholder={t("startingAddressPlaceholder")}
                value={form.rootAddress}
                onChange={(e) => setForm({ ...form, rootAddress: e.target.value })}
                disabled={ui.loading}
              />
            </div>

            <div>
              <Label htmlFor="maxHops">{t("maxHopsLabel")}</Label>
              <Input
                id="maxHops"
                type="number"
                min="1"
                max="4"
                value={form.maxHops}
                onChange={(e) =>
                  setForm({ ...form, maxHops: parseInt(e.target.value) || 2 })
                }
                disabled={ui.loading}
              />
            </div>

            <div>
              <Label htmlFor="perAddressLimit">{t("txPerAddressLimitLabel")}</Label>
              <Input
                id="perAddressLimit"
                type="number"
                min="50"
                max="500"
                value={form.perAddressLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    perAddressLimit: parseInt(e.target.value) || 200,
                  })
                }
                disabled={ui.loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="treatAsNative"
              checked={form.treatAsNative}
              onCheckedChange={(checked) =>
                setForm({ ...form, treatAsNative: checked })
              }
              disabled={ui.loading}
            />
            <Label htmlFor="treatAsNative">{t("treatAsNativeLabel")}</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={buildGraph}
              disabled={ui.loading || !form.rootAddress.trim()}
              className="flex-1"
            >
              {ui.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("buildingButton")}
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {t("buildMapButton")}
                </>
              )}
            </Button>
            <Button
              onClick={clearGraph}
              variant="outline"
              disabled={ui.loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("clearButton")}
            </Button>
          </div>

          {ui.progress && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {ui.progress}
            </div>
          )}

          {ui.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{ui.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {nodeCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{t("addressesCountLabel")}</p>
              <p className="text-2xl font-bold">{nodeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{t("transfersCountLabel")}</p>
              <p className="text-2xl font-bold">{edgeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{t("hopsExploredLabel")}</p>
              <p className="text-2xl font-bold">{graph.hopsBuilt}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graph Visualization */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t("transactionGraphTitle")}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{t("nodeIsAddress")}</Badge>
              <Badge variant="outline">{t("edgeIsTransfer")}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div
            ref={containerRef}
            id="tx-graph"
            className="w-full bg-gray-50 rounded-lg border"
            style={{ height: "70vh", minHeight: "500px" }}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">{t("legendTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>{t("legendNodeSize")}</p>
          <p>{t("legendEdgeWidth")}</p>
          <p>{t("legendClickEdge")}</p>
          <p>{t("legendClickNode")}</p>
          <p>{t("legendDragNodes")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
