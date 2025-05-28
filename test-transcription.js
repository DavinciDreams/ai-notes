// Test script to verify transcription functionality
// Run this in the browser console on http://localhost:5173

async function testTranscription() {
    console.log('🎤 Testing Voice Notes Transcription...');
    
    try {
        // Test 1: Check if VoiceService is available
        if (typeof window.VoiceService === 'undefined') {
            console.log('⚠️ VoiceService not found on window object');
            console.log('ℹ️ This is normal - VoiceService is imported as module');
        }
        
        // Test 2: Check API endpoint directly
        console.log('🔍 Testing API endpoint directly...');
        
        // Create a minimal test audio blob (silence)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const duration = 1; // 1 second
        const frameCount = sampleRate * duration;
        const arrayBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
        
        // Create a simple tone for testing
        const channelData = arrayBuffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz tone at low volume
        }
        
        // Convert to WAV blob (simplified)
        const wavArrayBuffer = audioBufferToWav(arrayBuffer);
        const audioBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
        
        console.log('📎 Created test audio blob:', {
            size: audioBlob.size,
            type: audioBlob.type
        });
        
        // Test API call
        const formData = new FormData();
        formData.append('audio', audioBlob, 'test.wav');
        
        console.log('📡 Sending request to transcription API...');
        const response = await fetch('http://localhost:3002/api/ai/transcribe', {
            method: 'POST',
            body: formData
        });
        
        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Transcription result:', result);
            
            if (result.text && result.text.trim()) {
                console.log('🎉 SUCCESS: Transcription returned text:', result.text);
            } else {
                console.log('⚠️ WARNING: Transcription returned empty text');
                console.log('Full result:', result);
            }
        } else {
            const errorText = await response.text();
            console.log('❌ API Error:', response.status, errorText);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Simple WAV encoder for testing
function audioBufferToWav(buffer) {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float32 to int16
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

console.log('🚀 Voice Notes Transcription Test Ready!');
console.log('📋 Run testTranscription() to test the functionality');

// Auto-run the test
testTranscription();
