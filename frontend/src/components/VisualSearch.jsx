import React, { useState, useRef } from 'react';
import { Upload, X, Search, Sparkles, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function VisualSearch({ onClose, onProductClick }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { addToCart } = useCart();

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setResults([]);
    setError('');
  };

  const triggerUpload = () => {
    fileInputRef.current.click();
  };

  const handleSearch = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch('http://localhost:8000/api/products/search_image/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image. Please try another one.');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <button className="close-modal-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles style={{ color: '#d946ef' }} />
          Visual Similarity Search
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
          Upload any photo to find matching products in our catalog by color, texture, and style.
        </p>

        {!preview ? (
          <div 
            className="upload-area" 
            onDragOver={handleDragOver} 
            onDrop={handleDrop}
            onClick={triggerUpload}
          >
            <Upload size={48} style={{ color: '#6366f1', marginBottom: '16px' }} />
            <p style={{ fontWeight: '500', marginBottom: '8px' }}>Drag & drop image here, or click to browse</p>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Supports PNG, JPG, JPEG up to 5MB</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={preview} alt="Upload Preview" className="uploaded-preview" />
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                className="filter-btn" 
                style={{ flex: 1 }}
                onClick={() => {
                  setImage(null);
                  setPreview('');
                  setResults([]);
                }}
              >
                Clear Image
              </button>
              <button 
                className="checkout-btn" 
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handleSearch}
                disabled={loading}
              >
                <Search size={18} />
                {loading ? 'Analyzing Pixels...' : 'Find Matches'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '30px 0' }}>
            <div className="spinner" />
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '12px' }}>AI vector similarity calculating...</p>
          </div>
        )}

        {error && (
          <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', margin: '20px 0', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#06b6d4' }}>Matching Products</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', maxHeight: '250px', overflowY: 'auto', paddingRight: '6px' }}>
              {results.map((prod) => (
                <div 
                  key={prod.id} 
                  className="glass-panel" 
                  style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', borderRadius: '10px' }}
                  onClick={() => onProductClick(prod)}
                >
                  <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#06b6d4' }}>${prod.price}</span>
                    <button 
                      className="add-to-cart-btn" 
                      style={{ width: '28px', height: '28px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(prod, 1);
                      }}
                      disabled={prod.stock === 0}
                    >
                      <ShoppingCart size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinner {
          width: 32px;
          height: 32px;
          border: 4px solid rgba(99, 102, 241, 0.1);
          border-left-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
