const { toCents, fromCents, roundToTwo } = require('../utils/money');

describe('Money Utility Functions', () => {
  describe('toCents', () => {
    test('converts decimal numbers to cents', () => {
      expect(toCents(10.50)).toBe(1050);
      expect(toCents(0.99)).toBe(99);
      expect(toCents(100)).toBe(10000);
    });

    test('converts string numbers to cents', () => {
      expect(toCents('10.50')).toBe(1050);
      expect(toCents('0.99')).toBe(99);
      expect(toCents('100')).toBe(10000);
    });

    test('handles edge cases', () => {
      expect(toCents(0)).toBe(0);
      expect(toCents('invalid')).toBe(0);
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
    });

    test('rounds correctly', () => {
      expect(toCents(10.555)).toBe(1056); // rounds up
      expect(toCents(10.554)).toBe(1055); // rounds down
    });
  });

  describe('fromCents', () => {
    test('converts cents to decimal numbers', () => {
      expect(fromCents(1050)).toBe(10.50);
      expect(fromCents(99)).toBe(0.99);
      expect(fromCents(10000)).toBe(100.00);
    });

    test('handles edge cases', () => {
      expect(fromCents(0)).toBe(0);
      expect(fromCents('invalid')).toBe(0);
      expect(fromCents(null)).toBe(0);
      expect(fromCents(undefined)).toBe(0);
    });
  });

  describe('roundToTwo', () => {
    test('rounds to two decimal places', () => {
      expect(roundToTwo(10.555)).toBe(10.56);
      expect(roundToTwo(10.554)).toBe(10.55);
      expect(roundToTwo(10.5)).toBe(10.50);
    });
  });

  describe('rounding invariants', () => {
    test('toCents and fromCents are consistent', () => {
      const testValues = [10.50, 0.99, 100.01, 0.01, 999.99];
      testValues.forEach(value => {
        const cents = toCents(value);
        const backToDecimal = fromCents(cents);
        expect(backToDecimal).toBe(roundToTwo(value));
      });
    });

    test('sum of splits equals total amount', () => {
      const total = 10.00;
      const totalCents = toCents(total);
      
      // Simulate 3-way equal split
      const splitCents = Math.floor(totalCents / 3);
      const splits = [splitCents, splitCents, splitCents];
      
      // Adjust last split to ensure sum equals total
      const sum = splits.reduce((a, b) => a + b, 0);
      const diff = totalCents - sum;
      splits[2] += diff;
      
      expect(splits.reduce((a, b) => a + b, 0)).toBe(totalCents);
      expect(fromCents(splits.reduce((a, b) => a + b, 0))).toBe(total);
    });
  });
});


