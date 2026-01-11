// direct-test.js
require('dotenv').config();

async function testDirectAPI() {
  console.log('🔍 Direct Google API Test\n');
  
  const API_KEY = process.env.LLM_API_KEY;
  if (!API_KEY) {
    console.error('❌ No API key in .env');
    return;
  }
  
  console.log('🔑 Key:', API_KEY.substring(0, 15) + '...');
  
  // Test 1: List models via direct HTTP
  console.log('\n1️⃣ Listing available models...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    console.log(`✅ Found ${data.models?.length || 0} models`);
    
    if (data.models) {
      console.log('\n📋 Available models:');
      data.models.forEach(model => {
        console.log(`  - ${model.name} (${model.displayName})`);
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`    ✅ Supports generateContent`);
        }
      });
    }
    
    // Test 2: Try to use a model
    console.log('\n2️⃣ Testing model generation...');
    
    // Find a model that supports generateContent
    const usableModel = data.models?.find(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (usableModel) {
      console.log(`🧪 Testing with: ${usableModel.name}`);
      
      const genResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${usableModel.name}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "Say 'Hello World'" }]
          }]
        })
      });
      
      const genData = await genResponse.json();
      
      if (genResponse.ok) {
        console.log('✅ Generation successful!');
        const text = genData.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`🤖 Response: ${text}`);
      } else {
        console.log('❌ Generation failed:', genData);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectAPI();