import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { query } from "../config/db";
import type { CursorEvent, OperationEvent, SocketUser } from "../types";
import { assignColor } from "./colors";
import {
  addActiveUser,
  deleteSession,
  getActiveUsers,
  getSession,
  removeActiveUser,
  saveSession,
  updateCursorPosition
} from "./redisHelpers";
import { loadDocumentState } from "./documentLoader";
import { handleOperation } from "./operationHandler";

type SocketAuthData = {
  user?: SocketUser;
};

const getSocketUser = (socket: Socket): SocketUser | null => {
  const data = socket.data as SocketAuthData;
  return data.user ?? null;
};

export const initWebSocket = (io: Server): void => {
  io.use((socket, next) => {
    const authHeader = socket.handshake.headers.authorization;
    const headerToken =
      typeof authHeader === "string"
        ? authHeader.replace("Bearer ", "")
        : undefined;
    const handshakeToken =
      typeof socket.handshake.auth.token === "string"
        ? socket.handshake.auth.token
        : undefined;
    const token = handshakeToken || headerToken;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error("Server configuration error"));
      }

      const decoded = jwt.verify(token, secret) as {
        userId: string;
        email: string;
      };

      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_document", async (payload: { docId?: string }) => {
      if (!payload?.docId) {
        socket.emit("error", { message: "docId required" });
        return;
      }

      const user = getSocketUser(socket);
      if (!user) {
        socket.emit("error", { message: "Authentication required" });
        return;
      }

      const docId = payload.docId;

      try {
        const accessResult = await query(
          "SELECT d.doc_id, d.workspace_id FROM documents d JOIN workspace_members wm ON d.workspace_id = wm.workspace_id WHERE d.doc_id = $1 AND wm.user_id = $2 AND d.is_deleted = FALSE",
          [docId, user.userId]
        );

        if (accessResult.rows.length === 0) {
          socket.emit("error", {
            message: "Document not found or access denied"
          });
          return;
        }

        socket.join(docId);

        await saveSession(socket.id, user.userId, user.email, docId);
        const color = assignColor(user.userId);
        await addActiveUser(docId, socket.id, user.userId, user.email, color);

        const content = await loadDocumentState(docId);
        const activeUsers = await getActiveUsers(docId);

        socket.emit("document_state", {
          docId,
          content,
          activeUsers
        });

        socket.to(docId).emit("user_joined", {
          userId: user.userId,
          email: user.email,
          socketId: socket.id,
          color
        });

        console.log(`User ${user.userId} joined document ${docId}`);
      } catch (err) {
        console.error("join_document error", err);
        socket.emit("error", { message: "Failed to join document" });
      }
    });

    socket.on("leave_document", async (payload: { docId?: string }) => {
      const user = getSocketUser(socket);
      if (!user || !payload?.docId) {
        return;
      }

      const docId = payload.docId;

      try {
        socket.leave(docId);
        await removeActiveUser(docId, socket.id);
        await deleteSession(socket.id);
        socket.to(docId).emit("user_left", {
          userId: user.userId,
          socketId: socket.id
        });

        console.log(`User ${user.userId} left document ${docId}`);
      } catch (err) {
        console.error("leave_document error", err);
      }
    });

    socket.on("operation", async (op: OperationEvent) => {
      const user = getSocketUser(socket);
      if (!user) {
        socket.emit("error", { message: "Authentication required" });
        return;
      }

      const session = await getSession(socket.id);
      if (!session) {
        socket.emit("error", { message: "Not in a document session" });
        return;
      }

      if (!op || typeof op.type !== "string" || op.position === undefined) {
        socket.emit("error", { message: "Invalid operation payload" });
        return;
      }

      try {
        const processedOp = await handleOperation(
          session.docId,
          user.userId,
          op
        );

        if (processedOp.noop) {
          socket.emit("operation_ack", { opId: op.opId, serverVersion: -1, noop: true });
          return;
        }

        socket.to(session.docId).emit("operation", processedOp);
        socket.emit("operation_ack", {
          opId: op.opId,
          serverVersion: processedOp.serverVersion
        });
      } catch (err) {
        console.error("operation error", err);
        socket.emit("error", { message: "Failed to process operation" });
      }
    });

    socket.on("cursor_update", async (payload: CursorEvent) => {
      const user = getSocketUser(socket);
      if (!user) {
        return;
      }

      const session = await getSession(socket.id);
      if (!session) {
        return;
      }

      try {
        await updateCursorPosition(
          session.docId,
          socket.id,
          payload.position,
          payload.selection
        );

        socket.to(session.docId).emit("cursor_update", {
          userId: user.userId,
          socketId: socket.id,
          position: payload.position,
          selection: payload.selection
        });
      } catch (err) {
        console.error("cursor_update error", err);
      }
    });

    socket.on("disconnect", async () => {
      try {
        const session = await getSession(socket.id);
        if (session) {
          await removeActiveUser(session.docId, socket.id);
          socket.to(session.docId).emit("user_left", {
            userId: session.userId,
            socketId: socket.id
          });
          await deleteSession(socket.id);
        }
      } catch (err) {
        console.error("disconnect error", err);
      } finally {
        console.log(`Socket ${socket.id} disconnected`);
      }
    });
  });
};
