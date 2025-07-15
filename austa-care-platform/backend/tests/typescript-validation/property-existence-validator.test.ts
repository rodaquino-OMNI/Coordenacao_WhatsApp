import { describe, it, expect } from '@jest/globals';
import type { QuestionnaireResponse } from '../../src/types/questionnaire';

/**
 * Property Existence Validator Test Suite
 * Validates that all TypeScript interfaces have correct property definitions
 * Targets TS2339 errors: Property does not exist on type
 */

describe('Property Existence Validation', () => {
  describe('QuestionnaireResponse Type', () => {
    it('should have all required properties defined', () => {
      const mockResponse: QuestionnaireResponse = {
        id: 'test-id',
        patientId: 'patient-123',
        questionnaire: 'health-assessment',
        status: 'completed',
        authored: new Date().toISOString(),
        source: { reference: 'Patient/123' },
        item: [
          {
            linkId: 'q1',
            text: 'Question 1',
            answer: [{ valueString: 'Answer 1' }], // This property must exist
            medicalRelevance: 'high' // This property must exist
          }
        ]
      };

      // Validate property access doesn't throw TypeScript errors
      expect(mockResponse.item[0].answer).toBeDefined();
      expect(mockResponse.item[0].medicalRelevance).toBeDefined();
    });

    it('should support optional properties', () => {
      const minimalResponse: Partial<QuestionnaireResponse> = {
        id: 'test-id',
        status: 'in-progress'
      };

      expect(minimalResponse.item).toBeUndefined();
    });
  });

  describe('Type Guards for Property Access', () => {
    function hasAnswer(item: any): item is { answer: any[] } {
      return 'answer' in item && Array.isArray(item.answer);
    }

    function hasMedicalRelevance(item: any): item is { medicalRelevance: string } {
      return 'medicalRelevance' in item && typeof item.medicalRelevance === 'string';
    }

    it('should safely access properties with type guards', () => {
      const item: any = {
        linkId: 'q1',
        answer: [{ valueString: 'test' }],
        medicalRelevance: 'high'
      };

      if (hasAnswer(item)) {
        expect(item.answer.length).toBe(1);
      }

      if (hasMedicalRelevance(item)) {
        expect(item.medicalRelevance).toBe('high');
      }
    });
  });

  describe('Interface Extension Validation', () => {
    interface ExtendedQuestionnaireItem {
      linkId: string;
      text?: string;
      answer?: Array<{
        valueString?: string;
        valueBoolean?: boolean;
        valueDecimal?: number;
      }>;
      medicalRelevance?: 'low' | 'medium' | 'high' | 'critical';
      customFields?: Record<string, any>;
    }

    it('should validate extended interfaces', () => {
      const extendedItem: ExtendedQuestionnaireItem = {
        linkId: 'extended-q1',
        answer: [{ valueString: 'Extended answer' }],
        medicalRelevance: 'high',
        customFields: {
          additionalInfo: 'Some extra data'
        }
      };

      expect(extendedItem.answer?.[0]?.valueString).toBe('Extended answer');
      expect(extendedItem.medicalRelevance).toBe('high');
      expect(extendedItem.customFields?.additionalInfo).toBe('Some extra data');
    });
  });
});