<script>
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import Collections from '$lib/Collections.svelte';
	import { fetchCollectionsByTag } from '$lib/api/collections';
	import { page } from '$app/stores';

	let collections = [];
	let isLoading = true;
	let error = null;
	let requestId = 0;

	$: tag = $page.params.tag;
	$: if (browser && tag) loadCollections(tag);

	async function loadCollections(currentTag) {
		const currentRequest = ++requestId;
		isLoading = true;
		error = null;
		collections = [];
		try {
			const result = await fetchCollectionsByTag(currentTag);
			if (currentRequest === requestId) collections = result;
		} catch (e) {
			if (currentRequest === requestId) {
				console.error('Failed to load collections for tag:', e);
				error = 'Failed to load collections for this tag.';
			}
		} finally {
			if (currentRequest === requestId) isLoading = false;
		}
	}

	onDestroy(() => {
		requestId++;
	});
</script>

<svelte:head>
	<title>Collections tagged "{tag}"</title>
</svelte:head>

<div class="container white pt-4">
	<h2>Collections tagged <span class="badge bg-primary">{tag}</span></h2>
	{#if isLoading}
		<p>Loading collections...</p>
	{:else if error}
		<p class="text-danger">{error}</p>
	{:else if collections.length === 0}
		<p>No collections found for this tag.</p>
	{:else}
		<Collections {collections} grid list limit={-1} />
	{/if}
</div>
