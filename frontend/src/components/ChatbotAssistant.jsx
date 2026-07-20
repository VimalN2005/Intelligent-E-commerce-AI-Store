import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, CornerDownLeft } from 'lucide-react';

export default function ChatbotAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const chatEndRef = useRef(null);

  // Set up session ID
  useEffect(() => {
    let savedSession = sessionStorage.getItem('aetheria_chat_session');
    if (!savedSession) {
      savedSession = 'sess_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('aetheria_chat_session', savedSession);
    }
    setSessionId(savedSession);
    
    // Fetch past conversation history
    fetchHistory(savedSession);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const fetchHistory = async (sessId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/chat/history/?session_id=${sessId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        } else {
          // Welcome message
          setMessages([
            {
              id: 'welcome',
              sender: 'ai',
              message: "👋 Hello! I am Aetheria AI, your shopping assistant. Ask me to recommend gadgets, generate description summaries, or answer store queries!"
            }
          ]);
        }
      }
    } catch (e) {
      console.error('Error fetching chat history:', e);
    }
  };

  const handleSend = async (textToSend) => {
    const input = textToSend || message;
    if (!input.trim() || loading) return;

    if (!textToSend) {
      setMessage('');
    }

    // Add user message locally
    const userMsg = { id: Date.now(), sender: 'user', message: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: input
        })
      });

      if (!response.ok) {
        throw new Error('Chat API offline.');
      }

      const data = await response.json();
      
      // Update history with response
      setMessages(data.history);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          message: "⚠️ Sorry, I am having trouble connecting to the AI brain right now. Please ensure the Django backend is running."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const suggestions = [
    "Recommend electronics",
    "Describe Aura Smart Watch Pro",
    "Return policy",
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button className="chatbot-trigger" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {/* Chatbox Drawer */}
      {isOpen && (
        <div className="chatbot-drawer glass-panel">
          <div className="chat-header">
            <h3>
              <Bot size={20} style={{ color: '#06b6d4' }} />
              Aetheria Assistant
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} /> Online
            </span>
          </div>

          <div className="chat-body">
            {messages.map((msg) => (
              <div key={msg.id || msg.created_at} className={`chat-msg ${msg.sender}`}>
                {/* Parse simple markdown links to actual links, rendering nicely in chat */}
                {renderChatMessageContent(msg.message)}
              </div>
            ))}
            
            {loading && (
              <div className="chat-msg ai" style={{ display: 'flex', alignItems: 'center', padding: '12px' }}>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="chat-suggestions">
            {suggestions.map((sug, idx) => (
              <span 
                key={idx} 
                className="suggestion-pill"
                onClick={() => handleSend(sug)}
              >
                {sug}
              </span>
            ))}
          </div>

          <div className="chat-footer">
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              className="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="chat-send-btn" onClick={() => handleSend()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Helper to render product links inside chat text (e.g. Markdown format [Name](/products/ID) -> active elements)
function renderChatMessageContent(text) {
  const parts = [];
  const regex = /\[([^\]]+)\]\(\/products\/(\d+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) parts.push(textBefore);

    const productName = match[1];
    const productId = match[2];
    
    parts.push(
      <span 
        key={match.index} 
        style={{ color: '#06b6d4', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }}
        onClick={() => {
          // Send custom event to notify parent components to show this product detail
          const event = new CustomEvent('showProductDetails', { detail: productId });
          window.dispatchEvent(event);
        }}
      >
        {productName}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  const textAfter = text.substring(lastIndex);
  if (textAfter) parts.push(textAfter);

  if (parts.length === 0) return text;
  
  return <div style={{ whiteSpace: 'pre-wrap' }}>{parts}</div>;
}
