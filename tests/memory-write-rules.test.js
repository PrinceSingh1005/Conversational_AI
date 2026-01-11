const MemoryWriteRules = require('../src/memory/memoryWriteRules');

describe('Memory Write Rules Tests', () => {
    let memoryWriteRules;

    beforeEach(() => {
        memoryWriteRules = new MemoryWriteRules();
    });

    test('Should store user-declared facts', () => {
        const result = memoryWriteRules.shouldStoreInLongTermMemory("My name is John");
        expect(result.shouldStore).toBe(true);
        expect(result.type).toBe('fact');
        expect(result.fact).toBeDefined();
        expect(result.fact.type).toBe('name');
        expect(result.fact.value).toBe('John');
    });

    test('Should reject memory claims about unverified interactions', () => {
        const result = memoryWriteRules.shouldStoreInLongTermMemory("You saw me yesterday");
        expect(result.shouldStore).toBe(false);
        expect(result.type).toBe('rejection_pattern');
        expect(result.reason).toContain('unverified past interactions');
    });

    test('Should identify emotional content', () => {
        const result = memoryWriteRules.shouldStoreInLongTermMemory("I feel really happy today");
        expect(result.shouldStore).toBe(false);
        expect(result.type).toBe('emotional');
    });

    test('Should validate facts properly', () => {
        const validFact = { type: 'name', value: 'Alice' };
        const invalidFact = { type: 'name', value: 'A' }; // Too short

        const validResult = memoryWriteRules.validateMemoryFact(validFact);
        const invalidResult = memoryWriteRules.validateMemoryFact(invalidFact);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
    });

    test('Should reject self-referential claims', () => {
        const result = memoryWriteRules.shouldStoreInLongTermMemory("You know me well");
        expect(result.shouldStore).toBe(false);
        expect(result.type).toBe('rejection_pattern');
    });

    test('Should process various inputs correctly', () => {
        // Valid facts
        expect(memoryWriteRules.processInputForMemory("I live in New York").longTermAction).toBe('store');
        expect(memoryWriteRules.processInputForMemory("My favorite hobby is reading").longTermAction).toBe('store');

        // Invalid/rejected facts
        expect(memoryWriteRules.processInputForMemory("You observed me yesterday").longTermAction).toBe('reject');
        expect(memoryWriteRules.processInputForMemory("What did you remember about me").longTermAction).toBe('none');
    });
});