import {
  isValidPhoneNumber,
  isValidMessageContent,
  isValidMessageSid,
  validateWebhookPayload
} from '../index';

describe('Phone Number Validator', () => {
  describe('isValidPhoneNumber', () => {
    it('should accept valid phone numbers in E.164 format', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('+551194601258')).toBe(true);
      expect(isValidPhoneNumber('+442071838750')).toBe(true);
      expect(isValidPhoneNumber('+81312345678')).toBe(true);
    });

    it('should reject phone numbers that are too short', () => {
      expect(isValidPhoneNumber('+55115')).toBe(false);
      expect(isValidPhoneNumber('+1234')).toBe(false);
      expect(isValidPhoneNumber('+12345')).toBe(false);
    });

    it('should reject phone numbers that are too long', () => {
      expect(isValidPhoneNumber('+1234567890123456')).toBe(false); // 16 digits
      expect(isValidPhoneNumber('+123456789012345678')).toBe(false);
    });

    it('should reject phone numbers without + sign', () => {
      expect(isValidPhoneNumber('551194601258')).toBe(false);
      expect(isValidPhoneNumber('1234567890')).toBe(false);
    });

    it('should reject phone numbers with invalid characters', () => {
      expect(isValidPhoneNumber('+55 1194601258')).toBe(false);
      expect(isValidPhoneNumber('+55-119-4601258')).toBe(false);
      expect(isValidPhoneNumber('+55(11)94601258')).toBe(false);
    });

    it('should reject phone numbers starting with 0', () => {
      expect(isValidPhoneNumber('+01234567890')).toBe(false);
    });

    it('should reject empty or null phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('   ')).toBe(false);
    });

    it('should accept minimum valid length (7 digits total)', () => {
      expect(isValidPhoneNumber('+1234567')).toBe(true); // 7 digits
    });

    it('should accept maximum valid length (15 digits total)', () => {
      expect(isValidPhoneNumber('+123456789012345')).toBe(true); // 15 digits
    });
  });
});

describe('Message Content Validator', () => {
  describe('isValidMessageContent', () => {
    it('should accept valid message content', () => {
      expect(isValidMessageContent('Hello world')).toBe(true);
      expect(isValidMessageContent('A')).toBe(true);
      expect(isValidMessageContent('Test message with numbers 123')).toBe(true);
      expect(isValidMessageContent('Message with special chars !@#$%')).toBe(true);
    });

    it('should reject empty messages', () => {
      expect(isValidMessageContent('')).toBe(false);
      expect(isValidMessageContent('   ')).toBe(false);
      expect(isValidMessageContent('\n\t')).toBe(false);
    });

    it('should reject messages longer than 1000 characters', () => {
      const longMessage = 'a'.repeat(1001);
      expect(isValidMessageContent(longMessage)).toBe(false);
    });

    it('should accept messages exactly 1000 characters', () => {
      const maxMessage = 'a'.repeat(1000);
      expect(isValidMessageContent(maxMessage)).toBe(true);
    });

    it('should accept messages with unicode characters', () => {
      expect(isValidMessageContent('Olá mundo')).toBe(true);
      expect(isValidMessageContent('你好世界')).toBe(true);
      expect(isValidMessageContent('مرحبا بالعالم')).toBe(true);
    });

    it('should trim whitespace before validation', () => {
      expect(isValidMessageContent('  Hello world  ')).toBe(true);
      expect(isValidMessageContent('\n\nMessage\n\n')).toBe(true);
    });
  });
});

describe('MessageSid Validator', () => {
  describe('isValidMessageSid', () => {
    it('should accept valid message SIDs', () => {
      expect(isValidMessageSid('SM_ABC123')).toBe(true);
      expect(isValidMessageSid('uniqueHash')).toBe(true);
      expect(isValidMessageSid('a')).toBe(true);
    });

    it('should accept undefined (optional field)', () => {
      expect(isValidMessageSid(undefined)).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(isValidMessageSid('')).toBe(false);
    });

    it('should accept null (treated as optional)', () => {
      expect(isValidMessageSid(null as any)).toBe(true);
    });
  });
});

describe('Comprehensive Webhook Validation', () => {
  describe('validateWebhookPayload', () => {
    it('should pass validation with all required fields', () => {
      const result = validateWebhookPayload(
        'SM_ABC123',
        '+551194601258',
        'Hello world'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation without MessageSid (auto-generated)', () => {
      const result = validateWebhookPayload(
        undefined,
        '+551194601258',
        'Hello world'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid phone number', () => {
      const result = validateWebhookPayload(
        'SM_ABC123',
        '+55115',
        'Hello world'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid phone number format'))).toBe(true);
    });

    it('should fail with empty message body', () => {
      const result = validateWebhookPayload(
        'SM_ABC123',
        '+551194601258',
        ''
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Body field is required') || e.includes('Message body must be between 1 and 1000 characters'))).toBe(true);
    });

    it('should fail with message body too long', () => {
      const longMessage = 'a'.repeat(1001);
      const result = validateWebhookPayload(
        'SM_ABC123',
        '+551194601258',
        longMessage
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Message body must be between 1 and 1000 characters'))).toBe(true);
    });

    it('should fail with multiple validation errors', () => {
      const result = validateWebhookPayload(
        'SM_ABC123',
        '+55115',
        ''
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should fail when all required fields are missing', () => {
      const result = validateWebhookPayload(
        undefined,
        '',
        ''
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide detailed error messages', () => {
      const result = validateWebhookPayload(
        'SM_ABC123',
        'invalid-phone',
        'Test'
      );
      expect(result.errors[0]).toContain('Invalid phone number format');
      expect(result.errors[0]).toContain('E.164 format');
    });

    it('should validate multiple concurrent requests independently', () => {
      const result1 = validateWebhookPayload(
        undefined,
        '+551194601258',
        'Message 1'
      );
      const result2 = validateWebhookPayload(
        undefined,
        '+55115',
        'Message 2'
      );

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle phone numbers from different countries', () => {
    const validNumbers = [
      '+1201255300',        // USA
      '+441234567890',      // UK
      '+33123456789',       // France
      '+491234567890',      // Germany
      '+551194601258',      // Brazil
      '+81312345678',       // Japan
      '+8613800138000'      // China
    ];

    validNumbers.forEach(phone => {
      expect(isValidPhoneNumber(phone)).toBe(true);
    });
  });

  it('should reject phone numbers with special formatting', () => {
    const invalidNumbers = [
      '+1 (201) 255 3000',
      '+1-201-255-3000',
      '+1 201 255 3000',
      '1 201 255 3000'
    ];

    invalidNumbers.forEach(phone => {
      expect(isValidPhoneNumber(phone)).toBe(false);
    });
  });

  it('should handle very long messages near the limit', () => {
    const message999 = 'a'.repeat(999);
    const message1000 = 'a'.repeat(1000);
    const message1001 = 'a'.repeat(1001);

    expect(isValidMessageContent(message999)).toBe(true);
    expect(isValidMessageContent(message1000)).toBe(true);
    expect(isValidMessageContent(message1001)).toBe(false);
  });
});
