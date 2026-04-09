import { writable, get } from 'svelte/store';

export function createQuizStore() {
    const { subscribe, update, set } = writable({
        hasInitialized: false,
        isLoading: false,
        isComplete: false,
        showModal: false,
        currentMode: 'FLASH_CARDS', // or 'MULTIPLE_CHOICE', etc.
        isPractice: false,
        isGrid: false,
        isFullscreen: false,
        shuffleTrigger: 0,
        stats: {
            correct: 0,
            total: 0,
            percentage: 0,
            isComplete: false
        },
        collection: null // meta info about quiz/collection
    });

    return {
        subscribe,

        // Initialize quiz with metadata (no cards)
        initialize: (collectionData) => {
            update((state) => ({
                ...state,
                hasInitialized: true,
                isLoading: false,
                collection: collectionData || null
            }));
        },

        setMode: (mode) => update((state) => ({ ...state, currentMode: mode })),

        setIsPractice: (practice) => update((state) => ({ ...state, isPractice: practice })),

        toggleGrid: () => update((state) => ({ ...state, isGrid: !state.isGrid })),

        toggleFullscreen: () =>
            update((state) => ({ ...state, isFullscreen: !state.isFullscreen })),

        setStats: (statsUpdate) =>
            update((state) => ({
                ...state,
                stats: { ...state.stats, ...statsUpdate }
            })),

        completeQuiz: async (userId, token) => {
            // mark quiz complete
            update((state) => ({ ...state, isComplete: true, showModal: true }));
            // Optionally send completion to server
            try {
                if (userId && token) {
                    await fetch(`/api/quiz/complete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ userId })
                    });
                }
            } catch (err) {
                console.error('Failed to report quiz completion', err);
            }
        },

        openModal: () => update((state) => ({ ...state, showModal: true })),
        closeModal: () => update((state) => ({ ...state, showModal: false })),

        resetQuiz: () =>
            set({
                hasInitialized: false,
                isLoading: false,
                isComplete: false,
                showModal: false,
                currentMode: 'FLASH_CARDS',
                isPractice: false,
                isGrid: false,
                isFullscreen: false,
                shuffleTrigger: 0,
                stats: {
                    correct: 0,
                    total: 0,
                    percentage: 0,
                    isComplete: false
                },
                collection: null
            })
    };
}