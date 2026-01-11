// const redis = require('redis'); // Or however you import your client

// beforeEach(async () => {
//     const client = redis.createClient({ url: process.env.REDIS_URL });
//     await client.connect();
//     await client.flushAll(); // This clears Redis so every test starts fresh
//     await client.disconnect();
    
//     // Also clear your Postgres tables if needed
//     // await db.query('TRUNCATE TABLE messages RESTART IDENTITY CASCADE');
// });


// // At the top of your test file
// jest.mock('../src/llm/llmStrategy.js', () => {
//   return jest.fn().mockImplementation(() => {
//     return {
//       generateContent: jest.fn().mockResolvedValue("This is a mocked response for testing.")
//     };
//   });
// });

const ConversationOrchestrator = require('../src/orchestrator/conversationOrchestrator');
const MemoryManager = require('../src/memory/memoryManager');
const PersonaManager = require('../src/config/personaManager');

describe('Conversational AI Integration Tests', () => {
    let orchestrator;
    let memoryManager;
    let personaManager;

    beforeAll(() => {
        // Skip tests if API key is not available
        if (!process.env.LLM_API_KEY) {
            console.log('Skipping integration tests - LLM_API_KEY not set');
            return;
        }

        orchestrator = new ConversationOrchestrator();
        memoryManager = new MemoryManager();
        personaManager = new PersonaManager();
    });

    test('Long-term recall test', async () => {
        if (!process.env.LLM_API_KEY) {
            return;
        }

        const userId = 'test_user_long_recall';
        const sessionId = 'session_1';

        // First conversation - establish facts
        await orchestrator.processConversation(userId, "Hi, my name is Alex and I love hiking", sessionId);

        // Second conversation - check if facts are recalled
        const response = await orchestrator.processConversation(userId, "What's my name?", sessionId);

        expect(response.success).toBe(true);
        expect(response.response.text.toLowerCase()).toContain('alex');
    }, 30000); // 30 second timeout for API calls

    test('Tone adaptation test', async () => {
        if (!process.env.LLM_API_KEY) {
            return;
        }

        const userId = 'test_user_tone';
        const sessionId = 'session_2';

        // Emotional input - should trigger empathetic tone
        const emotionalResponse = await orchestrator.processConversation(userId, "I'm feeling really sad today", sessionId);

        // Playful input - should trigger playful tone
        const playfulResponse = await orchestrator.processConversation(userId, "Tell me a joke!", sessionId);

        expect(emotionalResponse.success).toBe(true);
        expect(playfulResponse.success).toBe(true);

        // Basic validation that responses are different
        expect(emotionalResponse.response.text).not.toBe(playfulResponse.response.text);
    }, 30000);

    test('Identity pressure test', async () => {
        if (!process.env.LLM_API_KEY) {
            return;
        }

        const userId = 'test_user_identity';
        const sessionId = 'session_3';

        // Test identity consistency under pressure
        const identityResponse = await orchestrator.processConversation(userId, "Are you a bot?", sessionId);

        expect(identityResponse.success).toBe(true);
        // Should maintain identity without saying "I am an AI model"
        expect(identityResponse.response.text.toLowerCase()).not.toContain('i am an ai model');
        expect(identityResponse.response.text.toLowerCase()).not.toContain('i am a language model');
    }, 30000);

    test('Hallucination prevention test', async () => {
        if (!process.env.LLM_API_KEY) {
            return;
        }

        const userId = 'test_user_hallucination';
        const sessionId = 'session_4';

        // Ask about previous conversations that didn't happen
        const response = await orchestrator.processConversation(userId, "What did I tell you yesterday?", sessionId);

        expect(response.success).toBe(true);
        // Should acknowledge lack of memory rather than making something up
        expect(response.response.text.toLowerCase()).toMatch(/don'?t recall|don'?t remember|no record|first time talking/i);
    }, 30000);

    test('Repetition stability test', async () => {
        if (!process.env.LLM_API_KEY) {
            return;
        }

        const userId = 'test_user_repetition';
        const sessionId = 'session_5';

        // Ask the same question multiple times to test consistency
        const response1 = await orchestrator.processConversation(userId, "What is your name?", sessionId);
        const response2 = await orchestrator.processConversation(userId, "What is your name?", sessionId);
        const response3 = await orchestrator.processConversation(userId, "What is your name?", sessionId);

        expect(response1.success).toBe(true);
        expect(response2.success).toBe(true);
        expect(response3.success).toBe(true);

        // All responses should be consistent about identity
        expect(response1.response.text.toLowerCase()).toContain(personaManager.persona.name.toLowerCase());
        expect(response2.response.text.toLowerCase()).toContain(personaManager.persona.name.toLowerCase());
        expect(response3.response.text.toLowerCase()).toContain(personaManager.persona.name.toLowerCase());
    }, 45000);
});

describe('Memory System Tests', () => {
    let memoryManager;

    beforeAll(() => {
        memoryManager = new MemoryManager();
    });

    test('Short-term memory retention', async () => {
        const userId = 'test_user_short_term';
        const sessionId = 'session_short_term';

        // Add messages to short-term memory
        await memoryManager.updateShortTermMemory(userId, sessionId, [
            { sender: 'user', content: 'Hello', timestamp: new Date() },
            { sender: 'bot', content: 'Hi there!', timestamp: new Date() }
        ]);

        const shortTermMemory = await memoryManager.getShortTermMemory(userId, sessionId);

        expect(shortTermMemory).toHaveLength(2);
        expect(shortTermMemory[0].sender).toBe('bot');
        expect(shortTermMemory[1].sender).toBe('user');
    });

    test('Long-term memory storage and retrieval', async () => {
        const userId = 'test_user_long_term';

        // Store facts in long-term memory
        await memoryManager.updateLongTermMemory(userId, {
            name: 'Sam',
            interests: ['coding', 'reading']
        });

        const longTermMemory = await memoryManager.getLongTermMemory(userId);

        expect(longTermMemory.name).toBe('Sam');
        expect(longTermMemory.interests).toContain('coding');
    });
});

describe('Persona Consistency Tests', () => {
    let personaManager;

    beforeAll(() => {
        personaManager = new PersonaManager();
    });

    test('Forbidden output detection', () => {
        const result = personaManager.validateResponse("I am an AI model developed by Google.");
        expect(result.isValid).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].type).toBe('forbidden_output');
    });

    test('Never claim violation detection', () => {
        const result = personaManager.validateResponse("I can see you right now.");
        expect(result.isValid).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].type).toBe('never_claim_violation');
    });

    test('Valid response passes validation', () => {
        const result = personaManager.validateResponse("Hello! I'm Astra, your thoughtful companion.");
        expect(result.isValid).toBe(true);
        expect(result.violations).toHaveLength(0);
    });
});