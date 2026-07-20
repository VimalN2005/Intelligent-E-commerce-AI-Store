require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5001;

// Enable CORS and parsing
app.use(cors());
app.use(bodyParser.json());

// Express REST Endpoint for Django Webhook
app.post('/api/update-stock', (req, res) => {
  const { product_id, product_name, stock, price, image_url } = req.body;
  
  if (!product_id || stock === undefined) {
    return res.status(400).json({ error: 'product_id and stock are required.' });
  }

  console.log(`[Django Sync] Stock update received: Product #${product_id} (${product_name}) -> Stock: ${stock}`);

  // Broadcast update to all WebSocket clients
  broadcast({
    type: 'STOCK_UPDATE',
    data: {
      productId: product_id,
      productName: product_name,
      stock: parseInt(stock, 10),
      price: price,
      imageUrl: image_url
    }
  });

  return res.status(200).json({ success: true, message: 'Stock update broadcasted.' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', clients: wss.clients.size });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket client management
wss.on('connection', (ws) => {
  console.log(`[WS] New client connected. Total clients: ${wss.clients.size}`);
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    message: 'Successfully connected to Aetheria Real-time Stock Feed'
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      console.log(`[WS] Received message from client:`, parsed);
      
      // Client heartbeat ping
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      console.error('[WS] Error parsing client message:', e.message);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected. Total clients: ${wss.clients.size}`);
  });
});

// Heartbeat check interval (30s)
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[WS] Terminating dead client connection.');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Broadcast helper function
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ---------------- SIMULATOR FOR DEMO TRAFFIC ----------------
const simulateTraffic = process.env.SIMULATE_TRAFFIC === 'true';
if (simulateTraffic) {
  console.log('[Simulator] Live purchase simulation is ENABLED.');
  
  // Array of seed IDs corresponding to Django products
  const productIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const stocks = {
    1: 25, 2: 40, 3: 15, 4: 8, 5: 30, 6: 50, 7: 12, 8: 60, 9: 20, 10: 18
  };

  setInterval(() => {
    if (wss.clients.size === 0) return; // Only simulate when users are browsing

    // Select random product
    const randomIdx = Math.floor(Math.random() * productIds.length);
    const prodId = productIds[randomIdx];
    
    // Random fluctuation: usually purchases (decrease stock), sometimes restocking (increase)
    const changeType = Math.random() > 0.85 ? 'RESTOCK' : 'PURCHASE';
    
    if (changeType === 'PURCHASE') {
      if (stocks[prodId] > 0) {
        stocks[prodId] -= 1;
        console.log(`[Simulator] Simulated Purchase: Product #${prodId}. Stock decremented to ${stocks[prodId]}`);
        broadcast({
          type: 'STOCK_UPDATE',
          data: {
            productId: prodId,
            stock: stocks[prodId],
            simulated: true,
            msg: `Someone just purchased an item!`
          }
        });
      }
    } else {
      stocks[prodId] += 5; // restock
      console.log(`[Simulator] Simulated Restock: Product #${prodId}. Stock incremented to ${stocks[prodId]}`);
      broadcast({
        type: 'STOCK_UPDATE',
        data: {
          productId: prodId,
          stock: stocks[prodId],
          simulated: true,
          msg: `New stock arrived for this popular item!`
        }
      });
    }
  }, 10000); // Trigger simulation every 10 seconds
}

// Start Server
server.listen(port, () => {
  console.log(`🚀 Real-time Stock Server listening on port ${port}`);
});
