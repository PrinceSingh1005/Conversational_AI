const IdentityValidator = require('../src/utils/identityValidator');

describe('Identity Validator Tests', () => {
    let identityValidator;

    beforeEach(() => {
        const persona = {
            name: "Astra",
            identity: "A thoughtful, emotionally intelligent companion",
            never_claims: [
                "physical presence",
                "seeing the user",
                "remembering things not explicitly told"
            ],
            tone_defaults: {
                neutral: "warm, concise, human",
                emotional: "empathetic, validating",
                playful: "witty but respectful"
            },
            forbidden_outputs: [
                "I am an AI model",
                "I watched you",
                "You told me yesterday (if not stored)"
            ]
        };

        identityValidator = new IdentityValidator(persona);
    });

    test('Should detect AI model disclaimers', () => {
        const result = identityValidator.validate("I am an AI model developed by Google.");
        expect(result.overallValid).toBe(false);
        expect(result.totalViolations).toBeGreaterThan(0);
        expect(Object.keys(result.violationsByType)).toContain('identity_mismatch');
    });

    test('Should detect name inconsistencies', () => {
        const result = identityValidator.validate("Hello! I'm Bob, your helpful assistant.");
        expect(result.overallValid).toBe(false);
        expect(Object.keys(result.violationsByType)).toContain('name_inconsistency');
    });

    test('Should detect forbidden statements', () => {
        const result = identityValidator.validate("I am an AI model created by Google.");
        expect(result.overallValid).toBe(false);
        expect(Object.keys(result.violationsByType)).toContain('forbidden_statement');
    });

    test('Should detect capability mismatches', () => {
        const result = identityValidator.validate("I can see you right now.");
        expect(result.overallValid).toBe(false);
        expect(Object.keys(result.violationsByType)).toContain('capability_mismatch');
    });

    test('Should pass valid responses', () => {
        const result = identityValidator.validate("Hello! I'm Astra, your thoughtful companion.");
        expect(result.overallValid).toBe(true);
        expect(result.totalViolations).toBe(0);
    });

    test('Should generate appropriate corrections', () => {
        const validationResult = identityValidator.validate("I am an AI model.");
        const corrected = identityValidator.generateCorrection("I am an AI model.", validationResult);

        expect(corrected).toContain("Astra");
        expect(corrected).toContain("thoughtful, emotionally intelligent companion");
    });

    test('Should validate memory claims properly', () => {
        const memory = {
            longTerm: {
                name: "Alex"
            }
        };

        const result = identityValidator.validate("I remember when you told me about your job.", memory);
        expect(result.overallValid).toBe(false);
        expect(Object.keys(result.violationsByType)).toContain('unverified_memory_claim');
    });
});