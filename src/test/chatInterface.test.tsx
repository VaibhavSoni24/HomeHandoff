import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatInterface } from '../components/ChatInterface';
import { createInitialSeedState } from '../data/seedData';
import type { ChatMessage, ToolCall } from '../types/household';

describe('ChatInterface: Tool execution status badge and icon', () => {
  const createMockStateWithToolStatus = (status: 'success' | 'failed' | 'executing') => {
    const seed = createInitialSeedState();
    const toolCall: ToolCall = {
      id: `tool-${status}-1`,
      timestamp: new Date().toISOString(),
      toolName: 'tasks.createTask',
      description: `Test task creation with status ${status}`,
      input: { title: 'Test Task' },
      output: { success: status === 'success' },
      status,
      executionTimeMs: 120
    };

    const message: ChatMessage = {
      id: `msg-${status}-1`,
      sender: 'assistant',
      text: `Executed tool with status ${status}`,
      timestamp: new Date().toISOString(),
      toolCalls: [toolCall]
    };

    seed.chatHistory = [message];
    return seed;
  };

  it('renders "tool-status-pill success" with CheckCircle2 icon for success status', () => {
    const state = createMockStateWithToolStatus('success');
    const html = renderToStaticMarkup(
      <ChatInterface
        state={state}
        onSendMessage={() => {}}
        onSelectTab={() => {}}
        isProcessing={false}
        isSpeaking={false}
      />
    );

    // Verify badge class
    expect(html).toContain('tool-status-pill success');
    expect(html).not.toContain('tool-status-pill failed');
    expect(html).not.toContain('tool-status-pill executing');

    // Verify status text
    expect(html).toContain('success');

    // Verify CheckCircle2 icon (lucide renders lucide-check-circle-2 class)
    expect(html).toContain('lucide-check-circle-2');
    expect(html).not.toContain('lucide-alert-circle');
    expect(html).not.toContain('lucide-circle-alert');
  });

  it('renders "tool-status-pill failed" with AlertCircle icon for failed status', () => {
    const state = createMockStateWithToolStatus('failed');
    const html = renderToStaticMarkup(
      <ChatInterface
        state={state}
        onSendMessage={() => {}}
        onSelectTab={() => {}}
        isProcessing={false}
        isSpeaking={false}
      />
    );

    // Verify badge class
    expect(html).toContain('tool-status-pill failed');
    expect(html).not.toContain('tool-status-pill success');
    expect(html).not.toContain('tool-status-pill executing');

    // Verify status text
    expect(html).toContain('failed');

    // Verify AlertCircle icon (lucide renders lucide-alert-circle or lucide-circle-alert class)
    const hasAlertIcon = html.includes('lucide-alert-circle') || html.includes('lucide-circle-alert');
    expect(hasAlertIcon).toBe(true);
    expect(html).not.toContain('lucide-check-circle-2');
  });

  it('renders "tool-status-pill executing" with Clock icon for executing status', () => {
    const state = createMockStateWithToolStatus('executing');
    const html = renderToStaticMarkup(
      <ChatInterface
        state={state}
        onSendMessage={() => {}}
        onSelectTab={() => {}}
        isProcessing={false}
        isSpeaking={false}
      />
    );

    // Verify badge class
    expect(html).toContain('tool-status-pill executing');
    expect(html).not.toContain('tool-status-pill success');
    expect(html).not.toContain('tool-status-pill failed');

    // Verify status text
    expect(html).toContain('executing');

    // Verify Clock icon
    expect(html).toContain('lucide-clock');
    expect(html).not.toContain('lucide-check-circle-2');
    expect(html).not.toContain('lucide-alert-circle');
    expect(html).not.toContain('lucide-circle-alert');
  });
});
