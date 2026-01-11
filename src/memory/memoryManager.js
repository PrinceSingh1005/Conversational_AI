const redis = require('redis');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const MemoryWriteRules = require('./memoryWriteRules');

class MemoryManager {
    constructor(llmStrategy) {
        this.llmStrategy = llmStrategy;
        // Initialize Redis for short-term memory (session-based)
        const username = 'default';
        const passwordPart = config.redis.password ? `:${config.redis.password}` : '';
        const authPart = `${username}${passwordPart}`;

        this.redisClient = redis.createClient({
            url: `redis://${authPart}@${config.redis.host}:${config.redis.port}`
        });

        console.log(
            '🔗 Redis URL:',
            `redis://${authPart}@${config.redis.host}:${config.redis.port}`
        );


        // Initialize PostgreSQL for long-term memory
        this.pgPool = new Pool({
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            user: config.database.user,
            password: config.database.password,
        });

        // Initialize memory write rules
        this.memoryWriteRules = new MemoryWriteRules();

        this.initializeRedis();
    }

    async initializeRedis() {
        try {
            await this.redisClient.connect();
            console.log('Connected to Redis for short-term memory');
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
        }
    }

    /**
     * Gets user memory (short-term, long-term, and episodic)
     * @param {string} userId - User identifier
     * @param {string} sessionId - Session identifier
     * @returns {object} - Combined memory object
     */
    async getUserMemory(userId, sessionId) {
        const [shortTerm, longTerm] = await Promise.all([
            this.getShortTermMemory(userId, sessionId),
            this.getLongTermMemory(userId)
        ]);

        return {
            shortTerm,
            longTerm,
            episodic: [] // Placeholder for episodic memory implementation
        };
    }

    /**
     * Gets short-term memory (current session)
     * @param {string} userId - User identifier
     * @param {string} sessionId - Session identifier
     * @returns {array} - Recent messages in the session
     */
    async getShortTermMemory(userId, sessionId) {
        try {
            const key = `shortterm:${userId}:${sessionId}`;
            const messages = await this.redisClient.lRange(key, 0, -1);

            if (!messages || messages.length === 0) {
                return [];
            }

            // Parse the stored JSON messages
            return messages.map(msg => JSON.parse(msg)).slice(-config.memory.shortTermSize);
        } catch (error) {
            console.error('Error getting short-term memory:', error);
            return [];
        }
    }

    /**
     * Updates short-term memory (adds messages to current session)
     * @param {string} userId - User identifier
     * @param {string} sessionId - Session identifier
     * @param {array} messages - Messages to add
     */
    async updateShortTermMemory(userId, sessionId, messages) {
        try {
            const key = `shortterm:${userId}:${sessionId}`;

            for (const message of messages) {
                await this.redisClient.lPush(key, JSON.stringify(message));
            }

            // Trim to keep only the most recent messages
            await this.redisClient.lTrim(key, 0, config.memory.shortTermSize - 1);

            // Set expiration for the session
            await this.redisClient.expire(key, config.redis.sessionExpiry);
        } catch (error) {
            console.error('Error updating short-term memory:', error);
        }
    }

    /**
     * Gets long-term memory (user profile facts)
     * @param {string} userId - User identifier
     * @returns {object} - User profile with stored facts
     */
    async getLongTermMemory(userId) {
        try {
            const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
            const result = await this.pgPool.query(query, [userId]);

            if (result.rows.length > 0) {
                return result.rows[0].profile_data || {};
            }

            return {};
        } catch (error) {
            console.error('Error getting long-term memory:', error);
            return {};
        }
    }

    /**
     * Updates long-term memory (user profile facts)
     * @param {string} userId - User identifier
     * @param {object} facts - New facts to store
     */
    async updateLongTermMemory(userId, facts) {
        try {
            // Filter facts based on memory write rules
            const filteredFacts = {};

            for (const [key, value] of Object.entries(facts)) {
                // Create a temporary fact object for validation
                const tempFact = { type: key, value: value };
                const validation = this.memoryWriteRules.validateMemoryFact(tempFact);

                if (validation.isValid) {
                    filteredFacts[key] = value;
                } else {
                    console.log(`Rejected fact for ${key}: ${validation.reason}`);
                }
            }

            if (Object.keys(filteredFacts).length === 0) {
                return; // No valid facts to store
            }

            // Get existing profile
            let existingProfile = await this.getLongTermMemory(userId);

            // Merge new facts with existing profile
            const updatedProfile = { ...existingProfile, ...filteredFacts };

            // Upsert the profile
            const query = `
        INSERT INTO user_profiles (user_id, profile_data, updated_at) 
        VALUES ($1, $2, NOW()) 
        ON CONFLICT (user_id) 
        DO UPDATE SET profile_data = $2, updated_at = NOW()
      `;

            await this.pgPool.query(query, [userId, updatedProfile]);
        } catch (error) {
            console.error('Error updating long-term memory:', error);
        }
    }

    /**
     * Creates or gets a session ID
     * @param {string} userId - User identifier
     * @returns {string} - Session identifier
     */
    createSessionId(userId) {
        return `${userId}_${Date.now()}_${uuidv4().substring(0, 8)}`;
    }

    /**
     * Gets episodic memory (important conversation summaries)
     * @param {string} userId - User identifier
     * @param {number} limit - Number of episodes to retrieve
     * @returns {array} - Array of episodic memories
     */
    async getEpisodicMemory(userId, limit = 10) {
        try {
            const query = `
        SELECT * FROM episodic_memories 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
            const result = await this.pgPool.query(query, [userId, limit]);

            return result.rows.map(row => row.memory_data);
        } catch (error) {
            console.error('Error getting episodic memory:', error);
            return [];
        }
    }

    /**
     * Stores episodic memory (conversation summaries)
     * @param {string} userId - User identifier
     * @param {object} episode - Episode data to store
     */
    async storeEpisodicMemory(userId, episode) {
        try {
            // Only store significant episodes
            if (!episode.significance || episode.significance < 0.5) {
                return;
            }

            const query = `
        INSERT INTO episodic_memories (user_id, memory_data, significance, created_at) 
        VALUES ($1, $2, $3, NOW())
      `;

            await this.pgPool.query(query, [userId, episode, episode.significance]);
        } catch (error) {
            console.error('Error storing episodic memory:', error);
        }
    }

    /**
     * Summarizes conversation for episodic memory
     * @param {array} messages - Conversation messages to summarize
     * @returns {object} - Summary of the conversation
     */
    async summarizeConversation(messages) {
        // In a real implementation, you would use an LLM to generate a summary
        // For now, we'll create a simple statistical summary

        if (!messages || messages.length === 0) {
            return null;
        }

        // Count message types
        const userMessages = messages.filter(m => m.sender === 'user');
        const botMessages = messages.filter(m => m.sender === 'bot');

        // Determine emotional tone
        const emotionalContexts = messages
            .filter(m => m.emotionalContext)
            .map(m => m.emotionalContext);

        const primaryEmotion = emotionalContexts.length > 0
            ? this.mostFrequent(emotionalContexts)
            : 'neutral';

        // Calculate significance (simple heuristic)
        const significance = Math.min(1.0, messages.length / 10);

        return {
            id: uuidv4(),
            summary: `Conversation with ${userMessages.length} user messages and ${botMessages.length} bot responses`,
            primaryEmotion,
            significance,
            timestamp: new Date(),
            messageCount: messages.length
        };
    }

    /**
     * Helper to find the most frequent item in an array
     */
    mostFrequent(arr) {
        return arr.reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {}).reduce((a, b, c, d) => d[a] > d[b] ? a : b);
    }

    /**
     * Cleans up expired sessions
     */
    async cleanupExpiredSessions() {
        // Redis automatically expires keys based on TTL
        // For PostgreSQL, you might want to run periodic cleanup jobs
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - config.memory.longTermRetentionDays);

            const query = `
        DELETE FROM episodic_memories 
        WHERE created_at < $1
      `;

            await this.pgPool.query(query, [cutoffDate]);
        } catch (error) {
            console.error('Error cleaning up expired memories:', error);
        }
    }

    /**
     * Closes connections
     */
    async closeConnections() {
        try {
            await this.redisClient.quit();
            await this.pgPool.end();
        } catch (error) {
            console.error('Error closing connections:', error);
        }
    }

    // Add these methods to your existing MemoryManager class

    /**
     * Gets short-term history for a session
     * @param {string} sessionId - Session identifier
     * @returns {array} - Recent messages
     */
    async getShortTermHistory(sessionId) {
        try {
            // Extract userId from sessionId format: session:{userId}:{sessionId}:messages
            const parts = sessionId.split(':');
            if (parts.length < 3) {
                return [];
            }

            const userId = parts[1];
            const actualSessionId = parts[2];

            return await this.getShortTermMemory(userId, actualSessionId);
        } catch (error) {
            console.error('Error getting short-term history:', error);
            return [];
        }
    }

    /**
     * Gets user profile from long-term memory
     * @param {string} userId - User identifier
     * @returns {object} - User profile
     */
    async getUserProfile(userId) {
        return await this.getLongTermMemory(userId);
    }

    /**
     * Adds message to short-term memory
     * @param {string} sessionId - Session identifier
     * @param {object} message - Message to add
     */
    async addToShortTerm(sessionId, message) {
        try {
            const parts = sessionId.split(':');
            if (parts.length < 3) {
                return;
            }

            const userId = parts[1];
            const actualSessionId = parts[2];

            await this.updateShortTermMemory(userId, actualSessionId, [{
                sender: message.role,
                content: message.text,
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('Error adding to short-term:', error);
        }
    }

    /**
     * Processes message for long-term memory storage
     * @param {string} userId - User identifier
     * @param {string} message - User message
     */
    async processMessageForLongTerm(userId, message) {
        try {
            const facts = await this.extractFactsFromMessage(message);
            if (Object.keys(facts).length > 0) {
                await this.updateLongTermMemory(userId, facts);
            }
        } catch (error) {
            console.error('Error processing message for long-term:', error);
        }
    }

    /**
     * Extracts facts from message (simplified version)
     * @param {string} message - User message
     * @returns {object} - Extracted facts
     */
    async extractFactsFromMessage(message) {
    const prompt = `
Extract ONLY concrete personal facts the user explicitly stated about themselves.
Return JSON: { "name": "...", "interests": [...], "location": "...", ... } or empty {} if none.

Examples of valid facts:
- "My name is Alex" → {"name": "Alex"}
- "I love anime and coding" → {"interests": ["anime", "coding"]}

Do NOT extract opinions, emotions, hypotheticals, or anything not directly stated.
Do not add explanations or extra text.

Message: "${message}"

Respond with JSON only, no markdown or code blocks:
`;

    try {
        if (!this.llmStrategy) {
            console.warn('LLMStrategy not available for fact extraction');
            return {};
        }

        const text = await this.llmStrategy.generateContent(prompt, [], "");

        // Clean markdown code fences
        let cleanedText = text.trim();

        // Remove opening ```json
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.substring(7);
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.substring(3);
        }

        // Remove closing ```
        if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.slice(0, -3);
        }

        cleanedText = cleanedText.trim();

        // Parse safely
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error('Fact extraction failed:', error);
        console.error('Raw LLM output was:', text); // Helpful for debugging
        return {}; // Safe fallback
    }
}
}

module.exports = MemoryManager;