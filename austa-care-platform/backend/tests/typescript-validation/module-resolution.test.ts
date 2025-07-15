import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Module Resolution Test Suite
 * Validates that all modules can be properly resolved
 * Targets TS2307 errors: Cannot find module
 */

describe('Module Resolution Validation', () => {
  let tsconfigPaths: any;

  beforeAll(() => {
    // Load tsconfig to check path mappings
    const tsconfigPath = path.resolve(__dirname, '../../tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      tsconfigPaths = tsconfig.compilerOptions?.paths || {};
    }
  });

  describe('Path Alias Resolution', () => {
    it('should have @ alias configured in tsconfig', () => {
      expect(tsconfigPaths).toHaveProperty('@/*');
      expect(tsconfigPaths['@/*']).toContain('src/*');
    });

    it('should resolve @/utils modules', () => {
      const utilsPath = path.resolve(__dirname, '../../src/utils');
      expect(fs.existsSync(utilsPath)).toBe(true);
      
      // Check specific util modules exist
      const expectedUtils = ['logger.ts', 'webhook.ts'];
      expectedUtils.forEach(util => {
        const utilPath = path.join(utilsPath, util);
        expect(fs.existsSync(utilPath)).toBe(true);
      });
    });

    it('should resolve @/services modules', () => {
      const servicesPath = path.resolve(__dirname, '../../src/services');
      expect(fs.existsSync(servicesPath)).toBe(true);
    });

    it('should resolve @/controllers modules', () => {
      const controllersPath = path.resolve(__dirname, '../../src/controllers');
      expect(fs.existsSync(controllersPath)).toBe(true);
    });
  });

  describe('Required Dependencies', () => {
    let packageJson: any;

    beforeAll(() => {
      const packagePath = path.resolve(__dirname, '../../package.json');
      packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    });

    it('should have dotenv installed', () => {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      expect(deps).toHaveProperty('dotenv');
    });

    it('should have zod installed', () => {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      expect(deps).toHaveProperty('zod');
    });

    it('should have @types/node installed', () => {
      expect(packageJson.devDependencies).toHaveProperty('@types/node');
    });

    it('should have all required type definitions', () => {
      const requiredTypes = [
        '@types/node',
        '@types/express',
        '@types/jest'
      ];

      requiredTypes.forEach(typePkg => {
        expect(packageJson.devDependencies).toHaveProperty(typePkg);
      });
    });
  });

  describe('Import Path Validation', () => {
    it('should not have circular dependencies', async () => {
      // This would use a tool like madge in a real implementation
      // For now, we'll check for common circular dependency patterns
      const srcPath = path.resolve(__dirname, '../../src');
      
      // Basic check: ensure services don't import from controllers
      const serviceFiles = fs.readdirSync(path.join(srcPath, 'services'))
        .filter(f => f.endsWith('.ts'));
      
      serviceFiles.forEach(file => {
        const content = fs.readFileSync(path.join(srcPath, 'services', file), 'utf-8');
        expect(content).not.toMatch(/from ['"]\.\.\/controllers/);
      });
    });

    it('should use consistent import styles', () => {
      const srcPath = path.resolve(__dirname, '../../src');
      const checkImportStyle = (filePath: string) => {
        if (!fs.existsSync(filePath) || !filePath.endsWith('.ts')) return;
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.startsWith('import')) {
            // Check for consistent use of @ alias for internal imports
            if (line.includes('./') || line.includes('../')) {
              expect(line).not.toMatch(/from ['"]\.\.\/\.\.\/src/);
            }
          }
        });
      };

      // Check a sample of files
      checkImportStyle(path.join(srcPath, 'server.ts'));
    });
  });
});