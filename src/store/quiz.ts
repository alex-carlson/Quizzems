import { writable } from 'svelte/store';
import { fetchCollectionItems } from '$lib/api/items';

const initialState = {
    hasInitialized: false,
    isLoading: false,
    quizStarted: false,
    isComplete: false,
    showModal: false,
    currentMode: 'FLASH_CARDS',
    isPractice: false,
    isGrid: false,
    isFullscreen: false,
    isShuffle: true,
    collection: null,
    cards: [],
    canEditCollection: false,
    stats: {
        correct: 0,
        total: 0,
        answered: 0,
        percentage: 0,
        isComplete: false
    }
};

function createQuizStore() {
    const { subscribe, update, set } = writable(initialState);

    const patch = (p) => update((s) => ({ ...s, ...p }));

    return {
        subscribe,

        setCards: (cards) => patch({ cards }),

        setMode: (currentMode) => patch({ currentMode }),
        setIsPractice: (isPractice) => patch({ isPractice }),

        toggleGrid: () => update(s => ({ ...s, isGrid: !s.isGrid })),
        toggleFullscreen: () => update(s => ({ ...s, isFullscreen: !s.isFullscreen })),

        setFullscreen: (v) => update(s => ({ ...s, isFullscreen: v })),

        setQuizStarted: (v) => patch({ quizStarted: v }),
        setQuizCompleted: (v) => patch({ isComplete: v }),

        openModal: () => patch({ showModal: true }),
        closeModal: () => patch({ showModal: false }),

        setCanEditCollection: (v) => patch({ canEditCollection: v }),

        updateCard: (index, patchData) =>
            update((state) => {
                const cards = [...state.cards];

                if (!cards[index]) return state;

                cards[index] = {
                    ...cards[index],
                    ...patchData
                };

                return {
                    ...state,
                    cards
                };
            }),

        loadCards: async (collectionId) => {
            if (!collectionId) return;

            patch({ isLoading: true });

            const res = await fetchCollectionItems(collectionId, false);
            const cards = Array.isArray(res) ? res : res?.data || [];

            patch({ cards, isLoading: false });
        },

        reset: () => set(initialState)
    };
}

export const quiz = createQuizStore();