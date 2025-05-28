const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testWhisperAPI() {
    console.log('🧪 Testing Whisper API directly...');
    
    try {
        // Create a small test audio file (1 second of silence)
        const testAudioPath = 'test-audio.wav';
        
        // Create a simple WAV file header for 1 second of silence
        const sampleRate = 44100;
        const duration = 1;
        const frameCount = sampleRate * duration;
        const byteRate = sampleRate * 2; // 16-bit mono
        
        const wavHeader = Buffer.alloc(44);
        // RIFF header
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + frameCount * 2, 4);
        wavHeader.write('WAVE', 8);
        // fmt chunk
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16); // PCM chunk size
        wavHeader.writeUInt16LE(1, 20);  // PCM format
        wavHeader.writeUInt16LE(1, 22);  // Mono
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(byteRate, 28);
        wavHeader.writeUInt16LE(2, 32);  // Block align
        wavHeader.writeUInt16LE(16, 34); // Bits per sample
        // data chunk
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(frameCount * 2, 40);
        
        // Create silence data
        const silenceData = Buffer.alloc(frameCount * 2);
        
        // Write WAV file
        const wavData = Buffer.concat([wavHeader, silenceData]);
        fs.writeFileSync(testAudioPath, wavData);
        
        console.log(`📁 Created test audio file: ${testAudioPath} (${wavData.length} bytes)`);
        
        // Test 1: Plain text output (default)
        console.log('\\n📝 Test 1: Default output (txt)');
        const formData1 = new FormData();
        formData1.append('audio_file', fs.createReadStream(testAudioPath));
        formData1.append('task', 'transcribe');
        formData1.append('language', 'auto');
        
        const response1 = await axios.post('http://localhost:9002/asr', formData1, {
            headers: formData1.getHeaders(),
            timeout: 30000
        });
        
        console.log('Response 1 type:', typeof response1.data);
        console.log('Response 1 data:', response1.data);
        console.log('Response 1 length:', (response1.data || '').length);
        
        // Test 2: JSON output
        console.log('\\n📊 Test 2: JSON output');
        const formData2 = new FormData();
        formData2.append('audio_file', fs.createReadStream(testAudioPath));
        formData2.append('task', 'transcribe');
        formData2.append('language', 'auto');
        formData2.append('output', 'json');
        
        const response2 = await axios.post('http://localhost:9002/asr', formData2, {
            headers: formData2.getHeaders(),
            timeout: 30000
        });
        
        console.log('Response 2 type:', typeof response2.data);
        console.log('Response 2 data:', JSON.stringify(response2.data, null, 2));
        
        if (typeof response2.data === 'object' && response2.data.text !== undefined) {
            console.log('✅ JSON format working, text field:', response2.data.text);
        }
        
        // Clean up
        fs.unlinkSync(testAudioPath);
        console.log('🗑️ Cleaned up test file');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testWhisperAPI();
