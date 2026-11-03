"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type AdminConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface DashboardEvent {
  type: "dashboard_event";
  event: "booking_created" | "booking_status_updated" | "payment_received" | "technician_assigned" | string;
  payload: any;
  timestamp?: string;
}

export function getWebSocketBaseUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8000";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && apiUrl.trim()) {
    const clean = apiUrl.trim().replace(/\/+$/, "");
    return clean.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
  }
  const isSecure = window.location.protocol === "https:";
  // Default fallback for local development
  return `${isSecure ? "wss" : "ws"}://${window.location.hostname}:8000`;
}

interface UseAdminWebSocketOptions {
  onEvent?: (event: DashboardEvent) => void;
  enabled?: boolean;
}

export function useAdminWebSocket(options: UseAdminWebSocketOptions = {}) {
  const { onEvent, enabled = true } = options;
  const [status, setStatus] = useState<AdminConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<DashboardEvent[]>([]);
  const [reconnectCount, setReconnectCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const manualReconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    setReconnectCount(0);
    setStatus("connecting");
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setStatus("disconnected");
      return;
    }

    let isMounted = true;
    let attempt = 0;

    function connect() {
      if (!isMounted) return;

      const token = localStorage.getItem("carspa_admin_token");
      if (!token) {
        setStatus("disconnected");
        return;
      }

      setStatus("connecting");
      const wsBase = getWebSocketBaseUrl();
      const wsUrl = `${wsBase}/ws/admin/dashboard/?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          attempt = 0;
          setReconnectCount(0);
          setStatus("connected");

          // Keep-alive heartbeat every 20 seconds
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
            }
          }, 20000);
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
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              };

              setLastEvent(evt);
              setUnreadCount((c) => c + 1);
              setRecentEvents((prev) => [evt, ...prev.slice(0, 24)]);

              if (onEventRef.current) {
                onEventRef.current(evt);
              }
            }
          } catch (e) {
            console.warn("Failed to parse admin dashboard websocket message", e);
          }
        };

        ws.onerror = () => {
          if (isMounted) setStatus("error");
        };

        ws.onclose = (event) => {
          if (!isMounted) return;
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // If code 4003: authorization rejected (not admin or invalid token)
          if (event.code === 4003) {
            setStatus("disconnected");
            return;
          }

          setStatus("disconnected");
          attempt += 1;
          setReconnectCount(attempt);

          // Reconnect with backoff capped at 8 seconds
          const delay = Math.min(2000 + attempt * 1500, 8000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, delay);
        };
      } catch (err) {
        if (isMounted) setStatus("error");
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
    status,
    isConnected: status === "connected",
    reconnectCount,
    lastEvent,
    unreadCount,
    recentEvents,
    clearUnread,
    manualReconnect,
  };
}
