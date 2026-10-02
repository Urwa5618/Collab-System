import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { EditorContent } from '@tiptap/react';
import { useCollaborativeDocument } from '../hooks/useCollaborativeDocument';

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { editor, activeUsers, isLoading } = useCollaborativeDocument(id!);

  if (isLoading) return <div>Loading document...</div>;

  return (
    <div className="container editor-page">
      <div className="flex-row">
        <Link to="/">Back</Link>
        <div className="active-users">
          {activeUsers.map(u => (
            <span key={u.socketId} style={{ backgroundColor: u.color }} className="user-dot">
              {u.email}
            </span>
          ))}
        </div>
      </div>

      {editor && (
        <div className="toolbar">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Bold</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>Italic</button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''}>Bullet List</button>
        </div>
      )}

      <div className="editor-content-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
