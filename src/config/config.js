/**
 * Application Configuration
 * Centralized configuration for the conversational AI system
 */

require('dotenv').config();

const config = {
    app: {
        name: 'Astra - Conversational AI',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        port: parseInt(process.env.PORT),
    },

    llm: {
        provider: process.env.LLM_PROVIDER, // gemini, openai, anthropic
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL, // or gemini-flash for cheaper/faster responses
        temperature: parseFloat(process.env.TEMPERATURE),
        maxTokens: parseInt(process.env.MAX_TOKENS),
    },

    memory: {
        shortTermSize: parseInt(process.env.SHORT_TERM_SIZE) , // Number of recent messages to keep in session
        longTermRetentionDays: parseInt(process.env.LONG_TERM_RETENTION_DAYS),
        episodicSummaryThreshold: parseInt(process.env.EPISODIC_SUMMARY_THRESHOLD), // Messages before summary
    },

    redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        sessionExpiry: parseInt(process.env.REDIS_SESSION_EXPIRY) || 3600, // 1 hour
    },

    database: {
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'conversational_ai',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
    },

    security: {
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
        },
        cors: {
            origin: 'https://conversational-ai-6m4r.onrender.com',
            credentials: process.env.CORS_CREDENTIALS === 'true' || true,
        },
    },

    features: {
        enablePersonaValidation: process.env.ENABLE_PERSONA_VALIDATION !== 'false',
        enableMemoryWriteRules: process.env.ENABLE_MEMORY_WRITE_RULES !== 'false',
        enableToneAdaptation: process.env.ENABLE_TONE_ADAPTATION !== 'false',
        enableEmotionalRecall: process.env.ENABLE_EMOTIONAL_RECALL !== 'false',
    }
};

// Validate required configuration
const requiredConfigs = ['LLM_API_KEY'];
const missingConfigs = requiredConfigs.filter(config => !process.env[config]);

if (missingConfigs.length > 0) {
    console.warn(`WARNING: Missing required environment variables: ${missingConfigs.join(', ')}`);
    console.log('Please set these in a .env file');
}

module.exports = config;
