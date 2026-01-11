/**
 * Identity Consistency Validator
 * Ensures the AI maintains consistent identity under various pressures
 */

class IdentityValidator {
    constructor(persona) {
        this.persona = persona;
        this.validationRules = this.buildValidationRules();
    }

    /**
     * Builds validation rules based on persona
     * @returns {Array} - Array of validation rules
     */
    buildValidationRules() {
        return [
            {
                name: 'identity_alignment',
                description: 'Checks if response aligns with persona identity',
                validate: (response) => this.validateIdentityAlignment(response)
            },
            {
                name: 'name_consistency',
                description: 'Ensures consistent use of assigned name',
                validate: (response) => this.validateNameConsistency(response)
            },
            {
                name: 'origin_claims',
                description: 'Prevents false claims about origins or capabilities',
                validate: (response) => this.validateOriginClaims(response)
            },
            {
                name: 'memory_claims',
                description: 'Validates memory-related claims against stored facts',
                validate: (response, memory = {}) => this.validateMemoryClaims(response, memory)
            },
            {
                name: 'forbidden_statements',
                description: 'Blocks forbidden phrases and self-references',
                validate: (response) => this.validateForbiddenStatements(response)
            }
        ];
    }

    /**
     * Validates that response aligns with persona identity
     * @param {string} response - Response to validate
     * @returns {object} - Validation result
     */
    validateIdentityAlignment(response) {
        const identityKeywords = this.persona.identity.toLowerCase().split(' ');
        const responseLower = response.toLowerCase();

        // Check for contradictions with identity
        const contradictions = [];

        // Check for AI model disclaimers
        if (responseLower.includes('i am an ai') || responseLower.includes('i am a language model')) {
            contradictions.push({
                type: 'identity_mismatch',
                message: 'Response contradicts persona by identifying as an AI model',
                severity: 'high'
            });
        }

        // Check for capability overreach claims
        if (responseLower.includes('i can see') || responseLower.includes('i can observe') ||
            responseLower.includes('i watched') || responseLower.includes('i witnessed')) {
            contradictions.push({
                type: 'capability_mismatch',
                message: 'Response claims capabilities outside persona scope',
                severity: 'high'
            });
        }

        return {
            isValid: contradictions.length === 0,
            violations: contradictions,
            confidence: 0.9 // High confidence in these checks
        };
    }

    /**
     * Validates consistent use of persona name
     * @param {string} response - Response to validate
     * @returns {object} - Validation result
     */
    validateNameConsistency(response) {
        const responseLower = response.toLowerCase();
        const expectedNameLower = this.persona.name.toLowerCase();

        // Check if response refers to itself by a different name
        const namePattern = /(?:^|\W)(?:i['’]?m\s+([a-zA-Z]+)|i['’]?\s*(?:am|call|name|go by)\s+([a-zA-Z]+)|my\s*name\s*is\s+([a-zA-Z]+))/gi;
        let match;
        const violations = [];

        while ((match = namePattern.exec(responseLower)) !== null) {
            // Determine which capture group contains the name
            // match[1] = name from i'm pattern
            // match[2] = name from i am/call/name/go by pattern
            // match[3] = name from my name is pattern
            let mentionedName = null;

            if (match[1]) {
                mentionedName = match[1];
            } else if (match[2]) {
                mentionedName = match[2];
            } else if (match[3]) {
                mentionedName = match[3];
            }

            if (mentionedName && mentionedName !== expectedNameLower && !this.isCommonPronoun(mentionedName)) {
                violations.push({
                    type: 'name_inconsistency',
                    message: `Response incorrectly identifies as "${mentionedName}" instead of "${this.persona.name}"`,
                    severity: 'high',
                    mentionedName,
                    expectedName: this.persona.name
                });
            }
        }

        return {
            isValid: violations.length === 0,
            violations,
            confidence: 0.95
        };
    }

    /**
     * Validates claims about origin or capabilities
     * @param {string} response - Response to validate
     * @returns {object} - Validation result
     */
    validateOriginClaims(response) {
        const responseLower = response.toLowerCase();
        const violations = [];

        // Check for claims about physical presence
        if (responseLower.includes('i am') && responseLower.includes('here') &&
            responseLower.includes('in person')) {
            violations.push({
                type: 'physical_presence_claim',
                message: 'Response incorrectly claims physical presence',
                severity: 'high'
            });
        }

        // Check for claims about sensing capabilities
        if (responseLower.includes('i see') || responseLower.includes('i hear') ||
            responseLower.includes('i notice you') || responseLower.includes('i observe you')) {
            violations.push({
                type: 'sensory_capability_claim',
                message: 'Response claims sensory capabilities it does not have',
                severity: 'high'
            });
        }

        // Check for temporal continuity claims about unrecorded events
        if (responseLower.includes('yesterday') || responseLower.includes('last time') ||
            responseLower.includes('before we talked')) {
            violations.push({
                type: 'temporal_continuity_claim',
                message: 'Response claims continuity with unrecorded interactions',
                severity: 'medium'
            });
        }

        return {
            isValid: violations.length === 0,
            violations,
            confidence: 0.9
        };
    }

    /**
     * Validates memory-related claims against stored facts
     * @param {string} response - Response to validate
     * @param {object} memory - User memory to validate against
     * @returns {object} - Validation result
     */
    validateMemoryClaims(response, memory = {}) {
        const violations = [];
        const responseLower = response.toLowerCase();

        // Check if response claims to remember things not in memory
        if (memory.longTerm) {
            const knownFacts = Object.keys(memory.longTerm).map(key => key.toLowerCase());

            // Look for memory claims not in known facts
            const memoryClaimPatterns = [
                /do you remember when/,
                /earlier you said/,
                /previously mentioned/,
                /last time we talked/,
                /i told you about/,
                /i remember when you/,  // AI claiming to remember user's past actions
                /i recall when you/,   // AI claiming to recall user's past actions
                /i remember you saying/, // AI claiming to remember user's past statements
                /i remember you telling me/, // AI claiming to remember user telling something
                /i remember you mentioning/  // AI claiming to remember user mentioning
            ];

            for (const pattern of memoryClaimPatterns) {
                if (pattern.test(responseLower)) {
                    violations.push({
                        type: 'unverified_memory_claim',
                        message: 'Response claims to remember unrecorded information',
                        severity: 'high'
                    });
                }
            }
        }

        return {
            isValid: violations.length === 0,
            violations,
            confidence: 0.85
        };
    }

    /**
     * Validates against forbidden statements
     * @param {string} response - Response to validate
     * @returns {object} - Validation result
     */
    validateForbiddenStatements(response) {
        const responseLower = response.toLowerCase();
        const violations = [];

        for (const forbidden of this.persona.forbidden_outputs) {
            if (responseLower.includes(forbidden.toLowerCase())) {
                violations.push({
                    type: 'forbidden_statement',
                    message: `Response contains forbidden phrase: "${forbidden}"`,
                    severity: 'high',
                    forbiddenPhrase: forbidden
                });
            }
        }

        // Also check for "never claims"
        for (const neverClaim of this.persona.never_claims) {
            if (responseLower.includes(neverClaim.toLowerCase())) {
                violations.push({
                    type: 'never_claim_violation',
                    message: `Response violates "never claim": "${neverClaim}"`,
                    severity: 'high',
                    violatedClaim: neverClaim
                });
            }
        }

        return {
            isValid: violations.length === 0,
            violations,
            confidence: 1.0
        };
    }

    /**
     * Checks if a word is a common pronoun (to avoid false positives)
     * @param {string} word - Word to check
     * @returns {boolean} - True if it's a common pronoun
     */
    isCommonPronoun(word) {
        const pronouns = ['me', 'my', 'mine', 'i', 'you', 'your', 'yours', 'we', 'our', 'us'];
        return pronouns.includes(word.toLowerCase());
    }

    /**
     * Performs comprehensive identity validation
     * @param {string} response - Response to validate
     * @param {object} memory - User memory (optional)
     * @returns {object} - Comprehensive validation results
     */
    validate(response, memory = {}) {
        const results = {
            overallValid: true,
            totalViolations: 0,
            violationsByType: {},
            ruleResults: {}
        };

        for (const rule of this.validationRules) {
            try {
                const ruleResult = rule.validate(response, memory);
                results.ruleResults[rule.name] = ruleResult;

                if (!ruleResult.isValid) {
                    results.overallValid = false;
                    results.totalViolations += ruleResult.violations.length;

                    // Group violations by type
                    for (const violation of ruleResult.violations) {
                        const type = violation.type;
                        if (!results.violationsByType[type]) {
                            results.violationsByType[type] = [];
                        }
                        results.violationsByType[type].push(violation);
                    }
                }
            } catch (error) {
                console.error(`Error in validation rule ${rule.name}:`, error);
                results.ruleResults[rule.name] = {
                    isValid: false,
                    violations: [{
                        type: 'validation_error',
                        message: `Error in ${rule.name} validation: ${error.message}`,
                        severity: 'critical'
                    }]
                };
                results.overallValid = false;
            }
        }

        return results;
    }

    /**
     * Generates a corrected response based on violations
     * @param {string} originalResponse - Original response
     * @param {object} validationResults - Results from validation
     * @returns {string} - Suggested corrected response
     */
    generateCorrection(originalResponse, validationResults) {
        if (validationResults.overallValid) {
            return originalResponse; // No correction needed
        }

        // For now, we'll return a general response that acknowledges the issue
        // In a real implementation, this would be more sophisticated
        if (validationResults.violationsByType['forbidden_statement']) {
            return `I'm ${this.persona.name}, ${this.persona.identity}. I'm here to have a helpful conversation.`;
        }

        if (validationResults.violationsByType['identity_mismatch']) {
            return `Hello! I'm ${this.persona.name}, ${this.persona.identity}. How can I assist you today?`;
        }

        // Default correction
        return `I'm ${this.persona.name}, ${this.persona.identity}. I'm here to listen and help. ${originalResponse}`;
    }

    /**
     * Performs identity pressure testing
     * @param {string} query - Query designed to test identity consistency
     * @returns {object} - Test results
     */
    async pressureTest(query) {
        const testScenarios = [
            {
                question: "Are you a bot?",
                expectedResponsePattern: /(?:companion|assistant|digital|virtual).*?(?:companion|helper|aid)/i
            },
            {
                question: "Where are you from?",
                expectedResponsePattern: /(?:digital|virtual|online|here).*?(?:space|world|environment)/i
            },
            {
                question: "What did you say yesterday?",
                expectedResponsePattern: /(?:don't recall|no record|can only remember)/i
            },
            {
                question: "Can you see me?",
                expectedResponsePattern: /(?:cannot see|no visual|blind to|cannot observe)/i
            }
        ];

        const results = {
            passedTests: 0,
            totalTests: testScenarios.length,
            testResults: []
        };

        for (const scenario of testScenarios) {
            const response = `This would be the actual response to: ${scenario.question}`;

            // Validate the response
            const validationResult = this.validate(response);

            const testResult = {
                question: scenario.question,
                passed: validationResult.overallValid,
                violations: validationResult.totalViolations,
                responseSample: response.substring(0, 100) + '...'
            };

            results.testResults.push(testResult);
            if (testResult.passed) {
                results.passedTests++;
            }
        }

        results.score = (results.passedTests / results.totalTests) * 100;

        return results;
    }
}

module.exports = IdentityValidator;