import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>AI Notes - Test Mode</h1>
      <p>If you can see this, React is loading correctly.</p>
      <button onClick={() => alert('Click test works!')}>
        Test Button
      </button>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <p>This is a minimal test version to check if React components are working.</p>
      </div>
    </div>
  );
}

export default App;
