import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankRelatedQuizzes, relatedSearchTerms } from './relatedQuizzes.js';

const quiz = (id, category, extra = {}) => ({
	id,
	category,
	slug: `quiz-${id}`,
	profiles: { username_slug: 'author' },
	...extra
});

describe('related quiz search', () => {
	it('uses distinct bounded title prefixes and ignores filler words', () => {
		assert.deepEqual(relatedSearchTerms('The Music and Movies of Music in the US'), [
			'mus',
			'mov',
			'us'
		]);
		assert.deepEqual(relatedSearchTerms('the and'), []);
		assert.deepEqual(relatedSearchTerms('alpha bravo charlie delta echo'), [
			'alp', 'bra', 'cha', 'del'
		]);
	});

	it('ranks fuzzy title matches, excludes the current quiz and deduplicates results', () => {
		const results = rankRelatedQuizzes('Music Movies', [
			quiz(1, 'Music Movies'),
			quiz(2, 'Music Movie'),
			quiz(3, 'Musical Movies'),
			quiz(2, 'Music Movie'),
			quiz(4, 'Cooking'),
			quiz(5, 'Music Movies', { profiles: {} })
		], '1');
		assert.deepEqual(results.map((result) => result.id), [2, 3]);
	});

	it('handles empty terms and limits the number of results', () => {
		assert.deepEqual(rankRelatedQuizzes('the', [quiz(1, 'The Quiz')], null), []);
		assert.equal(rankRelatedQuizzes('music', [quiz(1, 'Music'), quiz(2, 'Music')], null, 1).length, 1);
	});
});
