import { writable } from 'svelte/store';

function createCollectionStore() {
    const { subscribe, set, update } = writable({ collectionId: null });

    return {
        subscribe,
        setCollectionId: (id) => update((state) => ({ ...state, collectionId: id })),
        getCollectionId: () => {
            let value;
            subscribe((state) => (value = state.collectionId))();
            return value;
        },
        reset: () => set({ collectionId: null })
    };
}

export const collection = createCollectionStore();
