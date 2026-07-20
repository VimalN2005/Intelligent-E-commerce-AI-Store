import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import confetti from 'canvas-confetti';

export default function CheckoutModal({ onClose }) {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Prepare payload matching Django structure
    const payload = {
      customer_name: name,
      customer_email: email,
      items: cartItems.map((item) => ({
        product: item.id,
        quantity: item.quantity
      }))
    };

    try {
      const response = await fetch('http://localhost:8000/api/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed. Please try again.');
      }

      // Success! Clear cart, show success screen, fire confetti
      clearCart();
      setSuccess(true);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
        <button className="close-modal-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard style={{ color: '#6366f1' }} />
              Secure Checkout
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#94a3b8' }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  className="chat-input" 
                  style={{ width: '100%' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#94a3b8' }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="john@example.com"
                  className="chat-input" 
                  style={{ width: '100%' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#94a3b8' }}>Credit Card Info (Demo)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    required
                    placeholder="4111 2222 3333 4444"
                    maxLength="19"
                    className="chat-input" 
                    style={{ width: '100%', paddingRight: '40px' }}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                  <ShieldCheck size={20} style={{ position: 'absolute', right: '12px', top: '10px', color: '#10b981' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontWeight: '700' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: '#06b6d4' }}>${cartTotal.toFixed(2)}</span>
                </div>
                
                {error && (
                  <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="checkout-btn"
                  disabled={loading}
                >
                  {loading ? 'Processing Secure Transaction...' : 'Pay & Complete Order'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '10px', color: '#f8fafc' }}>Order Placed Successfully!</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
              Thank you for shopping at Aetheria. Your order has been processed, and inventory was decremented in real-time.
            </p>
            <button className="checkout-btn" onClick={onClose}>
              Back to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
