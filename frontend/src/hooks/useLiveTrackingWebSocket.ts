"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface LatLngPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface VanLocationState {
  lat: number;
  lng: number;
  speed_kmh: number;
  heading_deg?: number;
  eta_minutes: number;
  step?: number;
  total_steps?: number;
  is_arrived?: boolean;
  van_plate?: string;
  status_note?: string;
}

export interface TrackingRoute {
  depot: LatLngPoint;
  destination: LatLngPoint;
}

export interface TrackingSnapshot {
  booking_reference: string;
  status: string;
  status_display: string;
  customer_name: string;
  service_package: string;
  vehicle_type: string;
  service_date: string;
  slot_window: string;
  address: string;
  locality: string;
  technician: {
    name: string;
    phone: string;
  };
  route: TrackingRoute;
  van_location: VanLocationState;
}

function getWebSocketBaseUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8000";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
  }
  const isSecure = window.location.protocol === "https:";
  return `${isSecure ? "wss" : "ws"}://${window.location.hostname}:8000`;
}

export function useLiveTrackingWebSocket(bookingReference: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [vanLocation, setVanLocation] = useState<VanLocationState | null>(null);
  const [route, setRoute] = useState<TrackingRoute | null>(null);
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);

  const cleanReference = bookingReference?.trim().replace(/^#/, "");

  const startSimulation = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setIsSimulating(true);
      socketRef.current.send(JSON.stringify({ type: "start_simulation" }));
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "request_location" }));
    }
  }, []);

  useEffect(() => {
    const targetRef = cleanReference;
    if (!targetRef) {
      setSnapshot(null);
      setVanLocation(null);
      setRoute(null);
      setIsConnected(false);
      return;
    }

    const validReference: string = targetRef;
    shouldConnectRef.current = true;

    function connect() {
      if (!shouldConnectRef.current) return;

      const wsBase = getWebSocketBaseUrl();
      const wsUrl = `${wsBase}/ws/tracking/${encodeURIComponent(validReference)}/`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);

          // Ping heartbeat every 25 seconds to keep connection alive
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "tracking_snapshot") {
              setSnapshot(data);
              if (data.van_location) setVanLocation(data.van_location);
              if (data.route) setRoute(data.route);
            } else if (data.type === "van_location_update") {
              const loc = data.location || data.van_location;
              if (loc) {
                setVanLocation((prev) => ({
                  ...prev,
                  ...loc,
                }));
                if (loc.is_arrived) {
                  setIsSimulating(false);
                }
              }
            } else if (data.type === "tracking_event") {
              setLastEvent(data);
              if (data.status) {
                setSnapshot((prev) => (prev ? { ...prev, status: data.status, status_display: data.status_display || data.status } : null));
              }
            }
          } catch (e) {
            console.warn("Failed to parse tracking websocket payload", e);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // Reconnect unless reference changed or component unmounted
          if (shouldConnectRef.current && event.code !== 4004) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3000);
          } else if (event.code === 4004) {
            setConnectionError("Tracking stream not found for this reference.");
          }
        };
      } catch (err: any) {
        setIsConnected(false);
        setConnectionError(err.message || "Failed to establish WebSocket connection.");
      }
    }

    connect();

    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [cleanReference]);

  return {
    isConnected,
    snapshot,
    vanLocation,
    route,
    lastEvent,
    isSimulating,
    connectionError,
    startSimulation,
    requestLocation,
  };
}
