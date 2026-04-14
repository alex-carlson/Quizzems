import { writable } from 'svelte/store';

interface Toast {
    id: number;
    message: string;
    type: string;
    duration: number;
    removing: boolean;
}

export const toasts = writable<Toast[]>([]); // Each toast is an object with { id, message, type, duration, removing }

let id = 0;

export function addToast({ message, type = 'info', duration = 3000 }: {
    message: string;
    type?: string;
    duration?: number;
}) {
    id++;
    const toast = { id, message, type, duration, removing: false };
    toasts.update((all) => [...all, toast]);

    // Start fade out before removing
    setTimeout(() => {
        toasts.update((all) =>
            all.map((t) => t.id === toast.id ? { ...t, removing: true } : t)
        );

        // Remove the toast after fade animation
        setTimeout(() => {
            toasts.update((all) => all.filter((t) => t.id !== toast.id));
        }, 300); // 300ms for fade out animation
    }, duration);
}

export function removeToast(toastId: number) {
    toasts.update((all) =>
        all.map((t) => t.id === toastId ? { ...t, removing: true } : t)
    );

    // Remove the toast after fade animation
    setTimeout(() => {
        toasts.update((all) => all.filter((t) => t.id !== toastId));
    }, 300); // 300ms for fade out animation
}