import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/fetchdata', () => ({ apiFetch: vi.fn() }));
vi.mock('$lib/api/supabaseClient', () => ({ getSession: vi.fn() }));

import { fetchDailyFallbackCollections } from './collections';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('daily fallback quizzes', () => {
	it('fetches and returns four distinct daily collections', async () => {
		const collections = [
			{ id: '1', category: 'First' },
			{ id: '2', category: 'Second' },
			{ id: '3', category: 'Third' },
			{ id: '4', category: 'Fourth' }
		];
		const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => collections });
		vi.stubGlobal('fetch', fetch);

		expect(await fetchDailyFallbackCollections()).toEqual(collections);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/collections/daily-quizzes'),
			{ method: 'GET' }
		);
	});

	it('rejects unsuccessful requests', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

		await expect(fetchDailyFallbackCollections()).rejects.toThrow('HTTP 503');
	});

	it.each([
		[],
		[{ id: '1', category: 'Only one' }],
		[
			{ id: '1', category: 'First' },
			{ id: 1, category: 'Duplicate' },
			{ id: '2', category: 'Second' },
			{ id: '3', category: 'Third' }
		],
		[
			{ id: '1', category: 'First' },
			{ id: '2' },
			{ id: '3', category: 'Third' },
			{ id: '4', category: 'Fourth' }
		]
	])('rejects malformed or duplicate results: %j', async (...collections) => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => collections })
		);

		await expect(fetchDailyFallbackCollections()).rejects.toThrow(
			'Invalid daily fallback quizzes response'
		);
	});
});
