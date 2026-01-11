const fs = require('fs');
const path = require('path');

class PersonaManager {
    constructor(personaConfigPath = './persona.json') {
        this.personaConfigPath = personaConfigPath;
        this.persona = this.loadPersona();
    }

    loadPersona() {
        try {
            const personaData = fs.readFileSync(
                path.join(__dirname, 'persona.json'),
                'utf8'
            );
            return JSON.parse(personaData);
        } catch (error) {
            console.error('Error loading persona configuration:', error);
            throw error;
        }
    }

    /**
     * Validates if a response adheres to persona constraints
     * @param {string} response - The response to validate
     * @returns {object} - Validation result with isValid and violations
     */
    validateResponse(response) {
        const violations = [];

        // Check for forbidden outputs
        for (const forbidden of this.persona.forbidden_outputs) {
            if (response.toLowerCase().includes(forbidden.toLowerCase())) {
                violations.push({
                    type: 'forbidden_output',
                    message: `Response contains forbidden phrase: "${forbidden}"`,
                    forbidden_phrase: forbidden
                });
            }
        }

        // Check for claims that violate "never_claims"
        for (const neverClaim of this.persona.never_claims) {
            if (response.toLowerCase().includes(neverClaim.toLowerCase())) {
                violations.push({
                    type: 'never_claim_violation',
                    message: `Response makes claim it should never make: "${neverClaim}"`,
                    claim: neverClaim
                });
            }
        }

        return {
            isValid: violations.length === 0,
            violations,
            persona: this.persona
        };
    }

    /**
     * Gets the appropriate tone context based on emotional analysis
     * @param {string} emotionalContext - Current emotional context (neutral, emotional, playful)
     * @returns {string} - Tone guidelines for the LLM
     */
    getToneContext(emotionalContext = 'neutral') {
        const tone = this.persona.tone_defaults[emotionalContext] || this.persona.tone_defaults.neutral;
        return `TONE_GUIDELINES: Respond in a ${tone} manner. `;
    }

    /**
     * Gets the system prompt incorporating persona
     * @returns {string} - Complete system prompt
     */
    getSystemPrompt() {
        return `
PERSONA_IDENTITY: You are ${this.persona.name}, ${this.persona.identity}.
NEVER_CLAIMS: You must never claim or imply: ${this.persona.never_claims.join(', ')}. 
FORBIDDEN_OUTPUTS: Never say: ${this.persona.forbidden_outputs.join(', ')}.
Remember: You are a digital companion, not a physical being. You can only remember what users explicitly tell you in this conversation or what is stored in your memory system.
`;
    }
}

module.exports = PersonaManager;