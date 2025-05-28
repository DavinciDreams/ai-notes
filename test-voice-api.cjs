// Test script for voice transcription API
const http = require('http');

async function testVoiceAPI() {
  console.log('Testing Voice Transcription API...');
  
  try {
    // Test backend health
    console.log('\n1. Testing backend health...');
    
    const healthCheck = () => new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3002/api/ai/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Health check failed: ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
    
    const healthData = await healthCheck();
    console.log('Backend health:', healthData);
    
    if (!healthData.whisper?.available) {
      console.error('❌ Whisper service not available');
      return;
    }
    
    // Test Whisper service
    console.log('\n2. Testing Whisper service...');
    
    const whisperCheck = () => new Promise((resolve, reject) => {
      const req = http.get('http://localhost:9002', (res) => {
        if (res.statusCode === 200) {
          resolve(res.statusCode);
        } else {
          reject(new Error(`Whisper check failed: ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
    
    const whisperStatus = await whisperCheck();
    console.log('Whisper service status:', whisperStatus);
    
    console.log('✅ All services are healthy and ready');
    console.log('\n🎤 Voice Notes API is ready for testing!');
    console.log('\nTo test with actual audio:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Navigate to Voice Notes in the sidebar');
    console.log('3. Click the microphone button to start recording');
    console.log('4. Speak clearly and stop recording');
    console.log('5. Your speech should be transcribed in real-time');
    
  } catch (error) {
    console.error('❌ Error testing Voice API:', error.message);
  }
}

testVoiceAPI();
