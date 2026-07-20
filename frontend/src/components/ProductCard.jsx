import React, { useState, useEffect } from 'react';
import { ShoppingCart, Eye, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWebSocket } from '../context/WebSocketContext';

export default function ProductCard({ product, onFindSimilar, onProductDetails }) {
  const { addToCart } = useCart();
  const { stockOverrides } = useWebSocket();
  const [flashStock, setFlashStock] = useState(false);

  // Read current stock (use WebSocket override if available)
  const currentStock = stockOverrides[product.id] !== undefined 
    ? stockOverrides[product.id] 
    : product.stock;

  // Flash stock text on update
  useEffect(() => {
    if (stockOverrides[product.id] !== undefined) {
      setFlashStock(true);
      const t = setTimeout(() => setFlashStock(false), 1500);
      return () => clearTimeout(t);
    }
  }, [stockOverrides[product.id]]);

  // Stock status text & color
  let stockText = '🟢 In Stock';
  let stockClass = 'in-stock';
  if (currentStock === 0) {
    stockText = '🔴 Out of Stock';
    stockClass = 'out-of-stock';
  } else if (currentStock <= 5) {
    stockText = `⚠️ Only ${currentStock} left!`;
    stockClass = 'low-stock';
  } else {
    stockText = `🟢 ${currentStock} available`;
  }

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (currentStock > 0) {
      addToCart({ ...product, stock: currentStock }, 1);
    }
  };

  return (
    <div className="product-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onProductDetails({ ...product, stock: currentStock })}>
      <div className="product-image-container">
        <span className="product-category-tag">{product.category_name}</span>
        <img 
          src={product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80'} 
          alt={product.name} 
          className="product-img"
        />
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        
        <div 
          className={`product-stock ${flashStock ? 'flash-text' : ''}`}
          style={{ 
            color: currentStock === 0 ? '#ef4444' : currentStock <= 5 ? '#f59e0b' : '#10b981',
            transition: 'color 0.3s ease',
            padding: '2px 0'
          }}
        >
          <span className={`stock-indicator ${stockClass}`} />
          {stockText}
        </div>

        <div className="product-footer">
          <span className="product-price">${parseFloat(product.price).toFixed(2)}</span>
          
          <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="add-to-cart-btn" 
              title="Find Similar Products"
              onClick={() => onFindSimilar({ ...product, stock: currentStock })}
              style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.2)' }}
            >
              <Sparkles size={18} />
            </button>
            <button 
              className="add-to-cart-btn" 
              onClick={handleAddToCart}
              disabled={currentStock === 0}
              style={{ opacity: currentStock === 0 ? 0.5 : 1, cursor: currentStock === 0 ? 'not-allowed' : 'pointer' }}
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* CSS injection for card flash animations */}
      <style>{`
        @keyframes flashGreen {
          0% { background-color: rgba(16, 185, 129, 0.3); }
          100% { background-color: transparent; }
        }
        .flash-text {
          animation: flashGreen 1.5s ease-out;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
