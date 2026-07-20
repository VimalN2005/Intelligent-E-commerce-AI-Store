import React, { useState, useEffect } from 'react';
import { Search, Sparkles, AlertCircle, ShoppingCart, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { CartProvider, useCart } from './context/CartContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import VisualSearch from './components/VisualSearch';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import ChatbotAssistant from './components/ChatbotAssistant';

function MainApp() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals / Overlays state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog');

  // WebSocket stocks feed and toast alerts
  const { stockOverrides, stockAlerts } = useWebSocket();
  const { addToCart } = useCart();

  // Fetch Catalog data from Django Backend
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Products fetch
      const prodRes = await fetch('http://localhost:8000/api/products/');
      if (!prodRes.ok) throw new Error('Could not contact Django REST server.');
      const prodData = await prodRes.json();
      setProducts(prodData);

      // Categories fetch
      const catRes = await fetch('http://localhost:8000/api/categories/');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to Django API backend. Ensure port 8000 is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen to custom chatbot redirect events
  useEffect(() => {
    const handleShowDetails = async (e) => {
      const productId = e.detail;
      try {
        const response = await fetch(`http://localhost:8000/api/products/${productId}/`);
        if (response.ok) {
          const prod = await response.json();
          handleProductDetails(prod);
        }
      } catch (err) {
        console.error('Error opening detail from chat redirect:', err);
      }
    };
    
    window.addEventListener('showProductDetails', handleShowDetails);
    return () => window.removeEventListener('showProductDetails', handleShowDetails);
  }, []);

  // Fetch similar products using text embeddings when detail view opens
  const handleProductDetails = async (product) => {
    setSelectedProductDetails(product);
    setSimilarProducts([]);
    setLoadingSimilar(true);
    
    try {
      const response = await fetch(`http://localhost:8000/api/products/${product.id}/similar/`);
      if (response.ok) {
        const data = await response.json();
        setSimilarProducts(data);
      }
    } catch (err) {
      console.error('Error fetching similar products:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Filter logic
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* Toast Alert stack */}
      <div className="alerts-container">
        {stockAlerts.map((alert) => (
          <div key={alert.id} className="toast-alert">
            <AlertCircle size={18} style={{ color: '#d946ef' }} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Live Alert</div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{alert.message}</div>
            </div>
          </div>
        ))}
      </div>

      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'catalog' ? (
          <>
            {/* Hero Splash */}
            <section className="hero-section">
              <div className="hero-tag">⚡ Next-Gen E-Commerce</div>
              <h1 className="hero-title">Experience AI-Driven Shopping</h1>
              <p className="hero-subtitle">
                Browse our real-time inventory synchronization catalogue, utilize visual similarity pixel searches, and talk to our floating chatbot assistant.
              </p>
            </section>

            {/* Filter bar */}
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search gadgets, clothing, decor..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-btn-group">
                <button 
                  className={`filter-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    className={`filter-btn ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <button className="visual-search-btn" onClick={() => setIsVisualSearchOpen(true)}>
                <Sparkles size={16} />
                Visual Search
              </button>
            </div>

            {/* Core Loading / Error / Grid View */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <RefreshCw size={44} className="pulse-icon spinner-icon" />
                <p style={{ marginTop: '16px', color: '#94a3b8' }}>Syncing with inventory database...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '10px' }}>Connection Failure</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px' }}>{error}</p>
                <button className="filter-btn" onClick={fetchData}>Retry Connection</button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No products match your search</p>
                <p style={{ fontSize: '0.9rem' }}>Try clearing filters or checking spelling.</p>
              </div>
            ) : (
              <div className="catalog-grid">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onProductDetails={handleProductDetails}
                    onFindSimilar={handleProductDetails}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ maxWidth: '600px', margin: '40px auto' }} className="glass-panel">
            <div style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', color: '#06b6d4' }}>Aetheria Store Policies</h2>
              <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
                Welcome to Aetheria. Below are the details regarding our simulated transactions, packaging and shipping operations:
              </p>
              <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', marginBottom: '24px' }}>
                <li>🚚 <b>Free Shipping:</b> Automatically applied to all checkout values exceeding $50.00.</li>
                <li>🔄 <b>Hassle-Free Returns:</b> 30-day money-back guarantee with self-service return label generator.</li>
                <li>💳 <b>Secure Payments:</b> Complete checkout securely. Card processing operations are fully simulated.</li>
                <li>📈 <b>Real-time Sync:</b> WebSockets monitor product stocks instantly. Real-time updates occur via Node stock server.</li>
              </ul>
              <button className="checkout-btn" onClick={() => setActiveTab('catalog')}>Return to Catalog</button>
            </div>
          </div>
        )}
      </main>

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <CartDrawer 
          onClose={() => setIsCartOpen(false)} 
          onCheckoutClick={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
        />
      )}

      {/* Checkout Modal Overlay */}
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}

      {/* Visual Search Modal Overlay */}
      {isVisualSearchOpen && (
        <VisualSearch 
          onClose={() => setIsVisualSearchOpen(false)} 
          onProductClick={(prod) => {
            setIsVisualSearchOpen(false);
            handleProductDetails(prod);
          }}
        />
      )}

      {/* Product Details & Similar Products Modal */}
      {selectedProductDetails && (
        <div className="modal-overlay" onClick={() => setSelectedProductDetails(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <button className="close-modal-btn" onClick={() => setSelectedProductDetails(null)}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', flexWrap: 'wrap' }}>
              <img 
                src={selectedProductDetails.image_url} 
                alt={selectedProductDetails.name} 
                style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '12px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="product-category-tag" style={{ position: 'static', alignSelf: 'flex-start', marginBottom: '12px' }}>{selectedProductDetails.category_name}</span>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{selectedProductDetails.name}</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>{selectedProductDetails.description}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#06b6d4' }}>${parseFloat(selectedProductDetails.price).toFixed(2)}</span>
                  
                  <button 
                    className="checkout-btn" 
                    style={{ width: 'auto', padding: '12px 24px', display: 'flex', gap: '8px', alignItems: 'center' }}
                    onClick={() => {
                      // Check WebSocket override stock level
                      const currentStock = stockOverrides[selectedProductDetails.id] !== undefined 
                        ? stockOverrides[selectedProductDetails.id] 
                        : selectedProductDetails.stock;
                      
                      if (currentStock > 0) {
                        addToCart({ ...selectedProductDetails, stock: currentStock }, 1);
                        setSelectedProductDetails(null);
                        setIsCartOpen(true);
                      }
                    }}
                    disabled={(stockOverrides[selectedProductDetails.id] !== undefined ? stockOverrides[selectedProductDetails.id] : selectedProductDetails.stock) === 0}
                  >
                    <ShoppingCart size={18} />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>

            {/* AI Recommendations Segment inside Detail View */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4' }}>
                <Sparkles size={16} />
                Similar Items (Vector Search Match)
              </h3>
              
              {loadingSimilar ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Searching vector embedding index...</p>
              ) : similarProducts.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No similar products found.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                  {similarProducts.map((simProd) => (
                    <div 
                      key={simProd.id} 
                      className="glass-panel" 
                      style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}
                      onClick={() => handleProductDetails(simProd)}
                    >
                      <img src={simProd.image_url} alt={simProd.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{simProd.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: 'bold' }}>${simProd.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating chatbot assistant widget */}
      <ChatbotAssistant />
      
      {/* CSS custom keyframes injected for Pulse */}
      <style>{`
        .pulse-icon {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .spinner-icon {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <WebSocketProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </WebSocketProvider>
  );
}
