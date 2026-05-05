<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { faShuffle } from '@fortawesome/free-solid-svg-icons';
	import { Fa } from 'svelte-fa';

	import CollectionCard from './components/CollectionCard.svelte';
	import {
		fetchLatestCollections,
		fetchRandomCollections,
		fetchPopularCollections,
		fetchCollections
	} from './api/collections';
	import { fetchUser } from './api/user';
	export let list = true;
	export let grid = true;
	export let condensed = false;
	export let showAuthor = false;
	export let sortmode = 'default'; // 'default', 'latest', 'popular', 'random'
	export let limit = 12; // null for no limit, or a number to limit results
	export let onSelectCollection = null; // Allow parent to override selection behavior
	export let collections = []; // Optional: pass collections directly instead of fetching

	let fetchedCollections = [];
	let isLoading = false; // Start as false, will be set to true when actually loading
	let error = null;
	let isCollapsed = true;
	let hasInitialized = false;
	let windowWidth = 0;
	let searchTerm = '';
	const dispatch = createEventDispatcher();

	async function selectCollection(collection) {
		if (condensed) {
			isCollapsed = true;
		}

		if (onSelectCollection) {
			onSelectCollection(collection);
			return;
		}

		dispatch('selectCollection', collection.id);

		try {
			const user = await fetchUser(collection.profiles.public_id);
			const author_slug = user.username_slug || user.username || 'unknown-author';
			const url = `/quiz/${author_slug}/${collection.slug}`;
			const state = { collectionId: collection.id };

			goto(url, { state });
		} catch (error) {
			console.error('Error fetching user for navigation:', error);
			const url = `/quiz/unknown-author/${collection.slug}`;
			const state = { collectionId: collection.id };
			goto(url, { state });
		}
	}

	onMount(async () => {
		if (collections.length === 0) {
			await loadCollections();
		} else {
			isLoading = false;
		}
		hasInitialized = true;
		if (browser) {
			updateWidth();
			window.addEventListener('resize', updateWidth);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('resize', updateWidth);
		}
	});

	function updateWidth() {
		windowWidth = window.innerWidth;
	}

	async function loadCollections() {
		if (isLoading) {
			return;
		}

		isLoading = true;
		error = null;

		try {
			let data;

			if (limit === null || limit === -1) {
				data = await fetchCollections();
			} else {
				switch (sortmode) {
					case 'latest':
						data = await fetchLatestCollections(limit || 12);
						break;
					case 'popular':
						data = await fetchPopularCollections(limit || 10);
						break;
					case 'random':
						data = await fetchRandomCollections(limit || 10);
						break;
					case 'random-daily':
						const daily = await fetchRandomCollections(limit || 1, true); // Daily random
						data = daily ? [daily] : [];
						break;
					default:
						data = await fetchLatestCollections(limit || 12);
						break;
				}
			}

			if (data) {
				fetchedCollections = data;
			} else {
				fetchedCollections = [];
				error = 'Failed to load collections';
			}
		} catch (err) {
			console.error('Error loading collections:', err);
			error = 'Failed to load collections';
			fetchedCollections = [];
		} finally {
			isLoading = false;
		}
	}

	// Retry function for error states
	async function retryLoad() {
		await loadCollections();
	}
	

	$: processedCollections = (() => {
		// Don't process until we have either passed collections or have finished loading
		if (collections.length === 0 && (isLoading || !hasInitialized)) {
			return [];
		}

		// Use passed collections or fetched collections
		const sourceCollections = collections.length > 0 ? collections : fetchedCollections;
		let sorted = [...sourceCollections];

		// Apply limit only if not already limited by API
		if (limit && limit > 0 && sorted.length > limit) {
			sorted = sorted.slice(0, limit);
		}

		return sorted;
	})();

	$: filteredCollections = processedCollections.filter((c) => {
		if (!searchTerm) return true;
		const term = searchTerm.trim().toLowerCase();
		return (
			(c.category && c.category.toLowerCase().includes(term)) ||
			(c.title && c.title.toLowerCase().includes(term)) ||
			(c.description && c.description.toLowerCase().includes(term)) ||
			(c.tags && c.tags.toLowerCase().includes(term)) ||
			(c.profiles?.username && c.profiles.username.toLowerCase().includes(term))
		);
	});

	// Determine layout classes (additive)
	$: layoutClass = (() => {
		let classes = [];
		if (windowWidth < 650 || condensed) classes.push('condensed');
		if (grid) classes.push('grid');
		if (list) classes.push('list');
		return classes.join(' ');
	})();
</script>

<div class="collections-container {layoutClass} {sortmode}">
	{#if condensed}
		<button
			class="toggle-button"
			on:click={() => (isCollapsed = !isCollapsed)}
			on:touchend|preventDefault={() => (isCollapsed = !isCollapsed)}
		>
			{isCollapsed ? 'Show Collections' : 'Hide Collections'}
		</button>
	{/if}
	<!-- if !isCollapsed add input -->
	{#if !isCollapsed && condensed}
		<input
			class="search-bar mb-2"
			type="text"
			placeholder="Search collections..."
			bind:value={searchTerm}
		/>
	{/if}
	{#if !condensed || !isCollapsed}
		{#if isLoading || (!hasInitialized && collections.length === 0)}
			<ul class="collections-list {grid ? 'grid' : list ? 'list' : ''}">
				{#each Array(limit && limit > 0 ? limit : 12) as _, i}
					<CollectionCard />
				{/each}
			</ul>
		{:else if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="retry-button" on:click={retryLoad}>Retry</button>
			</div>
		{:else if filteredCollections.length === 0}
			<div class="empty-state">
				<p>No collections available</p>
			</div>
		{:else}
			<ul class="collections-list">
				{#each filteredCollections as collection}
					<CollectionCard
						{collection}
						onNavigate={selectCollection}
						showTags={condensed}
						showDate={!condensed}
						showIsVisible={condensed}
						showAuthor={!condensed && showAuthor}
					/>
				{/each}
			</ul>
		{/if}
		{#if sortmode === 'random' && (!condensed || !isCollapsed)}
			<div class="shuffle-container mt-2">
				<button
					class="shuffle-button"
					on:click={loadCollections}
					disabled={isLoading}
					aria-label="Shuffle collections"
				>
					<Fa icon={faShuffle} />
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.collections-container {
		width: 100%;
	}

	.toggle-button {
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		transition: background-color 0.2s ease;
	}

	.toggle-button:hover {
		background: #0056b3;
	}

	.collections-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	/* Grid layout */
	.collections-list.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		padding: 1rem 0;
	}

	/* List layout */
	.collections-list.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 0;
	}

	/* Condensed layout */
	.collections-list.condensed {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem 0;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #666;
		font-style: italic;
	}

	.loading-state {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.error-state {
		text-align: center;
		padding: 2rem;
		color: #d32f2f;
	}

	.retry-button {
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		margin-top: 1rem;
		font-size: 0.9rem;
		transition: background-color 0.2s ease;
	}

	.retry-button:hover {
		background: #0056b3;
	}

	.shuffle-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.shuffle-button {
		background: #28a745;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.shuffle-button:hover {
		background: #218838;
	}

	.shuffle-button:disabled {
		background: #6c757d;
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.collections-list.grid {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}

	@media (max-width: 650px) {
		.collections-list.grid {
			grid-template-columns: 1fr;
			gap: 0.5rem;
			padding: 0.5rem 0;
		}
	}

	.placeholder {
		display: flex;
		align-items: center;
		margin-bottom: 1em;
		gap: 1em;
	}

	.image-placeholder {
		border-radius: 4px;
		background: #eee;
		flex-shrink: 0;
	}

	.text-placeholder {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.line {
		border-radius: 4px;
		background: #eee;
		margin-bottom: 0.4em;
	}
</style>
