"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Play, CheckCircle2, MapPin, Gauge, Shield, Clock } from "lucide-react";
import { VanLocationState, TrackingRoute } from "@/hooks/useLiveTrackingWebSocket";

interface LiveVanMapProps {
  route: TrackingRoute | null;
  vanLocation: VanLocationState | null;
  isConnected: boolean;
  isSimulating: boolean;
  onStartSimulation: () => void;
  bookingReference: string;
}

export default function LiveVanMap({
  route,
  vanLocation,
  isConnected,
  isSimulating,
  onStartSimulation,
  bookingReference,
}: LiveVanMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{
    depot?: any;
    destination?: any;
    van?: any;
    routeLine?: any;
  }>({});
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Leaflet map safely on client side
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const defaultCenter: [number, number] = [30.7046, 76.7179]; // Tricity area
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter tiles (free, dark-mode automotive aesthetic)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      mapInstanceRef.current = map;
      if (isMounted) setMapLoaded(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers, Route Polyline, and Van position
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    let isMounted = true;

    async function updateOverlays() {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      if (!map || !isMounted) return;

      const depotCoords = route?.depot || { lat: 30.6865, lng: 76.7412 };
      const destCoords = route?.destination || { lat: 30.7333, lng: 76.7794 };
      const vanCoords = vanLocation || { lat: depotCoords.lat, lng: depotCoords.lng };

      // 1. Depot Marker
      if (!markersRef.current.depot) {
        const depotIcon = L.divIcon({
          className: "custom-depot-marker",
          html: `
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div style="background:#0F172A; border:2px solid #38BDF8; color:#38BDF8; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px rgba(56,189,248,0.5);">
                <span style="font-size:16px;">🏢</span>
              </div>
              <div style="background:#0B1220; border:1px solid #38BDF8; color:#38BDF8; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:9999px; margin-top:2px; white-space:nowrap;">
                CARSPA Hub
              </div>
            </div>
          `,
          iconSize: [40, 50],
          iconAnchor: [20, 25],
        });
        markersRef.current.depot = L.marker([depotCoords.lat, depotCoords.lng], { icon: depotIcon })
          .addTo(map)
          .bindPopup("<b>CARSPA Central Detailing Depot</b><br/>Equipped with mobile steam & water units.");
      }

      // 2. Customer Destination Marker
      if (!markersRef.current.destination) {
        const destIcon = L.divIcon({
          className: "custom-dest-marker",
          html: `
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div style="background:#10B981; border:2px solid #FFFFFF; color:#FFFFFF; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px rgba(16,185,129,0.6);">
                <span style="font-size:16px;">📍</span>
              </div>
              <div style="background:#064E3B; border:1px solid #10B981; color:#A7F3D0; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:9999px; margin-top:2px; white-space:nowrap;">
                Doorstep Destination
              </div>
            </div>
          `,
          iconSize: [40, 50],
          iconAnchor: [20, 25],
        });
        markersRef.current.destination = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Customer Doorstep</b><br/>${route?.destination?.name || "Service Location"}`);
      }

      // 3. Route Polyline
      if (!markersRef.current.routeLine) {
        markersRef.current.routeLine = L.polyline(
          [
            [depotCoords.lat, depotCoords.lng],
            [destCoords.lat, destCoords.lng],
          ],
          {
            color: "#00F0FF",
            weight: 4,
            opacity: 0.7,
            dashArray: "6, 8",
          }
        ).addTo(map);

        // Fit map bounds to encompass the entire route nicely
        const bounds = L.latLngBounds([
          [depotCoords.lat, depotCoords.lng],
          [destCoords.lat, destCoords.lng],
        ]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }

      // 4. Detailing Van Live Marker
      const isArrived = vanLocation?.is_arrived || (vanLocation?.eta_minutes === 0 && vanLocation?.step === 10);
      const vanIconHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
          <div style="position:relative;">
            ${
              !isArrived
                ? `<div style="position:absolute; inset:-6px; border-radius:50%; background:#00F0FF; opacity:0.4; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ""
            }
            <div style="position:relative; background:linear-gradient(135deg, #0284C7, #0369A1); border:2px solid #00F0FF; color:#FFFFFF; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px #00F0FF;">
              <span style="font-size:20px;">🚐</span>
            </div>
          </div>
          <div style="background:#0B1220; border:1px solid #00F0FF; color:#00F0FF; font-size:10px; font-weight:800; padding:2px 8px; border-radius:9999px; margin-top:4px; box-shadow:0 4px 10px rgba(0,0,0,0.5); white-space:nowrap; letter-spacing:0.5px;">
            ${isArrived ? "ARRIVED" : `${vanLocation?.eta_minutes ?? 12} MINS`}
          </div>
        </div>
      `;

      const vanIcon = L.divIcon({
        className: "custom-van-marker",
        html: vanIconHtml,
        iconSize: [50, 60],
        iconAnchor: [25, 30],
      });

      if (!markersRef.current.van) {
        markersRef.current.van = L.marker([vanCoords.lat, vanCoords.lng], { icon: vanIcon }).addTo(map);
      } else {
        markersRef.current.van.setLatLng([vanCoords.lat, vanCoords.lng]);
        markersRef.current.van.setIcon(vanIcon);
      }
    }

    updateOverlays();
  }, [mapLoaded, route, vanLocation]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-[#0B1220] shadow-2xl">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Live Status Badge */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#060B13]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-500/30 shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="text-xs font-bold text-white tracking-wide">
            {isConnected ? "Live GPS Connected" : "Connecting GPS..."}
          </span>
          <span className="text-[10px] text-cyan-400 font-mono hidden sm:inline">
            (Django Channels + WebSocket)
          </span>
        </div>

        {/* Live Van Metrics Pill */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#060B13]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-white">
              {vanLocation?.speed_kmh ? `${vanLocation.speed_kmh} km/h` : "Stationary"}
            </span>
          </div>
          <div className="h-3 w-px bg-white/20" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">
              {vanLocation?.is_arrived ? (
                <span className="text-emerald-400 font-bold">Arrived</span>
              ) : (
                `ETA ~${vanLocation?.eta_minutes ?? 15}m`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Leaflet Map DOM Canvas */}
      <div
        ref={mapContainerRef}
        style={{ height: "380px", width: "100%" }}
        className="z-0 bg-[#060B13]"
      />

      {/* Bottom Van Detailing Bar & Simulation Controller */}
      <div className="p-4 bg-gradient-to-r from-[#0F172A] via-[#0B1220] to-[#0F172A] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {vanLocation?.van_plate || "CH-01-CS-7087"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                Mobile Detailing Van #1
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {vanLocation?.status_note || "Equipped with high-pressure steam, deionized water & ceramic kit."}
            </p>
          </div>
        </div>

        {/* Interactive Simulation Trigger Button for Demo/Evaluation */}
        <button
          type="button"
          disabled={!isConnected || isSimulating}
          onClick={onStartSimulation}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          {isSimulating ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span>Van Driving En-Route...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Live Van Drive</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
