
import { describe, expect, it } from "vitest";
import { serializeAnalyticsFilters } from '../api';

/**
 * Tests for serializeAnalyticsFilters
 * 
 * Since this project does not currently have a frontend test runner configured,
 * this file serves as documentation of expected behavior and a target for 
 * future test infrastructure (e.g., Jest/Vitest).
 */
describe('serializeAnalyticsFilters', () => {
    it('should serialize basic primitive values', () => {
        const input = { mode: 'all', limit: 10 };
        const output = serializeAnalyticsFilters(input);
        expect(output).toEqual({ mode: 'all', limit: '10' });
    });

    it('should serialize array values as comma-separated strings', () => {
        const input = { categories: ['food', 'travel'], status: ['active'] };
        const output = serializeAnalyticsFilters(input);
        expect(output).toEqual({ categories: 'food,travel', status: 'active' });
    });

    it('should flatten nested "time" object', () => {
        const input = {
            time: {
                range: 'CUSTOM',
                from: '2023-01-01',
                to: '2023-12-31'
            }
        };
        const output = serializeAnalyticsFilters(input);
        expect(output).toEqual({
            'time.range': 'CUSTOM',
            'time.from': '2023-01-01',
            'time.to': '2023-12-31'
        });
    });

    it('should ignore null, undefined, and empty string values', () => {
        const input = {
            mode: 'group',
            category: null,
            status: undefined,
            search: ''
        };
        const output = serializeAnalyticsFilters(input);
        expect(output).toEqual({ mode: 'group' });
    });

    it('should serialize mixed complex filters correctly', () => {
        const input = {
            mode: 'personal',
            time: { range: 'THIS_MONTH' },
            categories: ['food', 'utilities'],
            groupIds: ['123', '456']
        };
        const output = serializeAnalyticsFilters(input);
        expect(output).toEqual({
            mode: 'personal',
            'time.range': 'THIS_MONTH',
            categories: 'food,utilities',
            groupIds: '123,456'
        });
    });
});
