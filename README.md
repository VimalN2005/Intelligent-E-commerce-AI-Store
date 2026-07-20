# Aetheria | Intelligent E-Commerce Store & AI Product Assistant

Welcome to **Aetheria**, a production-grade, portfolio-ready Intelligent E-Commerce platform. This project integrates full-stack architecture, real-time inventory synchronization, visual/text similarity matching, and a generative AI chatbot assistant.

---

## 🏗️ System Architecture

The application is structured as a multi-service containerized architecture:

```
                  +-----------------------------------+
                  |        React SPA Frontend         |
                  |           (Vite / Port 3000)      |
                  +-------+-------------------+-------+
                          |                   |
               REST API   |                   |   WebSocket Stock Feed
               (Port 8000)|                   |   (Port 5001)
                          v                   v
              +-----------+-------+   +-------+-----------+
              |  Django REST API  |   | Node.js WS Server |
              |  (Backend Server) |   | (Real-time stock) |
              +-----------+-------+   +-------+-----------+
                          |                   ^
             Signals/Post |                   | Sync Webhook
             Webhooks     +-------------------+
                          |
              +-----------+-----------+
              |    Gemini AI Engine   |
              | (Embeddings & Chatbot)|
              +-----------------------+
```

---

## 🌟 Key Features

1. **Product Catalog & Interactive Cart**: A fluid, modern glassmorphic interface built using React and custom CSS variables, supporting category filters and search.
2. **Real-time Stock Synchronization**:
   - Stock modifications in the **Django Admin** trigger custom signals.
   - Signals POST to a high-speed **Node.js Webhook Server** which broadcasts changes to all active clients via **WebSockets**.
   - Front-end products update their stock indicators instantly without page refreshes, styled with attention-grabbing animations.
   - *Traffic Simulator*: A background script in the Node server simulates randomized user transactions (decrease/restock) every 10 seconds to showcase live WebSocket updates.
3. **AI Chatbot Assistant**:
   - Floating assistant widget utilizing the Gemini API (`gemini-1.5-flash`) for tailored product recommendations and copy editing (description generator).
   - Context windowing: The backend automatically serializes the live database catalogue and passes it to the AI for accurate, linkable recommendations.
   - *Intelligent Offline Fallback*: Fully functional rule-based conversation router, intent handler, and template description generator when offline/without API keys.
4. **Vector Recommendation Engine**:
   - Calculates item-to-item text similarity. Click "Find Similar" on any product to query the `/api/products/<id>/similar/` endpoint, returning closest vector matches.
5. **Image Visual Search**:
   - Upload any image to query the visual similarity engine.
   - Evaluates a 3-dimensional color histogram (512-bin RGB layout) to match visual patterns (colors, textures, general tones) with catalog products using cosine similarity.
6. **Containerized Deployment**:
   - Configured with Docker and Docker Compose for easy scaling and deployment.

---

## 📂 Directory Structure

```
intelligent-ecommerce/
├── django_backend/          # Django project (REST APIs, Models, Embeddings)
│   ├── ecom_backend/        # Project settings & URL routing
│   ├── api/                 # Django App (Models, Views, Chat, Embeddings)
│   └── requirements.txt     # Python backend dependencies
├── node_stock/              # Node.js stock WebSocket server
│   ├── server.js            # Express server & WebSocket handlers
│   └── package.json         # Node dependencies
├── frontend/                # React (Vite) single-page application
│   ├── src/                 # Source code (Contexts, Components)
│   └── package.json         # React dependencies
├── docker/                  # Dockerfiles and Proxy configuration
│   ├── Dockerfile.django
│   ├── Dockerfile.node
│   ├── Dockerfile.react
│   └── nginx.conf           # Proxy configuration
├── docker-compose.yml       # Orchestrates all services
└── README.md                # System documentation
```

---

## 🚀 Installation & Local Development Setup

### Prerequisites
- **Python** (version 3.10+)
- **Node.js** (version 18+)
- **npm** (version 9+)

---

### Step 1: Start the Django Backend

1. Navigate to the `django_backend` directory:
   ```bash
   cd django_backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations:
   ```bash
   python manage.py makemigrations api
   python manage.py migrate
   ```
5. Seed the database with products and local vector embeddings:
   ```bash
   python manage.py seed_db
   ```
6. Start the server:
   ```bash
   python manage.py runserver 8000
   ```
   *The backend will be available at `http://localhost:8000`.*
   *Django Admin Panel: `http://localhost:8000/admin/` (Login: `admin` / Password: `adminpassword`).*

---

### Step 2: Start the Node.js Stock Server

1. Navigate to the `node_stock` directory:
   ```bash
   cd ../node_stock
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   *The WebSocket stock server will listen on `ws://localhost:5001`.*

---

### Step 3: Start the React Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
   *The React web app will open at `http://localhost:3000`.*

---

## 🐳 Quickstart with Docker Compose

To build and run all services in unified containers routing through port-forwarded bindings:

1. Launch Docker compose from the root project folder:
   ```bash
   docker-compose up --build
   ```
2. Once containers spin up, browse `http://localhost:3000` for the React app, `http://localhost:8000/admin` for Django admin, and `http://localhost:5001/health` for WebSocket health checks.

---

## 🔑 Environment Customization

To enable actual **Gemini generative AI capabilities**, add your Google AI Studio API key in `django_backend/.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
When a valid key is set, the seeder will fetch real Gemini semantic embeddings, and the AI chatbot will communicate with live generative chat instances.
