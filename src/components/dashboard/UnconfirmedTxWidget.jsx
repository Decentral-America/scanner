import React from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { truncate, timeAgo } from "../utils/formatters";
import { Clock, ArrowRight } from "lucide-react";

export default function UnconfirmedTxWidget() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["unconfirmedTransactions"],
    queryFn: () => blockchainAPI.getUnconfirmedTransactions(),
    refetchInterval: 10000,
  });

  const recentTxs = transactions?.slice(0, 5) || [];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Unconfirmed Transactions
        </CardTitle>
        <Link to={createPageUrl("UnconfirmedTransactions")}>
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Badge variant="secondary" className="text-lg">
            {isLoading ? "..." : transactions?.length || 0} Pending
          </Badge>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : recentTxs.length > 0 ? (
            recentTxs.map((tx) => (
              <Link
                key={tx.id}
                to={createPageUrl("Transaction", `?id=${tx.id}`)}
                className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium truncate">
                      {truncate(tx.id, 12)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {tx.type}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <Badge variant="outline" className="text-xs">
                      {timeAgo(tx.timestamp)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4 text-sm">
              No unconfirmed transactions
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}