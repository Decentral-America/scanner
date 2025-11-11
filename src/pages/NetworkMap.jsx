
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../components/utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Info, Globe } from "lucide-react";
import { useLanguage } from "../components/contexts/LanguageContext";

// Mock geolocation data for demonstration
// In production, this would come from a geolocation API
const MOCK_GEO_DATA = {
  // Some example coordinates for major cities
  "default": { lat: 40.7128, lng: -74.0060, city: "New York" },
  "eu": { lat: 51.5074, lng: -0.1278, city: "London" },
  "asia": { lat: 35.6762, lng: 139.6503, city: "Tokyo" },
  "aus": { lat: -33.8688, lng: 151.2093, city: "Sydney" },
};

function getRegionFromIP(ip) {
  // Very simplistic region detection for demo purposes
  if (ip.startsWith("88.") || ip.startsWith("185.")) return "eu";
  if (ip.startsWith("61.") || ip.startsWith("202.")) return "asia";
  if (ip.startsWith("203.")) return "aus";
  return "default";
}

export default function NetworkMap() {
  const { t } = useLanguage();

  const { data: connectedPeers, isLoading } = useQuery({
    queryKey: ["peers", "connected"],
    queryFn: () => blockchainAPI.getConnectedPeers(),
  });

  const { data: allPeers } = useQuery({
    queryKey: ["peers", "all"],
    queryFn: () => blockchainAPI.getAllPeers(),
  });

  const geolocatedPeers = useMemo(() => {
    if (!connectedPeers?.peers) return [];
    
    return connectedPeers.peers.map((peer) => {
      const ip = peer.address?.split(":")[0] || "";
      const region = getRegionFromIP(ip);
      const location = MOCK_GEO_DATA[region];
      
      // Add some random offset to prevent exact overlaps
      const latOffset = (Math.random() - 0.5) * 2;
      const lngOffset = (Math.random() - 0.5) * 2;
      
      return {
        ...peer,
        lat: location.lat + latOffset,
        lng: location.lng + lngOffset,
        city: location.city,
      };
    });
  }, [connectedPeers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("networkMapTitle")}</h1>
        <p className="text-gray-600">
          {t("geographicalDistribution")}
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("demoMode")}</AlertTitle>
        <AlertDescription>
          {t("simulatedData")}
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t("connectedPeers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {isLoading ? "..." : connectedPeers?.peers?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t("allKnownPeers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {allPeers?.peers?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t("regionsSimulated")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Object.keys(MOCK_GEO_DATA).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle>{t("peerDistribution")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <div className="h-[600px] w-full">
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {geolocatedPeers.map((peer, index) => (
                  <CircleMarker
                    key={index}
                    center={[peer.lat, peer.lng]}
                    radius={8}
                    fillColor="#3b82f6"
                    fillOpacity={0.6}
                    stroke={true}
                    color="#1e40af"
                    weight={2}
                  >
                    <Popup>
                      <div className="p-2">
                        <p className="font-semibold text-sm mb-1">
                          {peer.nodeName || t("unknownNode")}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          <strong>{t("addressColon")}</strong> {peer.address}
                        </p>
                        <p className="text-xs text-gray-600">
                          <strong>{t("locationColon")}</strong> {peer.city} {t("simulated")}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peer List */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>{t("connectedPeersList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : geolocatedPeers.length > 0 ? (
              geolocatedPeers.map((peer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {peer.nodeName || t("unknownNode")}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {peer.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{peer.city}</p>
                    <p className="text-xs text-gray-400">{t("simulated")}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                {t("noPeersFound")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
