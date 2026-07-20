import React from 'react';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ onClose, onCheckoutClick }) {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();

  return (
    <>
      {/* Background dimmer */}
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', z-index: 175, backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      />
      
      <div className="cart-drawer">
        <div className="cart-header">
          <h2 style={{ fontSize: '1.4rem' }}>Your Cart</h2>
          <button className="close-modal-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-items-list">
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '100px' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem' }}>Browse the catalog and add products!</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img 
                  src={item.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80'} 
                  alt={item.name} 
                  className="cart-item-img"
                />
                
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">${parseFloat(item.price).toFixed(2)}</div>
                  
                  <div className="cart-item-qty">
                    <button 
                      className="qty-btn" 
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.stock)}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="qty-val">{item.quantity}</span>
                    <button 
                      className="qty-btn" 
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.stock)}
                      disabled={item.quantity >= item.stock}
                      style={{ opacity: item.quantity >= item.stock ? 0.4 : 1 }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => removeFromCart(item.id)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.target.style.color = '#64748b'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span>Subtotal:</span>
              <span style={{ color: '#06b6d4' }}>${cartTotal.toFixed(2)}</span>
            </div>
            <button className="checkout-btn" onClick={onCheckoutClick}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
