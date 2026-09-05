import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, tokenStore } from "@/api/client";

const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
let socket: Socket | null = null;

export const getSocket = () => {
  const token = tokenStore.get();
  if (!socket) {
    socket = io(SOCKET_ORIGIN, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: { token },
    });
  } else {
    socket.auth = { token };
  }
  if (!socket.connected) socket.connect();
  return socket;
};
