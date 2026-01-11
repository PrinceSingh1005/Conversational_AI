const { GoogleGenerativeAI } = require("@google/generative-ai");
const PersonaManager = require('../config/personaManager');
const MemoryManager = require('../memory/memoryManager');
const LLMStrategy = require('../llm/llmStrategy');
const IdentityValidator = require('../utils/identityValidator');
const config = require('../config/config');

class ConversationOrchestrator {
    constructor() {
        this.personaManager = new PersonaManager();
        this.memoryManager = new MemoryManager();
        this.llmStrategy = new LLMStrategy();
        this.identityValidator = new IdentityValidator(this.personaManager.loadPersona());
    }

    /**
     * Main orchestration method that handles the entire conversation flow
     * @param {string} userId - Unique identifier for the user
     * @param {string} inputText - The user's message
     * @param {string} sessionId - Session identifier
     * @returns {object} - The response and any updates
     */
    async processConversation(userId, inputText, sessionId) {
        try {
            // Step 1: Validate user input
            const validatedInput = this.validateInput(inputText);
            if (!validatedInput.isValid) {
                return {
                    success: false,
                    error: validatedInput.error,
                    message: "Invalid input received"
                };
            }

            // Step 2: Fetch user memory (short + long-term)
            const userMemory = await this.memoryManager.getUserMemory(userId, sessionId);

            // Step 3: Analyze emotional context
            const emotionalContext = this.analyzeEmotion(inputText);

            // Step 4: Prepare context for LLM
            const llmContext = this.prepareLLMContext(userMemory, inputText, emotionalContext);

            // Step 5: Call LLM
            const rawResponse = await this.callLLM(llmContext);

            // Step 6: Post-process and validate response
            const processedResponse = this.postProcessResponse(rawResponse, emotionalContext);

            // Step 7: Validate against persona constraints
            const personaValidation = this.personaManager.validateResponse(processedResponse.text);

            // Step 8: Perform identity consistency validation
            const identityValidation = this.identityValidator.validate(
                processedResponse.text,
                userMemory
            );

            // Combine validations
            const hasViolations = !personaValidation.isValid || !identityValidation.overallValid;

            // Step 9: Handle validation results
            let finalResponse = processedResponse;
            if (hasViolations) {
                // Collect all violations
                const allViolations = [
                    ...personaValidation.violations || [],
                    ...Object.values(identityValidation.violationsByType || {}).flat() || []
                ];

                // Regenerate response with corrections
                finalResponse = await this.regenerateWithCorrections(llmContext, allViolations);

                // Re-validate the regenerated response
                const revalidatedIdentity = this.identityValidator.validate(
                    finalResponse.text,
                    userMemory
                );

                if (!revalidatedIdentity.overallValid) {
                    // If still failing identity validation, apply manual correction
                    finalResponse.text = this.identityValidator.generateCorrection(
                        finalResponse.text,
                        revalidatedIdentity
                    );
                }
            }

            // Step 9: Update memory based on conversation
            await this.updateMemory(userId, sessionId, inputText, finalResponse.text, emotionalContext);

            return {
                success: true,
                response: finalResponse,
                memory: userMemory,
                emotionalContext
            };
        } catch (error) {
            console.error('Error in conversation orchestrator:', error);
            return {
                success: false,
                error: error.message,
                message: "An error occurred processing your request"
            };
        }
    }

    /**
     * Validates user input for safety and appropriateness
     * @param {string} input - User input to validate
     * @returns {object} - Validation result
     */
    validateInput(input) {
        // Basic input validation
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
            return {
                isValid: false,
                error: 'Input cannot be empty'
            };
        }

        // Check for excessive length
        if (input.length > 2000) {
            return {
                isValid: false,
                error: 'Input too long'
            };
        }

        // Here you could add toxicity detection or other validations
        // For now, we'll just return valid
        return {
            isValid: true,
            input: input.trim()
        };
    }

    /**
     * Analyzes the emotional context of user input
     * @param {string} input - User input to analyze
     * @returns {string} - Emotional context (neutral, emotional, playful)
     */
    analyzeEmotion(input) {
        // Simple heuristic for emotional analysis
        // In a real implementation, you'd use a sentiment analysis library
        const emotionalIndicators = [
            'sad', 'happy', 'angry', 'excited', 'anxious', 'depressed',
            'joy', 'love', 'hate', 'scared', 'afraid', 'lonely', 'stressed',
            'upset', 'frustrated', 'overwhelmed', 'thrilled', 'amazing', 'terrible'
        ];

        const playfulIndicators = [
            'joke', 'funny', 'haha', 'lol', 'xd', 'hilarious', 'silly', 'playful',
            'tease', 'banter', 'witty', 'clever', 'smart'
        ];

        const lowerInput = input.toLowerCase();

        // Check for emotional indicators
        for (const indicator of emotionalIndicators) {
            if (lowerInput.includes(indicator)) {
                return 'emotional';
            }
        }

        // Check for playful indicators
        for (const indicator of playfulIndicators) {
            if (lowerInput.includes(indicator)) {
                return 'playful';
            }
        }

        // Default to neutral
        return 'neutral';
    }

    /**
     * Prepares the context for the LLM call
     * @param {object} memory - User memory
     * @param {string} inputText - User's input
     * @param {string} emotionalContext - Emotional context
     * @returns {string} - Formatted context for LLM
     */
    prepareLLMContext(memory, inputText, emotionalContext) {
        const systemPrompt = this.personaManager.getSystemPrompt();
        const toneContext = this.personaManager.getToneContext(emotionalContext);

        // Format memory for context
        const formattedMemory = this.formatMemoryForContext(memory);

        // Construct the full prompt
        const fullPrompt = `
${systemPrompt}
${toneContext}

MEMORY_FACTS:
${formattedMemory.facts}

RECENT_CONVERSATION:
${formattedMemory.conversation}

USER_INPUT: ${inputText}

RESPONSE_INSTRUCTIONS:
- Be helpful and engaging
- Maintain persona consistency
- Use appropriate tone for emotional context
- If you don't know something, say so rather than making it up
- Only reference facts that have been explicitly shared or remembered
`;

        return fullPrompt;
    }

    /**
     * Formats memory for LLM context
     * @param {object} memory - User memory object
     * @returns {object} - Formatted memory
     */
    formatMemoryForContext(memory) {
        const facts = [];
        if (memory.longTerm && Object.keys(memory.longTerm).length > 0) {
            facts.push("USER_FACTS:");
            for (const [key, value] of Object.entries(memory.longTerm)) {
                if (key !== 'sessionId' && key !== 'createdAt') {
                    facts.push(`- ${key}: ${JSON.stringify(value)}`);
                }
            }
        }

        const conversation = [];
        if (memory.shortTerm && memory.shortTerm.length > 0) {
            conversation.push("RECENT_EXCHANGE:");
            memory.shortTerm.forEach(msg => {
                conversation.push(`${msg.sender.toUpperCase()}: ${msg.content}`);
            });
        }

        return {
            facts: facts.length > 0 ? facts.join('\n') : 'No prior information stored.',
            conversation: conversation.length > 0 ? conversation.join('\n') : 'No recent conversation history.'
        };
    }

    /**
     * Calls the LLM with prepared context
     * @param {string} context - Context for the LLM
     * @returns {string} - Raw LLM response
     */
    async callLLM(context) {
        try {
            return await this.llmStrategy.generateContent(context);
        } catch (error) {
            console.error('Error calling LLM:', error);
            throw error;
        }
    }

    /**
     * Post-processes the LLM response
     * @param {string} rawResponse - Raw response from LLM
     * @param {string} emotionalContext - Emotional context
     * @returns {object} - Processed response
     */
    postProcessResponse(rawResponse, emotionalContext) {
        // Clean up the response
        let cleanedResponse = rawResponse.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

        // Ensure response doesn't end abruptly mid-sentence
        if (!/[.!?]$/.test(cleanedResponse)) {
            cleanedResponse += '.';
        }

        return {
            text: cleanedResponse,
            emotionalContext,
            timestamp: new Date()
        };
    }

    /**
     * Regenerates response with corrections based on violations
     * @param {string} context - Original context
     * @param {array} violations - Array of violations
     * @returns {object} - Corrected response
     */
    async regenerateWithCorrections(context, violations) {
        const violationDescriptions = violations.map(v => v.message).join('; ');
        const correctionPrompt = `${context}\n\nCORRECTION_NEEDED: The previous response had the following issues: ${violationDescriptions}. Please respond again while avoiding these mistakes.`;

        try {
            const correctedText = await this.llmStrategy.generateContent(correctionPrompt);

            return {
                text: correctedText,
                emotionalContext: 'neutral', // Reset to neutral after correction
                timestamp: new Date(),
                wasCorrected: true
            };
        } catch (error) {
            console.error('Error regenerating response:', error);
            // Return a default safe response
            return {
                text: "I'm here to help. Could you rephrase that?",
                emotionalContext: 'neutral',
                timestamp: new Date(),
                wasCorrected: true
            };
        }
    }

    /**
     * Updates memory based on the conversation
     * @param {string} userId - User ID
     * @param {string} sessionId - Session ID
     * @param {string} inputText - User's input
     * @param {string} botResponse - Bot's response
     * @param {string} emotionalContext - Emotional context
     */
    async updateMemory(userId, sessionId, inputText, botResponse, emotionalContext) {
        // Extract facts from user input (this would be more sophisticated in practice)
        const extractedFacts = this.extractFactsFromInput(inputText);

        // Update memories
        await this.memoryManager.updateShortTermMemory(userId, sessionId, [
            { sender: 'user', content: inputText, timestamp: new Date() },
            { sender: 'bot', content: botResponse, timestamp: new Date(), emotionalContext }
        ]);

        // Update long-term memory with extracted facts
        if (Object.keys(extractedFacts).length > 0) {
            await this.memoryManager.updateLongTermMemory(userId, extractedFacts);
        }
    }

    /**
     * Extracts facts from user input
     * @param {string} input - User input
     * @returns {object} - Extracted facts
     */
    extractFactsFromInput(input) {
        const facts = {};

        // Look for common fact patterns
        const namePattern = /\b(?:my name is|i'm|i am)\s+([a-zA-Z\s]+)/i;
        const interestPattern = /\b(?:i like|i love|i enjoy|i'm interested in)\s+(.+?)(?:\.|,|$)/gi;
        const preferencePattern = /\b(?:i prefer|i like)\s+(.+?)(?:\.|,|$)/gi;

        // Extract name
        const nameMatch = input.match(namePattern);
        if (nameMatch && nameMatch[1]) {
            const name = nameMatch[1].trim();
            if (name.split(' ').length <= 3) { // Basic validation
                facts.name = name;
            }
        }

        // Extract interests
        let interestMatch;
        const interests = [];
        while ((interestMatch = interestPattern.exec(input)) !== null) {
            let interest = interestMatch[1].trim();
            // Clean up the interest
            interest = interest.replace(/\bvery|extremely|really\b/gi, '').trim();
            if (interest && interest.length > 2) {
                interests.push(interest);
            }
        }

        if (interests.length > 0) {
            facts.interests = interests;
        }

        // Extract preferences
        let preferenceMatch;
        const preferences = [];
        while ((preferenceMatch = preferencePattern.exec(input)) !== null) {
            let preference = preferenceMatch[1].trim();
            preference = preference.replace(/\bsomething|a lot|quite a bit\b/gi, '').trim();
            if (preference && preference.length > 2) {
                preferences.push(preference);
            }
        }

        if (preferences.length > 0) {
            facts.preferences = preferences;
        }

        return facts;
    }
}

module.exports = ConversationOrchestrator;