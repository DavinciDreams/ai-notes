// Quick test of voice service functionality
// Run this in browser console to test voice service

console.log('Testing Voice Service...');

// Check if voice service is available
import('/src/services/VoiceService.js').then(module => {
  const { voiceService } = module;
  
  console.log('Voice service loaded:', voiceService);
  
  // Test initialization
  voiceService.initialize().then(() => {
    console.log('✅ Voice service initialized successfully');
    
    // Test microphone permissions
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log('✅ Microphone access granted');
        stream.getTracks().forEach(track => track.stop());
        
        // Test API connection
        fetch('/api/ai/health')
          .then(response => response.json())
          .then(data => {
            console.log('✅ Backend health:', data);
            
            if (data.whisper?.available) {
              console.log('✅ Whisper service is available');
              console.log('🎤 Voice Notes should work! Try recording now.');
            } else {
              console.error('❌ Whisper service not available');
            }
          })
          .catch(error => {
            console.error('❌ Backend connection failed:', error);
          });
      })
      .catch(error => {
        console.error('❌ Microphone access denied:', error);
        console.log('Please allow microphone access and refresh the page');
      });
      
  }).catch(error => {
    console.error('❌ Voice service initialization failed:', error);
  });
  
}).catch(error => {
  console.error('❌ Failed to load voice service:', error);
});
