import { describe, it, expect } from 'vitest';
import { isValidDateFormat, validateDateParameter } from '../shared/validators';

describe('Validators', () => {
  describe('isValidDateFormat', () => {
    it('should return true for valid date format', () => {
      expect(isValidDateFormat('2026-01-05')).toBe(true);
      expect(isValidDateFormat('2026-12-31')).toBe(true);
      expect(isValidDateFormat('2000-01-01')).toBe(true);
      expect(isValidDateFormat('9999-12-31')).toBe(true);
    });

    it('should return false for invalid date format', () => {
      expect(isValidDateFormat('2026-1-5')).toBe(false);
      expect(isValidDateFormat('2026-01-5')).toBe(false);
      expect(isValidDateFormat('26-01-05')).toBe(false);
      expect(isValidDateFormat('2026/01/05')).toBe(false);
      expect(isValidDateFormat('01-05-2026')).toBe(false);
    });

    it('should return false for empty or invalid strings', () => {
      expect(isValidDateFormat('')).toBe(false);
      expect(isValidDateFormat('abc')).toBe(false);
      expect(isValidDateFormat('not-a-date')).toBe(false);
    });

    it('should return false for dates with extra characters', () => {
      expect(isValidDateFormat('2026-01-05 ')).toBe(false);
      expect(isValidDateFormat(' 2026-01-05')).toBe(false);
      expect(isValidDateFormat('2026-01-05T00:00:00')).toBe(false);
    });
  });

  describe('validateDateParameter', () => {
    it('should return valid result for correct date parameter', () => {
      const url = new URL('https://api.example.com/players?date=2026-01-05');
      const result = validateDateParameter(url);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.date).toBe('2026-01-05');
      }
    });

    it('should return error when date parameter is missing', () => {
      const url = new URL('https://api.example.com/players');
      const result = validateDateParameter(url);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Date parameter is required');
      }
    });

    it('should return error for invalid date format', () => {
      const url = new URL('https://api.example.com/players?date=2026-1-5');
      const result = validateDateParameter(url);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Invalid date format. Expected YYYY-MM-DD');
      }
    });

    it('should return error for malformed dates', () => {
      const invalidDates = [
        '26-01-05',
        '2026/01/05',
        'January 5, 2026',
        'abc',
      ];

      invalidDates.forEach((invalidDate) => {
        const url = new URL(`https://api.example.com/players?date=${invalidDate}`);
        const result = validateDateParameter(url);
        
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('Invalid date format. Expected YYYY-MM-DD');
        }
      });
    });

    it('should handle URL with multiple query parameters', () => {
      const url = new URL('https://api.example.com/players?foo=bar&date=2026-01-05&baz=qux');
      const result = validateDateParameter(url);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.date).toBe('2026-01-05');
      }
    });

    it('should handle empty date parameter value', () => {
      const url = new URL('https://api.example.com/players?date=');
      const result = validateDateParameter(url);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Date parameter is required');
      }
    });

    it('should accept leap year dates', () => {
      const url = new URL('https://api.example.com/players?date=2024-02-29');
      const result = validateDateParameter(url);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.date).toBe('2024-02-29');
      }
    });
  });
});
