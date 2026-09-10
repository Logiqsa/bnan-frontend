import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, tokenStore } from "@/api/client";

const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
let socket: Socket | null = null;
let socketToken: string | null = null;

export const getSocket = () => {
  const token = tokenStore.get();
  if (!socket) {
    socket = io(SOCKET_ORIGIN, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socketToken = token;
  } else if (socketToken !== token) {
    // Socket.IO only reads auth during a handshake, so reconnect after an
    // account switch instead of keeping the previous user's private room.
    socket.disconnect();
    socket.auth = { token };
    socketToken = token;
  }
  if (!socket.connected) socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  socketToken = null;
};
