process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// --- Import Your Custom Modules ---
const config = require('./config/config');
const MemoryManager = require('./memory/memoryManager');
const PersonaManager = require('./config/personaManager');
const LLMStrategy = require('./llm/llmStrategy');

// --- Initialize Modules ---
const app = express();
const llmStrategy = new LLMStrategy();
const memoryManager = new MemoryManager(llmStrategy);
const personaManager = new PersonaManager();

// --- Middleware ---
app.use(helmet());
app.use(cors(config.security.cors));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit(config.security.rateLimit));

// --- The "Brain": Orchestrator Function ---
async function orchestrateConversation(userId, userInput, sessionId) {
    try {
        console.log(`\n🧠 Processing for ${userId} (session: ${sessionId}): "${userInput}"`);

        // 1. RECALL: Fetch Context
        console.time('Memory fetch');
        const history = await memoryManager.getShortTermMemory(userId, sessionId);
        const userProfile = await memoryManager.getUserProfile(userId);
        console.timeEnd('Memory fetch');
        
        console.log(`📚 Context: ${history.length} past messages, Profile found: ${!!userProfile}`);

        // 2. ANALYZE: Determine emotional tone
        console.time('Emotion classification');
        const emotionalContext = await llmStrategy.classifyTone(userInput);
        console.timeEnd('Emotion classification');
        console.log(`❤️ Detected Emotion: ${emotionalContext}`);

        // 3. PLAN: Build the full system instructions
        const basePersonaPrompt = personaManager.getSystemPrompt();
        const toneGuidelines = personaManager.getToneContext(emotionalContext);

        const memorySummary = userProfile
            ? `
KNOWN ABOUT THE USER (use naturally and only when relevant):
- Name: ${userProfile.name || 'not shared yet'}
${userProfile.interests ? `- Interests: ${userProfile.interests.join(', ')}` : ''}
${userProfile.preferences ? `- Preferences: ${userProfile.preferences.join(', ')}` : ''}
${userProfile.facts ? `- Other facts: ${JSON.stringify(userProfile.facts)}` : ''}`
            : 'No long-term information about the user yet.';

        const fullSystemPrompt = `
${basePersonaPrompt}

${toneGuidelines}

${memorySummary}

Respond warmly, concisely, and humanly. Stay in character at all times.
`;

        // 4. GENERATE: Produce Response (with full history)
        const rawResponse = await llmStrategy.generateContent(
            fullSystemPrompt,
            history,        // full short-term chat history
            userInput       // current user message
        );

        // 5. VALIDATE: Persona & anti-hallucination check
        const validation = personaManager.validateResponse(rawResponse);
        let finalResponse = rawResponse;

        if (!validation.isValid) {
            console.warn(`⚠️ Persona Violation Detected: ${JSON.stringify(validation.violations)}`);
            // Optional: you could add fallback regeneration here later
        }

        // 6. MEMORIZE: Save interaction (run in background to not delay response)
        (async () => {
            try {
                // Save both messages at once to short-term memory (Redis)
                await memoryManager.updateShortTermMemory(userId, sessionId, [
                    { role: 'user', text: userInput },
                    { role: 'model', text: finalResponse }
                ]);

                // Extract and save any new long-term facts from user input (Postgres)
                await memoryManager.processMessageForLongTerm(userId, userInput);
            } catch (memErr) {
                console.error('Memory Save Error:', memErr);
            }
        })();

        return {
            text: finalResponse,
            emotion: emotionalContext
        };

    } catch (error) {
        console.error('❌ Orchestration Error:', error);
        throw error;
    }
}

// --- Routes ---
app.post('/api/conversation', async (req, res) => {
    let timeoutId;
    try {
        const { userId, inputText, sessionId } = req.body;

        if (!userId || !inputText) {
            return res.status(400).json({ error: 'userId and inputText required' });
        }

        console.log(`📨 Received request from ${userId}: "${inputText.substring(0, 50)}..."`);

        // Set a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Request timeout after 90 seconds'));
            }, 90000);
        });

        let actualSessionId = sessionId;
        if (!actualSessionId) {
            actualSessionId = `sess_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`🆕 New session created for ${userId}: ${actualSessionId}`);
        }

         const result = await Promise.race([
            orchestrateConversation(userId, inputText, actualSessionId),
            timeoutPromise
        ]);

        clearTimeout(timeoutId);

        res.json({
            success: true,
            response: {
                text: result.text,
                emotionalContext: result.emotion,
                timestamp: new Date().toISOString()
            },
            sessionId: actualSessionId  // Always echo back (useful for frontend sync)
        });

    } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        
        console.error('❌ Route Error:', error);
        res.status(500).json({ success: false, error: 'AI processing failed', details: error.message });
    }
});

app.get('/api/debug/components', async (req, res) => {
    try {
        // Test MemoryManager
        const testMemory = await memoryManager.getShortTermMemory('test', 'test_session');
        console.log('Memory test result:', testMemory);
        
        // Test PersonaManager
        const personaPrompt = personaManager.getSystemPrompt();
        console.log('Persona prompt check:', personaPrompt.length);
        
        // Test LLM with a simple prompt
        const llmTest = await llmStrategy.generateContent(
            'You are a test bot. Just say "Test successful".',
            [],
            'Hello'
        );
        console.log('LLM test result:', llmTest);
        
        res.json({
            memory: testMemory.length,
            personaPromptLength: personaPrompt.length,
            llmTest: llmTest
        });
    } catch (error) {
        console.error('Debug test failed:', error);
        res.status(500).json({ error: error.message });
    }
});


// Basic Health Check
app.get('/health', (req, res) => res.json({ status: 'Orchestrator Online' }));

app.get('*', (req, res) => res.status(404).json({ error: 'Not Found' }));

// Start
const PORT = config.app.port || 3000;
const HOST = '0.0.0.0';  
app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Astra Core running on port ${PORT}`);
    console.log(`🚀 Astra Core running on ${HOST}:${PORT}`);
    console.log(`🧠 Cognitive Architecture: ENABLED`);
});

module.exports = app;