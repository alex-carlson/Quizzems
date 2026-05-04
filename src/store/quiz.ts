import { uploadData as uploaderUploadData, uploadAudio as uploaderUploadAudio, uploadQuestion as uploaderUploadQuestion } from '$lib/Upload/uploader';
import { writable } from 'svelte/store';
import { fetchCollectionItems } from '$lib/api/items';
import { fetchCollectionById } from '$lib/api/collections';


// Card type for quiz items
export interface Card {
    id?: string;
    question?: string;
    answer?: string;
    answers?: string[] | string;
    file?: File | string | null;
    src?: string;
    supplemental_text?: string;
    extra?: any;
    type?: string;
    questionType?: string;
    answerType?: string;
    category?: string;
    existingItemId?: string;
    isUpdate?: boolean;
    [key: string]: any;
}

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
    cards: [] as Card[],
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
    const { subscribe, update, set } = writable({
        ...getInitialState(),
        userCollections: []
    });

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

            // const res = await fetchCollectionItems(collectionId, false);
            // const cards = Array.isArray(res) ? res : res?.data || [];
            const cards = collection.items || [];

            console.log('Loaded collection:', collection);
            console.log('Loaded cards:', cards);

            patch({
                collection,
                collectionId,
                cards,
                isLoading: false
            });
        },

        loadUserCollections: async (userId) => {
            if (!userId) return;
            patch({ isLoading: true });
            try {
                const result = await import('$lib/api/collections').then(mod => mod.fetchUserCollections(userId));
                const sorted = Array.isArray(result)
                    ? result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    : [];
                patch({ userCollections: sorted, isLoading: false });
            } catch (error) {
                patch({ userCollections: [], isLoading: false });
            }
        },

        addCard: (card) =>
        update((state) => ({
            ...state,
            cards: [...state.cards, card]
        })),

        uploadData: async (item, uuid, forceJpg) => {
            return uploaderUploadData(item, uuid, forceJpg);
        },

        uploadAudio: async (item) => {
            return uploaderUploadAudio(item);
        },

        uploadQuestion: async (item) => {
            return uploaderUploadQuestion(item);
        },

        reset: () => set({ ...getInitialState(), userCollections: [] })
    };
}

export const quiz = createQuizStore();