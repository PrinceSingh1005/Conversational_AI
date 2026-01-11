/**
 * Memory Write Rules - Anti-Hallucination Layer
 * Controls what information gets stored in long-term memory
 */

class MemoryWriteRules {
    constructor() {
        // Define patterns that indicate user-declared facts
        this.factIndicators = [
            /\b(my|the)\s+((?:[a-z]+\s+)*)(name|interest|preference|favorite|hobby|habit|job|work|location|city|country|age|birthday|birthplace|background|story|experience)\s+is\s+(.+)/i,
            /\b(i['’]?m|i['’]?am|my name['’]?s)\s+(.+)/i,
            /\bi\s+(like|love|enjoy|prefer|dislike|hate)\s+(.+)/i,
            /\bi['’]?\s+(think|believe|feel|want|need|have)\s+(.+)/i,
            /\bmy\s+(opinion|thought|idea|feeling)\s+about/i,
            /\bi\s+(was born|live|work|study)\s+in/i,
            /\bmy\s+(father|mother|brother|sister|friend|family)\s+(is|are|was|were)/i,
            /\bi\s+(graduated|studied|went to school)\s+at/i,
            /\bi\s+(speak|know|learn)\s+(.+\s+language)/i,
            /\bmy\s+(dream|goal|aspiration|plan)\s+is/i
        ];

        // Define patterns that should NOT be stored as facts
        this.rejectionPatterns = [
            /\byou\s+saw\s+me/i,
            /\byou\s+remember\s+me\s+from/i,
            /\byesterday.*you.*said/i,
            /\blast\s+time\s+we\s+talked/i,
            /\bwhen\s+we\s+met\s+before/i,
            /\byou\s+knew\s+about/i,
            /\byou\s+were\s+there\s+when/i,
            /\bI\s+told\s+you\s+before/i,
            /\bpreviously\s+you\s+mentioned/i,
            /\bI\s+shared\s+with\s+you/i,
            /\byou\s+observed\s+that/i,
            /\byou\s+noticed\s+that/i,
            /\byou\s+watched\s+me/i,
            /\byou\s+met\s+me/i,
            /\byou\s+saw\s+that/i,
            /\byou\s+(observed|saw|witnessed|noticed|watched)\s+(me|him|her|them).*/i,
            /\b(you|we)\s+(know|knew)\s+(me|each other|eachother)/i
        ];

        // Emotional context keywords that indicate temporary states
        this.emotionalKeywords = [
            'feeling', 'felt', 'feelings', 'emotion', 'emotions', 'mood',
            'happy', 'sad', 'angry', 'excited', 'anxious', 'depressed',
            'stressed', 'overwhelmed', 'lonely', 'frustrated', 'upset'
        ];
    }

    /**
     * Determines if user input should be stored in long-term memory
     * @param {string} input - User input to evaluate
     * @returns {object} - Decision object with shouldStore and reason
     */
    shouldStoreInLongTermMemory(input) {
        // Check for rejection patterns first
        for (const pattern of this.rejectionPatterns) {
            if (pattern.test(input)) {
                return {
                    shouldStore: false,
                    reason: 'Contains reference to unverified past interactions or observations',
                    type: 'rejection_pattern'
                };
            }
        }

        // Check if it's a fact-indicating statement
        let isFactIndicating = false;
        let matchedPattern = null;
        let matchResult = null;

        for (const pattern of this.factIndicators) {
            const match = input.match(pattern);
            if (match) {
                isFactIndicating = true;
                matchedPattern = pattern;
                matchResult = match;
                break;
            }
        }

        if (isFactIndicating) {
            // Extract potential fact
            const extractedFact = this.extractFact(input, matchedPattern, matchResult);

            if (extractedFact) {
                // Special check: if the extracted fact contains emotional content,
                // treat it as emotional rather than a factual statement
                if (this.containsEmotionalContent(extractedFact.value)) {
                    return {
                        shouldStore: false, // Don't store as fact, but might store as episodic memory
                        reason: 'Emotional expression - should be treated as temporary state',
                        type: 'emotional'
                    };
                }

                return {
                    shouldStore: true,
                    reason: 'Contains user-declared fact',
                    type: 'fact',
                    fact: extractedFact
                };
            }
        }

        // Check if it's emotional venting that should be summarized
        if (this.containsEmotionalContent(input)) {
            return {
                shouldStore: false, // Don't store as fact, but might store as episodic memory
                reason: 'Emotional expression - should be treated as temporary state',
                type: 'emotional'
            };
        }

        // Default: don't store ambiguous statements
        return {
            shouldStore: false,
            reason: 'Statement is not a clear user-declared fact',
            type: 'ambiguous'
        };
    }

    /**
     * Extracts a fact from input based on matched pattern
     * @param {string} input - User input
     * @param {RegExp} pattern - Matched pattern
     * @param {Array} matchResult - Pre-computed match result (optional)
     * @returns {object|null} - Extracted fact or null
     */
    extractFact(input, pattern, matchResult = null) {
        // This is a simplified extraction - in practice you'd have more sophisticated NLP
        const match = matchResult || input.match(pattern);

        if (match) {
            // For patterns with capturing groups, return the captured content
            // Different patterns have different capture group positions
            let factValue = null;

            // Check for various possible capture group positions
            // For the first pattern: (my|the) (type) is (value) -> groups: [full, my|the, type, value]
            // For the second pattern: (i'm|i am|my name's) (value) -> groups: [full, i'm|i am|my name's, value]
            // For other patterns: similar structures

            let factType = 'general';

            if (match[4]) { // Fourth capture group (for pattern 1: 'my [adjectives] type is value')
                factValue = match[4].trim();
                // Extract the fact type from the third capture group
                const matchedType = match[3].toLowerCase();
                factType = this.getFactTypeFromMatch(matchedType);
            } else if (match[3]) { // Third capture group (for pattern 1 without adjectives: 'my type is value')
                factValue = match[3].trim();
                // Extract the fact type from the second capture group
                const matchedType = match[2].toLowerCase();
                factType = this.getFactTypeFromMatch(matchedType);
            } else if (match[2]) { // Second capture group (like in name pattern)
                factValue = match[2].trim();
                // Determine fact type based on the pattern
                factType = this.getFactTypeFromMatch(match[0]);
            } else if (match[1] && !match[2]) { // First capture group (for some patterns)
                // Need to make sure we're not taking the whole match as the value
                if (match[1] !== match[0]) {
                    factValue = match[1].trim();
                    factType = this.getFactTypeFromMatch(match[0]);
                }
            }

            if (factValue) {
                // Clean up the fact value
                factValue = factValue.replace(/[.,!?]+$/, ''); // Remove trailing punctuation

                return {
                    type: factType,
                    value: factValue,
                    original: input
                };
            }
        }

        return null;
    }

    /**
     * Determines fact type based on the matched pattern or type word
     * @param {string} match - The matched pattern or type word
     * @returns {string} - The fact type
     */
    getFactTypeFromMatch(match) {
        const lowerMatch = match.toLowerCase();

        if (/name/i.test(lowerMatch)) {
            return 'name';
        } else if (/(interest|like|love|enjoy)/i.test(lowerMatch)) {
            return 'interest';
        } else if (/(preference|prefer)/i.test(lowerMatch)) {
            return 'preference';
        } else if (/(job|work|occupation)/i.test(lowerMatch)) {
            return 'occupation';
        } else if (/(location|city|country|live)/i.test(lowerMatch)) {
            return 'location';
        } else if (/age/i.test(lowerMatch)) {
            return 'age';
        }

        return 'general';
    }

    /**
     * Checks if input contains emotional content
     * @param {string} input - User input
     * @returns {boolean} - True if contains emotional content
     */
    containsEmotionalContent(input) {
        const lowerInput = input.toLowerCase();
        return this.emotionalKeywords.some(keyword => lowerInput.includes(keyword));
    }

    /**
     * Validates if a proposed memory fact is acceptable
     * @param {object} fact - Fact to validate
     * @returns {object} - Validation result
     */
    validateMemoryFact(fact) {
        if (!fact || !fact.value) {
            return {
                isValid: false,
                reason: 'Fact is empty or invalid'
            };
        }

        // Check for validity
        const factStr = fact.value.toString().toLowerCase();

        // Reject obviously invalid facts
        if (factStr.length < 2) {
            return {
                isValid: false,
                reason: 'Fact is too short'
            };
        }

        if (factStr.length > 200) {
            return {
                isValid: false,
                reason: 'Fact is too long'
            };
        }

        // Check for self-referential or impossible claims
        if (this.isSelfReferential(factStr)) {
            return {
                isValid: false,
                reason: 'Fact contains self-referential or impossible claim'
            };
        }

        // Check for temporal inconsistencies
        if (this.hasTemporalIssues(factStr)) {
            return {
                isValid: false,
                reason: 'Fact contains temporal inconsistency'
            };
        }

        return {
            isValid: true,
            reason: 'Fact appears valid'
        };
    }

    /**
     * Checks if fact is self-referential or impossible
     * @param {string} fact - Fact string to check
     * @returns {boolean} - True if self-referential/impossible
     */
    isSelfReferential(fact) {
        const selfReferentialPatterns = [
            /you\s+(know|knew|remember|recall|understand)/i,
            /you\s+(saw|witnessed|observed)/i,
            /we\s+(met|talked|spoke|interacted)/i,
            /previous/i,
            /earlier/i,
            /before/i,
            /yesterday/i,
            /last.*time/i
        ];

        return selfReferentialPatterns.some(pattern => pattern.test(fact));
    }

    /**
     * Checks if fact has temporal issues
     * @param {string} fact - Fact string to check
     * @returns {boolean} - True if has temporal issues
     */
    hasTemporalIssues(fact) {
        // Check for future predictions presented as facts
        const futurePatterns = [
            /will\s+be/i,
            /going\s+to\s+be/i,
            /will\s+happen/i,
            /in\s+the\s+future/i
        ];

        return futurePatterns.some(pattern => pattern.test(fact));
    }

    /**
     * Processes user input and determines memory storage actions
     * @param {string} input - User input
     * @returns {object} - Processing results
     */
    processInputForMemory(input) {
        const decision = this.shouldStoreInLongTermMemory(input);

        if (decision.shouldStore && decision.fact) {
            const validation = this.validateMemoryFact(decision.fact);

            return {
                longTermAction: validation.isValid ? 'store' : 'reject',
                longTermReason: validation.reason,
                fact: validation.isValid ? decision.fact : null,
                episodicAction: 'consider_summary', // Even valid facts might be part of larger context worth summarizing
                decisionDetails: decision
            };
        } else {
            // For non-fact inputs, determine if they should trigger episodic memory creation
            let episodicAction = 'none';
            let episodicReason = '';

            // Determine longTermAction based on decision type
            let longTermAction = 'none';
            if (decision.type === 'rejection_pattern') {
                longTermAction = 'reject';
            }

            if (decision.type === 'emotional') {
                episodicAction = 'summarize';
                episodicReason = 'Significant emotional content';
            } else if (decision.type === 'ambiguous') {
                // For ambiguous inputs, we might still want to consider them for episodic memory
                // if they seem important to the conversation
                episodicAction = 'evaluate';
                episodicReason = 'Ambiguous input - evaluate for episodic memory';
            }

            return {
                longTermAction,
                longTermReason: decision.reason,
                fact: null,
                episodicAction,
                episodicReason,
                decisionDetails: decision
            };
        }
    }
}

module.exports = MemoryWriteRules;