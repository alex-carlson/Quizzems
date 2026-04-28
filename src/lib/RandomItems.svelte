<script>
	import { fetchRandomCollections } from './api/collections';
	import Fa from 'svelte-fa';
	import { faRefresh } from '@fortawesome/free-solid-svg-icons';
	import { onMount } from 'svelte';
	import CollectionCard from './components/CollectionCard.svelte';
	export let onCollectionClick;

	let randomItemsPromise;

	onMount(() => {
		refresh();
	});

	function refresh() {
		randomItemsPromise = fetchRandomCollections(3);
	}

	// convert timestamptz to mm/dd/yyyy format
	function formatDate(timestamp) {
		const date = new Date(timestamp);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	}
</script>

<div class="randomCollections">
	{#await randomItemsPromise then data}
		<div class="grid list condensed card-grid">
			<ul>
				{#each data as collection}
					<CollectionCard {collection} onNavigate={(col) => onCollectionClick(col)} />
				{/each}
			</ul>
		</div>
		<button class="refresh mt-3" on:click={refresh}>
			<span>
				<Fa icon={faRefresh} />
				Refresh
			</span>
		</button>
	{:catch error}
		<p class="error">Error loading latest collections: {error.message}</p>
	{/await}
</div>

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}
</style>
