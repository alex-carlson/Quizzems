import { apiFetch } from "$lib/api/fetchdata";

// Type definitions
export interface CollectionItem {
    id: string;
    image?: string;
    answer?: string;
    question?: string;
    [key: string]: any;
}

export interface Collection {
    id: string;
    author: string;
    author_id: string;
    author_uuid?: string;
    category: string;
    created_at: string;
    items: CollectionItem[];
    private?: boolean;
    thumbnail?: boolean;
    [key: string]: any;
}

// Fetch all collections
export async function fetchCollections(): Promise<Collection[] | undefined> {
    console.log("Fetching collections from API");
    const url = `${import.meta.env.VITE_API_URL}/collections`;
    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch collections");
        return await response.json();
    } catch (error) {
        console.error("Error fetching collections:", error);
        return undefined;
    }
}

export async function fetchUserCollections(uid): Promise<Collection[] | undefined> {
    const url = `/collections/user/${uid}`;

    try {
        const data = await apiFetch(url);
        return data;
    } catch (error) {
        console.error("Error fetching user collections:", error);
        return undefined;
    }
}


// Fetch latest collections
export async function fetchLatestCollections(limit = 12): Promise<Collection[] | undefined> {
    const url = `${import.meta.env.VITE_API_URL}/collections/latest?limit=${limit}`;
    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch latest collections");
        return await response.json();
    } catch (error) {
        console.error("Error fetching latest collections:", error);
        return undefined;
    }
}

// Fetch random collections
export async function fetchRandomCollections(limit = 10, daily = false): Promise<Collection[] | undefined> {
    let url = `${import.meta.env.VITE_API_URL}/collections/random/${limit}`;

    if (daily) {
        url = `${import.meta.env.VITE_API_URL}/collections/random-daily`;
    }

    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch random collections");
        return await response.json();
    } catch (error) {
        console.error("Error fetching random collections:", error);
        return undefined;
    }
}

// fetch popular collections
export async function fetchPopularCollections(limit = 10): Promise<Collection[] | undefined> {
    const url = `${import.meta.env.VITE_API_URL}/collections/popular?limit=${limit}`;
    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch popular collections");
        return await response.json();
    } catch (error) {
        console.error("Error fetching popular collections:", error);
        return undefined;
    }
}

// Fetch a collection by author and collection id
export async function fetchCollectionById(
    collection_id: string,
    protectedCollection = false
): Promise<Collection | undefined> {
    const url = protectedCollection
        ? `/collections/user/collection/${collection_id}`
        : `/collections/user/public/${collection_id}`;
    try {
        const data = await apiFetch(url, 'GET', null, false, protectedCollection);
        return data;
    } catch (error) {
        console.error("Error fetching collection:", error);
        return undefined;
    }
}

export async function incrementPlayCounter(collectionId: string) {
    const url = `/collections/incrementPlays/${collectionId}`;
    console.log("Incrementing play counter for collection:", collectionId);
    try {
        const response = await apiFetch(url, 'POST', null, false, false);
        return response;
    } catch (error) {
        console.error("Error incrementing play counter:", error);
        return undefined;
    }
}

export async function fetchCollectionByAuthorAndSlug(
    authorId: string,
    slug: string
): Promise<string | undefined> {
    const url = `/collections/user/collection/${authorId}/${slug}`;
    try {
        const data = await apiFetch(url, 'GET', null, false, false);
        return data.id;
    } catch (error) {
        console.error("Error fetching collection by author slug:", error);
        return undefined;
    }
}

export async function fetchTags(limit = 10): Promise<string[] | undefined> {
    const url = `${import.meta.env.VITE_API_URL}/collections/tags/popular?limit=${limit}`;
    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch tags");
        return await response.json();
    } catch (error) {
        console.error("Error fetching tags:", error);
        return undefined;
    }
}

export async function createCollection(collection: Collection): Promise<Collection | undefined> {
    const url = `${import.meta.env.VITE_API_URL}/collections/createCollection`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(collection)
        });
        if (!response.ok) throw new Error("Failed to create collection");
        return await response.json();
    } catch (error) {
        console.error("Error creating collection:", error);
        return undefined;
    }
}