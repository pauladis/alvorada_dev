import { EventEmitter } from 'events';

export interface QueuedMessage {
  messageId: string;
  conversationId: string;
  phoneNumber: string;
  content: string;
  twilioMessageId: string;
  retryCount: number;
}

export class MessageQueue extends EventEmitter {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private maxRetries = 1;

  async enqueue(message: QueuedMessage): Promise<void> {
    this.queue.push(message);
    this.emit('enqueued', message);
    await this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const message = this.queue.shift()!;

    this.emit('processing', message);

    // Allow external handlers to process
    // Handler should call either markSuccess or markFailure
    // If neither is called within timeout, it's an error
  }

  markSuccess(messageId: string): void {
    this.emit('success', messageId);
    this.processing = false;
    void this.processNext();
  }

  markFailure(messageId: string, error: Error): void {
    this.emit('failure', { messageId, error });
    this.processing = false;
    void this.processNext();
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

export const messageQueue = new MessageQueue();
