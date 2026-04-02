import type { Editor } from '@tiptap/react';
import './Editor.css';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const tools = [
    {
      group: 'text',
      items: [
        {
          id: 'bold',
          label: 'B',
          title: 'Bold (Ctrl+B)',
          action: () => editor.chain().focus().toggleBold().run(),
          isActive: () => editor.isActive('bold'),
          style: { fontWeight: 700 } as React.CSSProperties,
        },
        {
          id: 'italic',
          label: 'I',
          title: 'Italic (Ctrl+I)',
          action: () => editor.chain().focus().toggleItalic().run(),
          isActive: () => editor.isActive('italic'),
          style: { fontStyle: 'italic' } as React.CSSProperties,
        },
        {
          id: 'underline',
          label: 'U',
          title: 'Underline (Ctrl+U)',
          action: () => editor.chain().focus().toggleUnderline().run(),
          isActive: () => editor.isActive('underline'),
          style: { textDecoration: 'underline' } as React.CSSProperties,
        },
        {
          id: 'strike',
          label: 'S',
          title: 'Strikethrough',
          action: () => editor.chain().focus().toggleStrike().run(),
          isActive: () => editor.isActive('strike'),
          style: { textDecoration: 'line-through' } as React.CSSProperties,
        },
      ],
    },
    {
      group: 'heading',
      items: [
        {
          id: 'h1',
          label: 'H1',
          title: 'Heading 1',
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          isActive: () => editor.isActive('heading', { level: 1 }),
          style: { fontSize: '13px', fontWeight: 800 } as React.CSSProperties,
        },
        {
          id: 'h2',
          label: 'H2',
          title: 'Heading 2',
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          isActive: () => editor.isActive('heading', { level: 2 }),
          style: { fontSize: '12px', fontWeight: 700 } as React.CSSProperties,
        },
        {
          id: 'h3',
          label: 'H3',
          title: 'Heading 3',
          action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          isActive: () => editor.isActive('heading', { level: 3 }),
          style: { fontSize: '11px', fontWeight: 600 } as React.CSSProperties,
        },
      ],
    },
    {
      group: 'list',
      items: [
        {
          id: 'bulletList',
          label: '•',
          title: 'Bullet List',
          action: () => editor.chain().focus().toggleBulletList().run(),
          isActive: () => editor.isActive('bulletList'),
          style: { fontSize: '18px' } as React.CSSProperties,
        },
        {
          id: 'orderedList',
          label: '1.',
          title: 'Numbered List',
          action: () => editor.chain().focus().toggleOrderedList().run(),
          isActive: () => editor.isActive('orderedList'),
          style: { fontSize: '12px', fontWeight: 600 } as React.CSSProperties,
        },
      ],
    },
    {
      group: 'block',
      items: [
        {
          id: 'blockquote',
          label: '❝',
          title: 'Blockquote',
          action: () => editor.chain().focus().toggleBlockquote().run(),
          isActive: () => editor.isActive('blockquote'),
          style: { fontSize: '16px' } as React.CSSProperties,
        },
        {
          id: 'code',
          label: '<>',
          title: 'Code Block',
          action: () => editor.chain().focus().toggleCodeBlock().run(),
          isActive: () => editor.isActive('codeBlock'),
          style: { fontSize: '11px', fontFamily: 'monospace' } as React.CSSProperties,
        },
        {
          id: 'hr',
          label: '—',
          title: 'Horizontal Rule',
          action: () => editor.chain().focus().setHorizontalRule().run(),
          isActive: () => false,
          style: { fontSize: '16px' } as React.CSSProperties,
        },
      ],
    },
  ];

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
      {tools.map((group, gi) => (
        <div key={group.group} style={{ display: 'contents' }}>
          {gi > 0 && <div className="editor-toolbar__divider" />}
          <div className="editor-toolbar__group">
            {group.items.map((tool) => (
              <button
                key={tool.id}
                id={`toolbar-${tool.id}`}
                className={`editor-toolbar__btn ${tool.isActive() ? 'editor-toolbar__btn--active' : ''}`}
                onClick={tool.action}
                data-tooltip={tool.title}
                data-tooltip-pos="bottom"
                aria-label={tool.title}
                aria-pressed={tool.isActive()}
                style={tool.style}
                type="button"
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
