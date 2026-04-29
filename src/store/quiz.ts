import { writable } from 'svelte/store';
import { fetchCollectionItems } from '$lib/api/items';
import { fetchCollectionById } from '$lib/api/collections';

const getInitialState = () => ({
    hasInitialized: false,
    isLoading: false,
    quizStarted: false,
    isComplete: false,
    showModal: false,
    currentMode: 'FILL_IN_THE_BLANK',
    isPractice: false,
    isGrid: false,
    isFullscreen: false,
    isShuffle: true,
    showCategory: false,
    collection: null,
    collectionId: null,
    cards: [],
    canEditCollection: false,
    stats: {
        correct: 0,
        total: 0,
        answered: 0,
        percentage: 0,
        isComplete: false
    }
});

function createQuizStore() {
    const { subscribe, update, set } = writable(getInitialState());

    const patch = (p) => update((s) => ({ ...s, ...p }));

    return {
        subscribe,

        setCards: (cards) => patch({ cards }),
        setCollectionId: (collectionId) => patch({ collectionId }),

        setCollection: (collection) =>
        update((state) => ({
            ...state,
            collection
        })),

        setMode: (currentMode) => patch({ currentMode }),
        setIsPractice: (isPractice) => patch({ isPractice }),

        toggleGrid: () => update(s => ({ ...s, isGrid: !s.isGrid })),
        toggleFullscreen: () => update(s => ({ ...s, isFullscreen: !s.isFullscreen })),

        setFullscreen: (v) => update(s => ({ ...s, isFullscreen: v })),

        setShowCategory: (v) => update(s => ({ ...s, showCategory: v })),

        setQuizStarted: (v) => patch({ quizStarted: v }),
        setQuizCompleted: (v) => patch({ isComplete: v }),

        openModal: () => patch({ showModal: true }),
        closeModal: () => patch({ showModal: false }),

        setCanEditCollection: (v) => patch({ canEditCollection: v }),

        updateCardById: (id, patch) =>
            update((state) => {
                const cards = [...state.cards];

                const index = cards.findIndex((c) => c.id === id);
                if (index === -1) return state;

                cards[index] = {
                    ...cards[index],
                    ...patch
                };

                return {
                    ...state,
                    cards
                };
            }),

        loadCards: async (collectionId) => {
            if (!collectionId) return;

            patch({ isLoading: true, collectionId });

            const res = await fetchCollectionItems(collectionId, false);
            const cards = Array.isArray(res) ? res : res?.data || [];

            patch({ cards, isLoading: false });
        },

        loadCollection: async (collectionId) => {
            if (!collectionId) return;

            patch({ isLoading: true });

            const collection = await fetchCollectionById(collectionId, true);

            if (!collection) {
                patch({ isLoading: false });
                return;
            }

            const res = await fetchCollectionItems(collectionId, false);
            const cards = Array.isArray(res) ? res : res?.data || [];

            patch({
                collection,
                collectionId,
                cards,
                isLoading: false
            });
        },

        addCard: (card) =>
        update((state) => ({
            ...state,
            cards: [...state.cards, card]
        })),
        

        reset: () => set(getInitialState())
    };
}

export const quiz = createQuizStore();