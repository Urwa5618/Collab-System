import { useEffect, useRef, useState } from 'react';
import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { v4 as uuidv4 } from 'uuid';
import { ActiveUser, OTOperation } from '../types';
import { getSocket } from '../lib/socket';

// Converts a plain-text character position into a ProseMirror document position.
function plainTextPosToDocPos(editor: Editor, textPos: number): number {
  let resultPos: number | null = null;
  let textSeen = 0;

  editor.state.doc.descendants((node, pos) => {
    if (resultPos !== null) return false;
    if (node.isText) {
      const nodeTextLength = node.text?.length ?? 0;
      if (textSeen + nodeTextLength >= textPos) {
        resultPos = pos + (textPos - textSeen);
        return false;
      }
      textSeen += nodeTextLength;
    }
    return true;
  });

  if (resultPos === null) {
    resultPos = editor.state.doc.content.size;
  }
  return resultPos;
}

export function useCollaborativeDocument(docId: string) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clientVersionRef = useRef(0);
  const isApplyingRemoteOp = useRef(false);
  const docIdRef = useRef(docId);
  docIdRef.current = docId;

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor, transaction }) => {
      // Skip if this update came from us applying a remote operation
      if (isApplyingRemoteOp.current) return;

      // Skip if the transaction didn't actually change the document
      // (e.g. selection-only changes)
      if (!transaction.docChanged) return;

      const socket = getSocket();

      // Walk every step in this transaction. Tiptap/ProseMirror already
      // knows exactly what changed (no diffing needed) — each step has
      // a from/to range and the slice of content that replaced it.
      transaction.steps.forEach((step) => {
        const stepMap = step as unknown as {
          from?: number;
          to?: number;
          slice?: { content: { size: number }; textBetween?: (a: number, b: number) => string };
          toJSON: () => { from?: number; to?: number; slice?: { content?: unknown } };
        };

        const json = stepMap.toJSON();
        if (json.from === undefined) return;

        const from = json.from;
        const to = json.to ?? json.from;
        const insertedText = stepMap.slice
          ? editor.state.doc.textBetween(from, from + (stepMap.slice.content?.size ?? 0))
          : '';

        // Determine plain-text position by counting text before `from`
        // in the doc BEFORE this step (use the editor's current resolved doc).
        const plainTextPos = editor.state.doc.textBetween(0, from).length;

        const deletedLength = to - from;

        if (deletedLength > 0) {
          const op: Partial<OTOperation> = {
            opId: uuidv4(),
            type: 'delete',
            position: plainTextPos,
            length: deletedLength,
            clientVersion: clientVersionRef.current,
          };
          socket.emit('operation', op);
        }

        if (insertedText.length > 0) {
          const op: Partial<OTOperation> = {
            opId: uuidv4(),
            type: 'insert',
            position: plainTextPos,
            content: insertedText,
            clientVersion: clientVersionRef.current,
          };
          socket.emit('operation', op);
        }
      });
    },
  });

  useEffect(() => {
    if (!editor) return;

    const socket = getSocket();

    socket.emit('join_document', { docId });

    socket.on('document_state', (payload) => {
      isApplyingRemoteOp.current = true;
      editor.commands.setContent(payload.content || '');
      isApplyingRemoteOp.current = false;

      clientVersionRef.current = payload.version || 0;
      setActiveUsers(payload.activeUsers || []);
      setIsConnected(true);
      setIsLoading(false);
    });

    socket.on('operation', (op: OTOperation) => {
      isApplyingRemoteOp.current = true;
      try {
        if (op.type === 'insert' && op.content) {
          const docPos = plainTextPosToDocPos(editor, op.position);
          editor.commands.insertContentAt(docPos, op.content);
        } else if (op.type === 'delete' && op.length) {
          const fromPos = plainTextPosToDocPos(editor, op.position);
          const toPos = plainTextPosToDocPos(editor, op.position + op.length);
          editor.commands.deleteRange({ from: fromPos, to: toPos });
        }
      } finally {
        isApplyingRemoteOp.current = false;
      }
    });

    socket.on('user_joined', (user: ActiveUser) => {
      setActiveUsers((prev) => [...prev, user]);
    });

    socket.on('user_left', (payload: { socketId: string }) => {
      setActiveUsers((prev) => prev.filter((u) => u.socketId !== payload.socketId));
    });

    socket.on('operation_ack', (ack: { opId: string; serverVersion: number; noop?: boolean }) => {
      if (!ack.noop) {
        clientVersionRef.current = ack.serverVersion;
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    return () => {
      socket.emit('leave_document', { docId });
      socket.off('document_state');
      socket.off('operation');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('operation_ack');
      socket.off('error');
    };
  }, [docId, editor]);

  return { editor, activeUsers, isConnected, isLoading };
}