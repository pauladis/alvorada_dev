/**
 * Phone number validator
 * Validates E.164 format: +[country code][number]
 * E.164 requires: + followed by 1-15 digits (total 7-15 digits for valid numbers)
 * Example: +1234567890 (10 digits), +551194601258 (12 digits)
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // E.164 format: + followed by 6-15 digits (minimum 7 digits total for validity)
  // Most real phone numbers are 7-15 digits
  const e164Regex = /^\+[1-9]\d{5,14}$/;
  return e164Regex.test(phone);
}

/**
 * Message content validator
 * Ensures message is not empty and reasonable length
 */
export function isValidMessageContent(content: string): boolean {
  if (!content) return false;
  
  // Message should be between 1 and 1000 characters
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 1000;
}

/**
 * MessageSid validator (if provided)
 * Must be a non-empty string
 */
export function isValidMessageSid(sid: string | undefined): boolean {
  if (sid === undefined || sid === null) return true; // Optional field
  if (typeof sid !== 'string') return false; // Must be string if provided
  return sid.length > 0; // Must not be empty
}

/**
 * Comprehensive webhook payload validator
 */
export interface WebhookValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWebhookPayload(
  messageSid: string | undefined,
  from: string,
  body: string
): WebhookValidationResult {
  const errors: string[] = [];

  // Validate From (phone number)
  if (!from) {
    errors.push('From field is required');
  } else if (!isValidPhoneNumber(from)) {
    errors.push(`Invalid phone number format: "${from}". Must be in E.164 format (e.g., +1234567890)`);
  }

  // Validate Body (message content)
  if (!body) {
    errors.push('Body field is required');
  } else if (!isValidMessageContent(body)) {
    errors.push('Message body must be between 1 and 1000 characters');
  }

  // Validate MessageSid (optional)
  if (!isValidMessageSid(messageSid)) {
    errors.push('MessageSid must be a non-empty string if provided');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
