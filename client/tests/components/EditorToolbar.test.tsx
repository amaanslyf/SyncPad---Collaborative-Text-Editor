import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorToolbar } from '../../src/components/Editor/EditorToolbar';

// Mock TipTap editor
const createMockEditor = (activeMarks: string[] = []) => ({
  chain: () => ({
    focus: () => ({
      toggleBold: () => ({ run: vi.fn() }),
      toggleItalic: () => ({ run: vi.fn() }),
      toggleUnderline: () => ({ run: vi.fn() }),
      toggleStrike: () => ({ run: vi.fn() }),
      toggleHeading: () => ({ run: vi.fn() }),
      toggleBulletList: () => ({ run: vi.fn() }),
      toggleOrderedList: () => ({ run: vi.fn() }),
      toggleBlockquote: () => ({ run: vi.fn() }),
      toggleCodeBlock: () => ({ run: vi.fn() }),
      setHorizontalRule: () => ({ run: vi.fn() }),
    }),
  }),
  isActive: (type: string) => activeMarks.includes(type),
});

describe('EditorToolbar', () => {
  it('renders all formatting buttons', () => {
    const mockEditor = createMockEditor();
    // @ts-expect-error — simplified mock
    render(<EditorToolbar editor={mockEditor} />);

    expect(screen.getByLabelText('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic (Ctrl+I)')).toBeInTheDocument();
    expect(screen.getByLabelText('Underline (Ctrl+U)')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet List')).toBeInTheDocument();
    expect(screen.getByLabelText('Blockquote')).toBeInTheDocument();
  });

  it('returns null when editor is null', () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('marks active buttons with active class', () => {
    const mockEditor = createMockEditor(['bold', 'italic']);
    // @ts-expect-error — simplified mock
    render(<EditorToolbar editor={mockEditor} />);

    const boldBtn = screen.getByLabelText('Bold (Ctrl+B)');
    const italicBtn = screen.getByLabelText('Italic (Ctrl+I)');
    const underlineBtn = screen.getByLabelText('Underline (Ctrl+U)');

    expect(boldBtn.className).toContain('editor-toolbar__btn--active');
    expect(italicBtn.className).toContain('editor-toolbar__btn--active');
    expect(underlineBtn.className).not.toContain('editor-toolbar__btn--active');
  });

  it('calls correct action when button is clicked', async () => {
    const runFn = vi.fn();
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: runFn }),
          toggleItalic: () => ({ run: vi.fn() }),
          toggleUnderline: () => ({ run: vi.fn() }),
          toggleStrike: () => ({ run: vi.fn() }),
          toggleHeading: () => ({ run: vi.fn() }),
          toggleBulletList: () => ({ run: vi.fn() }),
          toggleOrderedList: () => ({ run: vi.fn() }),
          toggleBlockquote: () => ({ run: vi.fn() }),
          toggleCodeBlock: () => ({ run: vi.fn() }),
          setHorizontalRule: () => ({ run: vi.fn() }),
        }),
      }),
      isActive: () => false,
    };

    const user = userEvent.setup();
    // @ts-expect-error — simplified mock
    render(<EditorToolbar editor={mockEditor} />);

    await user.click(screen.getByLabelText('Bold (Ctrl+B)'));
    expect(runFn).toHaveBeenCalledOnce();
  });
});
