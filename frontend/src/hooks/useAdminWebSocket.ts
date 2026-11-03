"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface DashboardEvent {
  type: "dashboard_event";
  event: "booking_created" | "booking_status_updated" | "payment_received" | "technician_assigned" | string;
  payload: any;
  timestamp?: string;
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

interface UseAdminWebSocketOptions {
  onEvent?: (event: DashboardEvent) => void;
  enabled?: boolean;
}

export function useAdminWebSocket(options: UseAdminWebSocketOptions = {}) {
  const { onEvent, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<DashboardEvent[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const token = localStorage.getItem("carspa_admin_token");
      if (!token) {
        setIsConnected(false);
        return;
      }

      const wsBase = getWebSocketBaseUrl();
      const wsUrl = `${wsBase}/ws/admin/dashboard/?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);

          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "dashboard_event") {
              const evt: DashboardEvent = {
                type: "dashboard_event",
                event: data.event,
                payload: data.payload || data,
                timestamp: new Date().toLocaleTimeString(),
              };

              setLastEvent(evt);
              setUnreadCount((c) => c + 1);
              setRecentEvents((prev) => [evt, ...prev.slice(0, 19)]);

              if (onEventRef.current) {
                onEventRef.current(evt);
              }
            }
          } catch (e) {
            console.warn("Failed to parse admin dashboard websocket message", e);
          }
        };

        ws.onerror = () => {
          if (isMounted) setIsConnected(false);
        };

        ws.onclose = (event) => {
          if (!isMounted) return;
          setIsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // If not rejected for auth error (4003), attempt reconnect
          if (event.code !== 4003) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3500);
          }
        };
      } catch (err) {
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [enabled]);

  return {
    isConnected,
    lastEvent,
    unreadCount,
    recentEvents,
    clearUnread,
  };
}
