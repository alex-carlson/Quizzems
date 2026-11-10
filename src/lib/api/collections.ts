import { apiFetch } from '$lib/api/fetchdata';
import { getSession } from '$lib/api/supabaseClient';

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

export interface PublicQuizSearchResult {
	id: string;
	category: string;
	author?: string;
}

function normalizeQuizId(id: unknown): string | undefined {
	if (typeof id === 'string' && id.trim()) return id.trim();
	if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
	return undefined;
}

export async function fetchUserCollections(uid): Promise<Collection[] | undefined> {
	const url = `/collections/user/${uid}`;

	try {
		const data = await apiFetch(url);
		return data;
	} catch (error) {
		console.error('Error fetching user collections:', error);
		return undefined;
	}
}

// Fetch latest collections
export async function fetchLatestCollections(limit = 12): Promise<Collection[] | undefined> {
	const url = `${import.meta.env.VITE_API_URL}/collections/latest?limit=${limit}`;
	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) throw new Error('Failed to fetch latest collections');
		return await response.json();
	} catch (error) {
		console.error('Error fetching latest collections:', error);
		return undefined;
	}
}

export async function fetchTaggedCollections(
	tag = '',
	limit = 12
): Promise<Collection[] | undefined> {
	const url = `${import.meta.env.VITE_API_URL}/collections/taggedCategories?limit=${limit}&tag=${encodeURIComponent(tag)}`;
	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) throw new Error('Failed to fetch tagged collections');
		return await response.json();
	} catch (error) {
		console.error('Error fetching latest collections:', error);
		return undefined;
	}
}

// Fetch random collections
export async function fetchRandomCollections(
	limit = 10,
	daily = false
): Promise<Collection[] | undefined> {
	let url = `${import.meta.env.VITE_API_URL}/collections/random/${limit}`;

	if (daily) {
		url = `${import.meta.env.VITE_API_URL}/collections/random-daily`;
	}

	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) throw new Error('Failed to fetch random collections');
		return await response.json();
	} catch (error) {
		console.error('Error fetching random collections:', error);
		return undefined;
	}
}

// fetch popular collections
export async function fetchPopularCollections(limit = 10): Promise<Collection[] | undefined> {
	const url = `${import.meta.env.VITE_API_URL}/collections/popular?limit=${limit}`;
	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) throw new Error('Failed to fetch popular collections');
		return await response.json();
	} catch (error) {
		console.error('Error fetching popular collections:', error);
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
		console.error('Error fetching collection:', error);
		return undefined;
	}
}

export async function fetchQuizOfTheDayCollections(): Promise<Collection[]> {
	const url = `${import.meta.env.VITE_API_URL}/collections/quiz-of-the-day`;
	const response = await fetch(url, { method: 'GET' });
	if (!response.ok) throw new Error(`Failed to fetch quizzes of the day (HTTP ${response.status})`);

	const collections: unknown = await response.json();
	if (
		!Array.isArray(collections) ||
		collections.length > 6 ||
		!collections.every(
			(collection) =>
				typeof collection === 'object' &&
				collection !== null &&
				normalizeQuizId(collection.id) !== undefined &&
				typeof collection.category === 'string'
		)
	) {
		throw new Error('Invalid quizzes of the day response');
	}

	return collections;
}

export async function updateQuizOfTheDayIds(ids: string[]): Promise<void> {
	if (ids.length < 1 || ids.length > 6 || new Set(ids).size !== ids.length) {
		throw new Error('Choose between 1 and 6 unique quizzes of the day');
	}

	const session = await getSession();
	if (!session?.access_token) {
		throw new Error('A signed-in session is required to update quizzes of the day');
	}

	const quizIds = ids.map((id) => {
		const numericId = Number(id);
		if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(numericId)) {
			throw new Error('Invalid quiz ID');
		}
		return numericId;
	});

	const response = await fetch(`${import.meta.env.VITE_API_URL}/collections/quiz-of-the-day`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${session.access_token}`
		},
		body: JSON.stringify({ quizIds })
	});
	if (!response.ok) {
		throw new Error(`Failed to update quizzes of the day (HTTP ${response.status})`);
	}
}

export async function fetchPaginatedPublicCollections(
	page: number,
	limit: number,
	sortMode: string,
	sortOrder: string,
	filter: string
): Promise<{ collections: Collection[]; totalCount: number; totalPages: number }> {
	const response = await apiFetch(
		`/collections/page/${page}/${limit}`,
		'POST',
		{ sortMode, sortOrder, filter },
		false,
		false
	);
	if (
		!response ||
		!Array.isArray(response.collections) ||
		typeof response.totalCount !== 'number' ||
		typeof response.totalPages !== 'number'
	) {
		throw new Error('Invalid public quiz page response');
	}
	return response;
}

export async function searchPublicCollections(
	searchTerm: string,
	page: number,
	limit = 20
): Promise<{ collections: PublicQuizSearchResult[]; totalCount: number; totalPages: number }> {
	const response = await fetchPaginatedPublicCollections(page, limit, 'date', 'desc', searchTerm);
	return {
		...response,
		collections: response.collections.map((quiz) => {
			const id = normalizeQuizId(quiz.id);
			if (!id || typeof quiz.category !== 'string') {
				throw new Error('Invalid public quiz in search response');
			}
			return {
				id,
				category: quiz.category,
				author: typeof quiz.profiles?.username === 'string' ? quiz.profiles.username : undefined
			};
		})
	};
}

export async function fetchCollelctionNamesById(ids: string[]): Promise<string[] | undefined> {
	const url = `${import.meta.env.VITE_API_URL}/collections/names?ids=${ids.join(',')}`;
	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) throw new Error('Failed to fetch collection names');
		const data = await response.json();
		console.log('Fetched collection names:', data);
		return data;
	} catch (error) {
		console.error('Error fetching collection names:', error);
		return undefined;
	}
}

export async function incrementPlayCounter(collectionId: string) {
	const url = `/collections/incrementPlays/${collectionId}`;
	console.log('Incrementing play counter for collection:', collectionId);
	try {
		const response = await apiFetch(url, 'POST', null, false, false);
		return response;
	} catch (error) {
		console.error('Error incrementing play counter:', error);
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
		console.error('Error fetching collection by author slug:', error);
		return undefined;
	}
}

export async function fetchTags(limit = 10): Promise<string[] | undefined> {
	const url = `${import.meta.env.VITE_API_URL}/collections/tags/popular?limit=${limit}`;
	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) throw new Error('Failed to fetch tags');
		return await response.json();
	} catch (error) {
		console.error('Error fetching tags:', error);
		return undefined;
	}
}

export async function createCollection(collection: Collection): Promise<Collection | undefined> {
	const url = `${import.meta.env.VITE_API_URL}/collections/createCollection`;
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(collection)
		});
		if (!response.ok) throw new Error('Failed to create collection');
		return await response.json();
	} catch (error) {
		console.error('Error creating collection:', error);
		return undefined;
	}
}
