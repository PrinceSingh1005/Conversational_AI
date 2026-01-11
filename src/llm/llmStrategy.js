const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const config = require("../config/config");

class LLMStrategy {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.llm.apiKey);

        // Configure the model with safety settings
        this.model = this.genAI.getGenerativeModel({
            model: config.llm.model,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });

        this.generationConfig = {
            temperature: config.llm.temperature,
            maxOutputTokens: config.llm.maxTokens,
        };
    }

    /**
 * Generates response using full conversation history
 * @param {string} systemPrompt - Full persona + tone instructions
 * @param {Array} history - Array of previous messages: [{ role: 'user'|'model', text: string }, ...]
 * @param {string} userInput - Current user message
 * @returns {Promise<string>}
 */
async generateContent(systemPrompt, history, userInput) {
    // Build contents: start with system as first "user" message (Gemini trick)
    const contents = [
        {
            role: "user",
            parts: [{ text: systemPrompt }],
        },
        // Optional: model can "repeat" system to confirm, but we skip it
    ];

    // Add conversation history (excluding the current user message)
    history.forEach(msg => {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        });
    });

    // Add current user message
    contents.push({
        role: "user",
        parts: [{ text: userInput }]
    });

    try {
        const result = await this.model.generateContent({
            contents,
            generationConfig: this.generationConfig,
        });

        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('LLM generation error:', error);
        throw error;
    }
}

    /**
     * Generates content with a structured prompt format
     * @param {object} params - Parameters for content generation
     * @param {string} params.systemPrompt - System-level instructions
     * @param {string} params.context - Context for the conversation
     * @param {string} params.userInput - User's input
     * @param {string} params.responseInstructions - Specific instructions for the response
     * @returns {Promise<string>} - The generated content
     */
    async generateStructuredContent({
        systemPrompt,
        context,
        userInput,
        responseInstructions
    }) {
        const fullPrompt = `${systemPrompt}

CONTEXT:
${context}

USER INPUT: ${userInput}

${responseInstructions || ''}`;

        return await this.generateContent(fullPrompt);
    }

    /**
     * Classifies the tone of a given text
     * @param {string} text - Text to classify
     * @returns {Promise<string>} - Classified tone (neutral, emotional, playful)
     */
    async classifyTone(text) {
        const toneClassificationPrompt = `
Classify the emotional tone of the following text. Respond with only one word: either "neutral", "emotional", or "playful".

TEXT: ${text}

CLASSIFICATION:`;

        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: toneClassificationPrompt }],
                }],
                generationConfig: {
                    temperature: 0.1, // Low temperature for consistent classification
                    maxOutputTokens: 20,
                },
            });

            const response = await result.response;
            const classification = response.text().trim().toLowerCase();

            // Validate the response to ensure it's one of our expected tones
            if (['neutral', 'emotional', 'playful'].includes(classification)) {
                return classification;
            } else {
                // Default to neutral if classification is unexpected
                return 'neutral';
            }
        } catch (error) {
            console.error('Error classifying tone:', error);
            return 'neutral'; // Default fallback
        }
    }

    /**
     * Detects contradictions in a response compared to known facts
     * @param {string} response - Response to check
     * @param {object} knownFacts - Known facts to compare against
     * @returns {Promise<array>} - Array of detected contradictions
     */
    async detectContradictions(response, knownFacts) {
        if (!knownFacts || Object.keys(knownFacts).length === 0) {
            return [];
        }

        const contradictionDetectionPrompt = `
Given the following known facts about the user and a response from a conversational agent, identify any contradictions between the response and the known facts.

KNOWN FACTS:
${Object.entries(knownFacts).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join('\n')}

RESPONSE: ${response}

Identify any contradictions. If there are none, respond with "None".
If there are contradictions, list them in the following format:
- Contradiction: [describe contradiction]
- Issue: [explain the problem]

DETECTED CONTRADICTIONS:`;

        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: contradictionDetectionPrompt }],
                }],
                generationConfig: {
                    temperature: 0.1, // Low temperature for factual analysis
                    maxOutputTokens: 200,
                },
            });

            const responseText = (await result.response).text().trim();

            if (responseText.toLowerCase() === 'none' || responseText.length === 0) {
                return [];
            }

            // Parse the contradictions from the response
            const contradictions = [];
            const lines = responseText.split('\n');

            for (const line of lines) {
                if (line.trim().startsWith('- Contradiction:')) {
                    const contradictionText = line.replace('- Contradiction:', '').trim();
                    contradictions.push({
                        type: 'fact_contradiction',
                        description: contradictionText
                    });
                }
            }

            return contradictions;
        } catch (error) {
            console.error('Error detecting contradictions:', error);
            return []; // Return empty array on error
        }
    }

    /**
     * Validates the persona consistency of a response
     * @param {string} response - Response to validate
     * @param {object} persona - Expected persona definition
     * @returns {Promise<object>} - Validation results
     */
    async validatePersonaConsistency(response, persona) {
        const personaValidationPrompt = `
Given the following persona definition and a response from a conversational agent, check if the response aligns with the persona characteristics and does not violate any persona constraints.

PERSONA IDENTITY: ${persona.identity}
NEVER CLAIMS: ${persona.never_claims.join(', ')}
FORBIDDEN OUTPUTS: ${persona.forbidden_outputs.join(', ')}

RESPONSE: ${response}

Analyze the response and identify any violations of the persona constraints. If there are no violations, respond with "VALID".
If there are violations, describe them in the following format:
- Violation: [describe violation]
- Type: [forbidden_output|never_claim_violation|identity_mismatch]

ANALYSIS:`;

        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: personaValidationPrompt }],
                }],
                generationConfig: {
                    temperature: 0.1, // Low temperature for consistent analysis
                    maxOutputTokens: 300,
                },
            });

            const analysis = (await result.response).text().trim();

            if (analysis.toLowerCase() === 'valid') {
                return {
                    isValid: true,
                    violations: []
                };
            }

            // Parse violations from the analysis
            const violations = [];
            const lines = analysis.split('\n');

            for (const line of lines) {
                if (line.trim().startsWith('- Violation:')) {
                    const violationDesc = line.replace('- Violation:', '').trim();

                    // Look for the type in the next line or in the same line
                    let violationType = 'unknown';
                    if (line.includes('Type:')) {
                        violationType = line.split('Type:')[1].trim();
                    }

                    violations.push({
                        description: violationDesc,
                        type: violationType
                    });
                } else if (line.trim().includes('Type:')) {
                    // If we found a type line without a preceding violation, we'll skip it
                    // This handles the format described in the prompt
                }
            }

            return {
                isValid: violations.length === 0,
                violations: violations,
                analysis: analysis
            };
        } catch (error) {
            console.error('Error validating persona consistency:', error);
            return {
                isValid: false,
                violations: [{
                    description: 'Validation error occurred',
                    type: 'validation_error'
                }],
                analysis: ''
            };
        }
    }

    /**
     * Summarizes a conversation for episodic memory
     * @param {array} messages - Array of conversation messages
     * @returns {Promise<object>} - Summary and significance score
     */
    async summarizeConversation(messages) {
        if (!messages || messages.length === 0) {
            return {
                summary: '',
                significance: 0,
                emotions: [],
                topics: []
            };
        }

        const conversationText = messages.map(msg =>
            `[${msg.sender.toUpperCase()}]: ${msg.content}`
        ).join('\n');

        const summarizationPrompt = `
Summarize the following conversation and assess its significance. Focus on important facts, emotional moments, and meaningful exchanges.

CONVERSATION:
${conversationText}

Provide your response in the following JSON format:
{
  "summary": "[Brief summary of the conversation]",
  "significance": "[Float between 0 and 1 indicating importance, where 0 is mundane and 1 is highly significant]",
  "emotions": ["[List of prominent emotions expressed]"],
  "topics": ["[List of main topics discussed]"],
  "key_facts": ["[Any important facts shared by the user]"]
}

SUMMARY_JSON:`;

        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: summarizationPrompt }],
                }],
                generationConfig: {
                    temperature: 0.3, // Low-medium temperature for coherent summarization
                    maxOutputTokens: 500,
                },
            });

            let responseText = (await result.response).text().trim();

            // Clean up the response to extract JSON
            if (responseText.startsWith('```json')) {
                responseText = responseText.substring(7);
            }
            if (responseText.endsWith('```')) {
                responseText = responseText.slice(0, -3);
            }
            responseText = responseText.trim();

            try {
                const parsed = JSON.parse(responseText);
                return parsed;
            } catch (parseError) {
                console.error('Error parsing summary JSON:', parseError);
                // Fallback: return a simple summary
                return {
                    summary: `Conversation with ${messages.length} messages`,
                    significance: Math.min(1.0, messages.length / 20), // Simple heuristic
                    emotions: [],
                    topics: []
                };
            }
        } catch (error) {
            console.error('Error summarizing conversation:', error);
            return {
                summary: `Conversation with ${messages.length} messages`,
                significance: Math.min(1.0, messages.length / 20), // Simple heuristic
                emotions: [],
                topics: []
            };
        }
    }
}

module.exports = LLMStrategy;