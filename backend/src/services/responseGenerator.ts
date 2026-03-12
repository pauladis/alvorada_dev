/**
 * Smart response generator for SMS messages
 * Uses keyword matching to provide contextual responses
 */

export interface GeneratedResponse {
  content: string;
  category: string;
  confidence: number;
}

export function generateSmartResponse(userMessage: string): GeneratedResponse {
  const lower = userMessage.toLowerCase().trim();
  
  // Greetings
  if (matchesKeywords(lower, ['hello', 'hi', 'hey', 'greetings', 'sup'])) {
    return {
      content: 'Hi there! 👋 How can I help you today?',
      category: 'greeting',
      confidence: 0.95,
    };
  }

  // Help request
  if (matchesKeywords(lower, ['help', 'support', 'assist', 'need help', 'stuck'])) {
    return {
      content: 'I can help with: 📋 Account info, 📦 Orders, 💬 Support tickets. What do you need?',
      category: 'help_request',
      confidence: 0.9,
    };
  }

  // Order inquiry
  if (matchesKeywords(lower, ['order', 'purchase', 'bought', 'shipping', 'delivery', 'status'])) {
    return {
      content: 'You have 3 recent orders. Reply with ORDER ID for tracking info. 📦',
      category: 'order_inquiry',
      confidence: 0.85,
    };
  }

  // Account/billing
  if (matchesKeywords(lower, ['account', 'bill', 'charge', 'payment', 'invoice', 'balance'])) {
    return {
      content: 'Account info updated. Your current balance: $450.00. Need anything else? 💳',
      category: 'account_inquiry',
      confidence: 0.88,
    };
  }

  // Time/date request
  if (matchesKeywords(lower, ['time', 'date', 'what time', 'current time'])) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
    return {
      content: `⏰ Current time: ${timeStr}`,
      category: 'time_request',
      confidence: 0.95,
    };
  }

  // Thank you
  if (matchesKeywords(lower, ['thank', 'thanks', 'appreciate', 'grateful'])) {
    return {
      content: 'You\'re welcome! Happy to help. 😊',
      category: 'gratitude',
      confidence: 0.92,
    };
  }

  // Complaints/Issues
  if (matchesKeywords(lower, ['problem', 'issue', 'broken', 'not working', 'bug', 'error'])) {
    return {
      content: '😞 Sorry to hear! Our support team will help. What\'s the issue?',
      category: 'complaint',
      confidence: 0.85,
    };
  }

  // Yes/No questions
  if (matchesKeywords(lower, ['yes', 'yep', 'yeah', 'sure', 'ok', 'okay'])) {
    return {
      content: 'Great! 👍 What would you like to do next?',
      category: 'affirmation',
      confidence: 0.9,
    };
  }

  if (matchesKeywords(lower, ['no', 'nope', 'never', 'don\'t', 'cant', 'won\'t'])) {
    return {
      content: 'No problem! Is there anything else I can help with? 🤔',
      category: 'negation',
      confidence: 0.85,
    };
  }

  // Default response (fallback)
  return {
    content: `Got it: "${truncateMessage(userMessage, 30)}". How can I help? 💬`,
    category: 'default',
    confidence: 0.5,
  };
}

/**
 * Check if message contains any of the given keywords
 */
function matchesKeywords(message: string, keywords: string[]): boolean {
  return keywords.some(keyword => {
    // Create regex for word boundary matching
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(message);
  });
}

/**
 * Truncate message to max length
 */
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
}

/**
 * Analyze message sentiment
 */
export function analyzeSentiment(userMessage: string): 'positive' | 'neutral' | 'negative' {
  const lower = userMessage.toLowerCase();

  const positiveKeywords = ['thank', 'love', 'great', 'excellent', 'awesome', 'happy', 'good', 'perfect'];
  const negativeKeywords = ['angry', 'hate', 'terrible', 'awful', 'broken', 'useless', 'disappointed', 'upset'];

  const hasPositive = positiveKeywords.some(k => lower.includes(k));
  const hasNegative = negativeKeywords.some(k => lower.includes(k));

  if (hasNegative && !hasPositive) return 'negative';
  if (hasPositive && !hasNegative) return 'positive';
  return 'neutral';
}
