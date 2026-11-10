const stopWords = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'the', 'to']);

function words(value) {
	return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => !stopWords.has(word)) ?? [];
}

export function relatedSearchTerms(keyword) {
	const tokens = [...new Set(words(keyword))].filter((word) => word.length >= 2);
	return [...new Set(tokens.slice(0, 4).map((word) => word.slice(0, 3)))];
}

function similarity(a, b) {
	if (a === b) return 1;
	if (a.startsWith(b) || b.startsWith(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);

	let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			current[j] = Math.min(
				current[j - 1] + 1,
				previous[j] + 1,
				previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
		}
		previous = current;
	}
	return 1 - previous[b.length] / Math.max(a.length, b.length);
}

export function rankRelatedQuizzes(keyword, collections, excludeId, limit = 4) {
	const queryWords = words(keyword).filter((word) => word.length >= 2);
	if (!queryWords.length) return [];

	const seen = new Set();
	return collections
		.filter((collection) => {
			if (
				collection?.id == null ||
				String(collection.id) === String(excludeId) ||
				seen.has(String(collection.id)) ||
				typeof collection.category !== 'string' ||
				!collection.slug ||
				!collection.profiles?.username_slug
			) return false;
			seen.add(String(collection.id));
			return true;
		})
		.map((collection) => {
			const titleWords = words(collection.category);
			const score = queryWords.reduce(
				(total, query) => total + Math.max(0, ...titleWords.map((word) => similarity(query, word))),
				0
			) / queryWords.length;
			return { collection, score };
		})
		.filter(({ score }) => score >= 0.5)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ collection }) => collection);
}
