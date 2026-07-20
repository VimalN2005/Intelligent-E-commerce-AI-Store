import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [stockOverrides, setStockOverrides] = useState({});
  const [connected, setConnected] = useState(false);
  const [stockAlerts, setStockAlerts] = useState([]);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = () => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log('[WS-Client] Connecting to WebSocket stock server...');
    const wsUrl = 'ws://localhost:5001';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS-Client] Connection established.');
      setConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[WS-Client] Received message:', payload);
        
        if (payload.type === 'STOCK_UPDATE') {
          const { productId, productName, stock, msg } = payload.data;
          
          // Update local stock overrides state
          setStockOverrides((prev) => ({
            ...prev,
            [productId]: stock,
          }));

          // Trigger screen toast alert
          const alertMessage = msg || `Stock updated: product ID #${productId} is now ${stock} units.`;
          const newAlert = {
            id: Date.now() + Math.random(),
            message: alertMessage,
            productId,
            stock,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setStockAlerts((prev) => [newAlert, ...prev].slice(0, 5)); // Keep last 5 alerts
          
          // Remove alert after 4 seconds
          setTimeout(() => {
            setStockAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
          }, 4000);
        }
      } catch (err) {
        console.error('[WS-Client] Error handling message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS-Client] Connection closed. Attempting reconnect in 5s...');
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    ws.onerror = (err) => {
      console.error('[WS-Client] WebSocket error occurred:', err);
      ws.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ stockOverrides, connected, stockAlerts }}>
      {children}
    </WebSocketContext.Provider>
  );
};
