// Test script to verify API configuration
console.log('Testing API Service Configuration...');

// Test if the backend is reachable
async function testConnection() {
  try {
    console.log('Testing connection to backend at http://localhost:3002/api/ai/health...');
    
    // Try to fetch a simple endpoint
    const response = await fetch('http://localhost:3002/api/ai/health');
    console.log('Backend connection test:', response.status === 200 ? 'SUCCESS' : 'FAILED');
    
    if (response.ok) {
      const data = await response.json();
      console.log('Health check response:', data);
    } else {
      console.log('Response status:', response.status);
      console.log('Response text:', await response.text());
    }
  } catch (error) {
    console.log('Backend connection test: FAILED');
    console.log('Error:', error.message);
    console.log('\nTo fix this:');
    console.log('1. Start the backend server: npm run dev:backend');
    console.log('2. Or use start-backend.bat');
    console.log('3. Or open a new terminal and run: npx tsx server/index.ts');
  }
}

testConnection();
