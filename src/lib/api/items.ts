import { apiFetch } from './fetchdata';

// Fetch random items (not collections)

export async function fetchRandomItems(count = 3) {
    const result = await apiFetch(`/items/random/${count}`, 'GET', null, false, false);
    if (result && Array.isArray(result.data)) {
        return result.data;
    } else if (Array.isArray(result)) {
        return result;
    } else {
        return [];
    }
}

export async function fetchCollectionItems(id, requireAuth = false) {
    const result = await apiFetch(`/items/collection-items/${id}`, 'GET', null, false, requireAuth);
    if (result && Array.isArray(result.data)) {
        return result.data;
    } else if (Array.isArray(result)) {
        return result;
    } else {
        return [];
    }
}

export async function fetchCollectionsCount() {
    const res = await apiFetch('/items/collectionCount', 'GET', null, false, false);
    return res?.count ?? 0;
}

export async function fetchCardCount() {
    const res = await apiFetch('/items/cardCount', 'GET', null, false, false);
    return res?.count ?? 0;
}