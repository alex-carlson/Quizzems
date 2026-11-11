<script>
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { fetchPaginatedPublicCollections } from '$lib/api/collections';
	import { rankRelatedQuizzes, relatedSearchTerms } from '$lib/api/relatedQuizzes';

	export let keyword = '';
	export let excludeId = null;

	let collections = [];
	let loading = false;
	let error = '';
	let requestId = 0;

	$: if (browser) loadRelatedQuizzes(keyword, excludeId);

	async function loadRelatedQuizzes(searchKeyword, currentId) {
		const currentRequest = ++requestId;
		const terms = relatedSearchTerms(searchKeyword || '');
		collections = [];
		error = '';
		loading = terms.length > 0;
		if (!terms.length) return;

		try {
			const pages = await Promise.all(
				terms.map((term) => fetchPaginatedPublicCollections(1, 50, 'date', 'desc', term))
			);
			if (currentRequest !== requestId) return;
			collections = rankRelatedQuizzes(searchKeyword, pages.flatMap((page) => page.collections), currentId);
		} catch (err) {
			if (currentRequest !== requestId) return;
			console.error('Failed to load related quizzes:', err);
			error = 'Unable to load related quizzes.';
		} finally {
			if (currentRequest === requestId) loading = false;
		}
	}

	onDestroy(() => {
		requestId++;
	});
</script>

{#if loading || error || collections.length}
	<section class="related-quizzes container my-5" aria-labelledby="related-quizzes-heading">
		<h2 id="related-quizzes-heading">Related Quizzes</h2>
		{#if loading}
			<p role="status">Loading related quizzes...</p>
		{:else if error}
			<p role="alert">
				{error}
				<button class="btn btn-link" type="button" on:click={() => loadRelatedQuizzes(keyword, excludeId)}>
					Try again
				</button>
			</p>
		{:else}
			<ul class="related-list">
				{#each collections as collection (collection.id)}
					<li>
						<a class="related-card card shadow-sm" data-sveltekit-reload href="/quiz/{encodeURIComponent(collection.profiles.username_slug)}/{encodeURIComponent(collection.slug)}">
							<img src={collection.thumbnail_url || '/placeholder.jpg'} alt="" loading="lazy" />
							<div class="card-body">
								<h3>{collection.category}</h3>
								{#if collection.profiles.username}
									<span>by {collection.profiles.username}</span>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.related-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
		gap: 1rem;
		padding: 0;
		list-style: none;
	}
	.related-card {
		height: 100%;
		max-width: 300px;
		overflow: hidden;
		color: var(--red);
		text-decoration: none;
	}
	.related-card:hover {
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
	}
	.related-card img {
		width: 100%;
		aspect-ratio: 5 / 4;
		object-fit: cover;
	}
	.related-card h3 {
		color: var(--red);
		font-size: 1.15rem;
	}
</style>
