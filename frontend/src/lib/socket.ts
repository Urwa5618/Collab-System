import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
      auth: { token: localStorage.getItem('token') },
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const reconnectWithNewToken = () => {
  if (socket) {
    socket.disconnect();
    socket.auth = { token: localStorage.getItem('token') };
    socket.connect();
  } else {
    connectSocket();
  }
};
