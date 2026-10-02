import { redisClient } from "../config/redis";
import type { ActiveUser, CursorEvent, DocumentSession } from "../types";

const SESSION_TTL_SECONDS = 3600;
const ACTIVE_USERS_TTL_SECONDS = 86400;
const DOC_STATE_TTL_SECONDS = 1800;

type StoredActiveUser = Omit<ActiveUser, "cursorPosition"> & {
  cursorPosition: number | null;
  selection?: CursorEvent["selection"];
};

const sessionKey = (socketId: string) => `session:${socketId}`;
const activeUsersKey = (docId: string) => `doc:${docId}:users`;
const documentStateKey = (docId: string) => `doc:${docId}:state`;

export const saveSession = async (
  socketId: string,
  userId: string,
  email: string,
  docId: string
): Promise<DocumentSession> => {
  const session: DocumentSession = {
    socketId,
    userId,
    email,
    docId,
    connectedAt: new Date().toISOString()
  };

  await redisClient.setex(
    sessionKey(socketId),
    SESSION_TTL_SECONDS,
    JSON.stringify(session)
  );

  return session;
};

export const getSession = async (
  socketId: string
): Promise<DocumentSession | null> => {
  const value = await redisClient.get(sessionKey(socketId));
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as DocumentSession;
  } catch {
    return null;
  }
};

export const deleteSession = async (socketId: string): Promise<void> => {
  await redisClient.del(sessionKey(socketId));
};

export const addActiveUser = async (
  docId: string,
  socketId: string,
  userId: string,
  email: string,
  color: string
): Promise<void> => {
  const key = activeUsersKey(docId);
  const payload: StoredActiveUser = {
    userId,
    email,
    socketId,
    color,
    cursorPosition: null
  };

  await redisClient.hset(key, socketId, JSON.stringify(payload));
  await redisClient.expire(key, ACTIVE_USERS_TTL_SECONDS);
};

export const removeActiveUser = async (
  docId: string,
  socketId: string
): Promise<void> => {
  await redisClient.hdel(activeUsersKey(docId), socketId);
};

export const getActiveUsers = async (docId: string): Promise<ActiveUser[]> => {
  const values = await redisClient.hgetall(activeUsersKey(docId));
  const users: ActiveUser[] = [];

  for (const value of Object.values(values)) {
    try {
      const parsed = JSON.parse(value) as StoredActiveUser;
      const cursorPosition =
        parsed.cursorPosition === null ? undefined : parsed.cursorPosition;

      users.push({
        userId: parsed.userId,
        email: parsed.email,
        socketId: parsed.socketId,
        color: parsed.color,
        cursorPosition
      });
    } catch {
      continue;
    }
  }

  return users;
};

export const updateCursorPosition = async (
  docId: string,
  socketId: string,
  position: number,
  selection?: CursorEvent["selection"]
): Promise<void> => {
  const key = activeUsersKey(docId);
  const value = await redisClient.hget(key, socketId);
  if (!value) {
    return;
  }

  let parsed: StoredActiveUser;
  try {
    parsed = JSON.parse(value) as StoredActiveUser;
  } catch {
    return;
  }

  parsed.cursorPosition = position;
  if (selection) {
    parsed.selection = selection;
  } else {
    delete parsed.selection;
  }

  await redisClient.hset(key, socketId, JSON.stringify(parsed));
};

export const getDocumentState = async (docId: string): Promise<string | null> =>
  redisClient.get(documentStateKey(docId));

export const setDocumentState = async (
  docId: string,
  content: string
): Promise<void> => {
  await redisClient.setex(documentStateKey(docId), DOC_STATE_TTL_SECONDS, content);
};
