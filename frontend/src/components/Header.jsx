import React from 'react';
import { ShoppingCart, Cpu, Radio } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWebSocket } from '../context/WebSocketContext';

export default function Header({ onCartClick, activeTab, setActiveTab }) {
  const { cartCount } = useCart();
  const { connected } = useWebSocket();

  return (
    <header>
      <div className="logo" onClick={() => setActiveTab('catalog')} style={{ cursor: 'pointer' }}>
        <Cpu size={28} style={{ color: '#06b6d4' }} />
        <span>AETHERIA</span>
      </div>

      <div className="nav-links">
        <span 
          className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Product Catalog
        </span>
        <span 
          className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          Store Policy
        </span>
      </div>

      <div className="nav-actions">
        {/* Real-time sync status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
          <Radio size={14} className={connected ? 'pulse-icon' : ''} style={{ color: connected ? '#10b981' : '#ef4444' }} />
          <span>{connected ? 'Stock Feed Live' : 'Offline'}</span>
        </div>

        <button className="cart-icon-btn" onClick={onCartClick}>
          <ShoppingCart size={22} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
