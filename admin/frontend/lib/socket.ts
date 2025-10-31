import { io, Socket } from "socket.io-client"
const API_ROOT = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8017"

let socket: Socket | null = null

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(API_ROOT, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            transports: ["websocket"],
        })
    }

    socket.on("connect", () => {
        console.log("Socket connected:", socket?.id)
    })

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
    })

    return socket
}