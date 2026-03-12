import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from '../App';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SMS Admin Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the app with header and navigation', () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    render(<App />);

    expect(screen.getByText('SMS Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText(/DLQ/)).toBeInTheDocument();
  });

  it('should fetch and display conversations', async () => {
    const mockConversations = [
      {
        id: '1',
        phoneNumber: '+11111111111',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: mockConversations });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('+11111111111')).toBeInTheDocument();
    });
  });

  it('should show empty state when no conversations exist', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });
  });

  it('should navigate to conversation detail when clicking on a conversation', async () => {
    const mockConversations = [
      {
        id: '1',
        phoneNumber: '+11111111111',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const mockMessages = [
      {
        id: '1',
        conversationId: '1',
        direction: 'inbound' as const,
        content: 'Test message',
        status: 'sent' as const,
        twilioMessageId: 'SM123',
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: mockMessages });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('+11111111111')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+11111111111'));

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should navigate to DLQ view when clicking DLQ button', async () => {
    const mockConversations = [];
    const mockDLQ = [
      {
        id: '1',
        messageId: 'msg-123',
        reason: 'Max retries exceeded',
        failedAttempts: 2,
        lastError: 'Test error',
        createdAt: Date.now(),
      },
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: mockDLQ });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Conversations')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/DLQ/));

    await waitFor(() => {
      expect(screen.getByText('Dead Letter Queue')).toBeInTheDocument();
      expect(screen.getByText('Max retries exceeded')).toBeInTheDocument();
    });
  });

  it('should go back to conversations from detail view', async () => {
    const mockConversations = [
      {
        id: '1',
        phoneNumber: '+11111111111',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const mockMessages: any[] = [];

    mockedAxios.get
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: mockMessages })
      .mockResolvedValueOnce({ data: mockConversations });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('+11111111111')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+11111111111'));

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    await user.click(screen.getByText('← Back'));

    await waitFor(() => {
      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.queryByText('← Back')).not.toBeInTheDocument();
    });
  });

  it('should display message details correctly', async () => {
    const mockConversations = [
      {
        id: '1',
        phoneNumber: '+11111111111',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const mockMessages = [
      {
        id: '1',
        conversationId: '1',
        direction: 'inbound' as const,
        content: 'Hello from user',
        status: 'sent' as const,
        twilioMessageId: 'SM123',
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        conversationId: '1',
        direction: 'outbound' as const,
        content: 'Message received and processed: "Hello from user"',
        status: 'sent' as const,
        twilioMessageId: 'SM124',
        retryCount: 0,
        createdAt: Date.now() + 1000,
        updatedAt: Date.now() + 1000,
      },
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: mockMessages });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('+11111111111')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+11111111111'));

    await waitFor(() => {
      expect(screen.getByText('Hello from user')).toBeInTheDocument();
      expect(screen.getByText(/Message received and processed/)).toBeInTheDocument();
    });
  });
});
