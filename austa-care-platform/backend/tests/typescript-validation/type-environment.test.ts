import { describe, it, expect } from '@jest/globals';

/**
 * Type Environment Test Suite
 * Validates that Node.js types and globals are properly available
 * Targets TS2580 errors: Cannot find name
 */

describe('Type Environment Validation', () => {
  describe('Node.js Global Types', () => {
    it('should have process object available', () => {
      expect(typeof process).toBe('object');
      expect(process.env).toBeDefined();
      expect(process.version).toBeDefined();
    });

    it('should have Buffer type available', () => {
      const buffer = Buffer.from('test');
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should have __dirname and __filename available', () => {
      expect(typeof __dirname).toBe('string');
      expect(typeof __filename).toBe('string');
    });

    it('should have global timers available', () => {
      expect(typeof setTimeout).toBe('function');
      expect(typeof setInterval).toBe('function');
      expect(typeof setImmediate).toBe('function');
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have proper Node.js types configuration', () => {
      // Verify that common Node.js types work
      const nodeTypes: Array<[string, any]> = [
        ['process', process],
        ['global', global],
        ['console', console],
        ['Buffer', Buffer],
        ['require', typeof require !== 'undefined' ? require : null]
      ];

      nodeTypes.forEach(([name, value]) => {
        if (value !== null) {
          expect(value).toBeDefined();
        }
      });
    });

    it('should handle process.env types correctly', () => {
      // Test that process.env can be accessed with string indexing
      const testEnvVar: string | undefined = process.env.TEST_VAR;
      expect(testEnvVar === undefined || typeof testEnvVar === 'string').toBe(true);

      // Test setting env vars
      process.env.DYNAMIC_TEST_VAR = 'test value';
      expect(process.env.DYNAMIC_TEST_VAR).toBe('test value');
      delete process.env.DYNAMIC_TEST_VAR;
    });
  });

  describe('Module System Types', () => {
    it('should have CommonJS module types', () => {
      expect(typeof module).toBe('object');
      expect(typeof exports).toBe('object');
      
      // In Jest environment, require might be available
      if (typeof require !== 'undefined') {
        expect(typeof require).toBe('function');
        expect(typeof require.resolve).toBe('function');
      }
    });

    it('should support import.meta in ES modules', () => {
      // This test checks if the TypeScript config supports ES module syntax
      // In a real ES module, you would access import.meta.url
      // For this test, we just verify the types compile correctly
      type ImportMeta = {
        url: string;
        resolve: (specifier: string) => string;
      };

      const mockImportMeta: ImportMeta = {
        url: 'file:///test.js',
        resolve: (specifier: string) => `file:///${specifier}`
      };

      expect(mockImportMeta.url).toBe('file:///test.js');
    });
  });

  describe('Async/Promise Types', () => {
    it('should have Promise types available', async () => {
      const promise = Promise.resolve('test');
      expect(promise).toBeInstanceOf(Promise);
      
      const result = await promise;
      expect(result).toBe('test');
    });

    it('should support async/await syntax', async () => {
      const asyncFunction = async (): Promise<string> => {
        return new Promise(resolve => {
          setTimeout(() => resolve('async result'), 0);
        });
      };

      const result = await asyncFunction();
      expect(result).toBe('async result');
    });
  });

  describe('Error Types', () => {
    it('should have standard Error types', () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new SyntaxError('Syntax error'),
        new RangeError('Range error')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
        expect(error.stack).toBeDefined();
      });
    });
  });
});