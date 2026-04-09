import { apiFetch } from './fetchdata';

// Fetch random items (not collections)

export async function fetchRandomItems(count = 3) {
    const result = await apiFetch(`/items/random/${count}`, 'GET');
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
    console.log("Fetching collection items for id: " + id);
    if (result && Array.isArray(result.data)) {
        return result.data;
    } else if (Array.isArray(result)) {
        return result;
    } else {
        return [];
    }
}