let socket: WebSocket | null = null;

export const connectWebSocket = (onMessage: (data: any) => void) => {
  if (socket) return;
  
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('[WebSocket] Connected');
  };

  socket.onmessage = (event) => {
    try {
      const parsedData = JSON.parse(event.data);
      onMessage(parsedData);
    } catch (e) {
      console.error('[WebSocket] Failed to parse message:', e);
    }
  };

  socket.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
  };

  socket.onclose = () => {
    console.log('[WebSocket] Disconnected');
    socket = null;
  };
};

export const sendWebSocketMessage = (message: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn('[WebSocket] Not connected');
  }
};

export const closeWebSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};
