// test-backend.js
require('dotenv').config();

async function testBackend() {
  console.log('🧪 Testing Astra Backend...\n');
  
  // Test 1: Check if server starts
  console.log('1️⃣ Starting server test...');
  const app = require('./src/index'); // Adjust path as needed
  
  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Make a request to health endpoint
  console.log('\n2️⃣ Testing health endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const health = await response.json();
    console.log('✅ Health check:', health);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test 3: Test conversation endpoint
  console.log('\n3️⃣ Testing conversation endpoint...');
  try {
    const testData = {
      userId: 'test_user_' + Date.now(),
      inputText: 'Hello! Are you working?',
      sessionId: 'test_session_' + Date.now()
    };
    
    console.log('📤 Sending:', testData.inputText);
    
    const response = await fetch('http://localhost:3000/api/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Conversation successful!');
      console.log('🤖 Response:', result.response.text.substring(0, 100) + '...');
    } else {
      console.log('❌ Conversation failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Conversation test failed:', error.message);
  }
  
  console.log('\n✅ All tests completed!');
  process.exit(0);
}

testBackend().catch(console.error);