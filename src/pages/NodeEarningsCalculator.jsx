import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calculator,
  TrendingUp,
  Coins,
  Calendar,
  Percent,
  RotateCcw,
  Info,
  PieChart,
  Blocks,
} from "lucide-react";
import { useLanguage } from "../components/contexts/LanguageContext";

export default function NodeEarningsCalculator() {
  const { t } = useLanguage();
  const [dccStaked, setDccStaked] = useState(10000);
  const [ownershipPercent, setOwnershipPercent] = useState(100);

  // Constants (hard-coded)
  const Tb = 60; // Block time in seconds
  const Bd = 1440; // Blocks per day
  const Rb = 1; // Block reward in DCC
  const pi = 1.0; // Participation score (100% uptime)
  const Seff = 500000; // Total effective stake

  // Calculate results
  const results = useMemo(() => {
    // Validate inputs
    if (Seff <= 0) {
      return {
        valid: false,
        error: "Network stake unavailable",
        stakeShare: 0,
        expectedBlocksPerDay: 0,
        earningsDay: 0,
        earningsMonth: 0,
        earningsYear: 0,
        principal: 0,
        apy: 0,
      };
    }

    const Si = Math.max(0, Number(dccStaked) || 0);
    const w = Math.max(0, Math.min(100, Number(ownershipPercent) || 0)) / 100;

    // Core calculations
    const stakeShare = (Si * pi) / Seff;
    const expectedBlocksPerDay = Bd * stakeShare;

    // Owner earnings
    const earningsDay = w * Bd * (Si * pi / Seff) * Rb;
    const earningsMonth = earningsDay * 30;
    const earningsYear = earningsDay * 365;

    // Owner principal
    const principal = w * Si;

    // Simple APY
    const apy = principal > 0 ? (earningsYear / principal) * 100 : 0;

    return {
      valid: true,
      error: null,
      stakeShare: stakeShare * 100, // Convert to percentage
      expectedBlocksPerDay,
      earningsDay,
      earningsMonth,
      earningsYear,
      principal,
      apy,
    };
  }, [dccStaked, ownershipPercent, Seff, Bd, Rb, pi]);

  const handleReset = () => {
    setDccStaked(10000);
    setOwnershipPercent(100);
  };

  const handleDccStakedChange = (e) => {
    const value = e.target.value;
    if (value === "" || !isNaN(value)) {
      setDccStaked(value === "" ? 0 : Number(value));
    }
  };

  const handleOwnershipPercentChange = (e) => {
    const value = e.target.value;
    if (value === "" || !isNaN(value)) {
      const num = value === "" ? 0 : Number(value);
      setOwnershipPercent(Math.max(0, Math.min(100, num)));
    }
  };

  const StatCard = ({ title, value, unit, icon: Icon, gradient }) => (
    <Card className={`border-none shadow-lg ${gradient}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <div className="p-2 bg-white/50 rounded-lg">
            <Icon className="w-4 h-4 text-gray-700" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? value.toFixed(2) : value}
          {unit && <span className="text-lg ml-1 text-gray-600">{unit}</span>}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Calculator className="w-10 h-10 text-blue-600" />
          Node Earnings Calculator
        </h1>
        <p className="text-gray-600">
          Estimate your expected DCC earnings based on staked amount and ownership percentage
        </p>
      </div>

      {/* Calculator Card */}
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculator Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* DCC Staked Input */}
          <div className="space-y-2">
            <Label htmlFor="dccStaked" className="text-base font-semibold">
              DCC Staked (Locked)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="dccStaked"
                type="number"
                min="0"
                step="1000"
                value={dccStaked}
                onChange={handleDccStakedChange}
                className="text-lg"
                placeholder="Enter DCC amount"
              />
              <Coins className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              Total amount of DCC tokens locked in the node
            </p>
          </div>

          {/* Ownership Percentage */}
          <div className="space-y-4">
            <Label htmlFor="ownership" className="text-base font-semibold">
              Ownership Percentage
            </Label>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <Slider
                  id="ownership"
                  min={0}
                  max={100}
                  step={1}
                  value={[ownershipPercent]}
                  onValueChange={(value) => setOwnershipPercent(value[0])}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 w-32">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={ownershipPercent}
                  onChange={handleOwnershipPercentChange}
                  className="text-center"
                />
                <Percent className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Your ownership share of the node (0-100%)
            </p>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {!results.valid && (
        <Alert variant="destructive">
          <Info className="w-4 h-4" />
          <AlertDescription>{results.error}</AlertDescription>
        </Alert>
      )}

      {/* Results Grid */}
      {results.valid && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Stake Share"
              value={results.stakeShare}
              unit="%"
              icon={PieChart}
              gradient="bg-gradient-to-br from-blue-50 to-blue-100"
            />
            <StatCard
              title="Est. Blocks/Day"
              value={results.expectedBlocksPerDay}
              icon={Blocks}
              gradient="bg-gradient-to-br from-purple-50 to-purple-100"
            />
            <StatCard
              title="Principal (Locked DCC)"
              value={results.principal}
              unit="DCC"
              icon={Coins}
              gradient="bg-gradient-to-br from-indigo-50 to-indigo-100"
            />
            <StatCard
              title="APY (Simple)"
              value={results.apy}
              unit="%"
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-green-50 to-green-100"
            />
          </div>

          {/* Earnings Cards */}
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Earnings Projections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <p className="text-sm font-semibold text-gray-700">Daily</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">
                    {results.earningsDay.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">DCC per day</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm font-semibold text-gray-700">Monthly</p>
                  </div>
                  <p className="text-3xl font-bold text-yellow-700">
                    {results.earningsMonth.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">DCC per month (30 days)</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-700">Yearly</p>
                  </div>
                  <p className="text-3xl font-bold text-green-700">
                    {results.earningsYear.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">DCC per year (365 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Assumptions */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-gray-700">
          <strong>Assumptions:</strong> 1 DCC/block, 1 block/60s, S<sub>eff</sub>=500,000 DCC, uptime=100%, fees excluded.
        </AlertDescription>
      </Alert>
    </div>
  );
}