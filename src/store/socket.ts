// src/libstore/socket.ts
import { io, Socket } from 'socket.io-client';
import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { browser } from '$app/environment';

let socketInstance: Socket | null = null;
let playerId: string | null = null;

if (browser) {
    // Wait for the browser to be ready before accessing localStorage
    playerId = localStorage.getItem('playerId');
    if (!playerId) {
        playerId = uuidv4();
        localStorage.setItem('playerId', playerId);
        console.log('Generated new player ID:', playerId);
    }
}
// Use a writable store to expose the socket instance reactively
export const socket = writable<Socket | null>(null);

// Use environment variable to determine server URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function initSocket(token: string) {
    if (socketInstance) return; // Already initialized

    socketInstance = io(SOCKET_URL, {
        auth: {
            token,
            anonId: playerId
        },
        withCredentials: true,
        autoConnect: true,
        transports: ['websocket'], // Explicitly prefer WebSocket
    });

    socketInstance.on('connect', () => {
        console.log('Socket connected');
        socket.set(socketInstance);
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });

    socketInstance.connect();
}

export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socket.set(null);
        socketInstance = null;
    }
}
