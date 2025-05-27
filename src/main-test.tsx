import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Simple test component instead of the full App
function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'black', fontSize: '24px', marginBottom: '20px' }}>
        🚀 AI Notes - Simple Test
      </h1>
      <div style={{ 
        background: '#e3f2fd', 
        padding: '16px', 
        borderRadius: '8px',
        color: 'black',
        marginBottom: '16px'
      }}>
        ✅ React is working!
      </div>
      <div style={{
        background: '#f3e5f5',
        padding: '16px', 
        borderRadius: '8px',
        color: 'black'
      }}>
        🎯 If you see this, the frontend is rendering properly.
      </div>
      <button 
        style={{
          background: '#1976d2',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          marginTop: '16px',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button clicked!')}
      >
        Test Button
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SimpleApp />
  </StrictMode>,
)
