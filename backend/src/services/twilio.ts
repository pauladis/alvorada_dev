import { v4 as uuid } from 'uuid';

export interface SendSMSOptions {
  to: string;
  body: string;
}

export interface SendSMSResult {
  sid: string;
  to: string;
  body: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
}

class TwilioService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'mock_account_sid';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || 'mock_auth_token';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
  }

  async sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
    // Mock Twilio API call
    const result: SendSMSResult = {
      sid: `SM${uuid().replace(/-/g, '').substring(0, 30)}`,
      to: options.to,
      body: options.body,
      status: 'queued',
    };

    console.log(`[Twilio Mock] Sending SMS to ${options.to}: ${options.body}`);
    return result;
  }

  getFromNumber(): string {
    return this.fromNumber;
  }
}

export const twilioService = new TwilioService();
