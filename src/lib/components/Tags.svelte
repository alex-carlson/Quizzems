<script>
	import { onMount } from 'svelte';
	import { fetchTags } from '$lib/api/collections';
	export let count = 10; // Default number of tags to fetch
	export let centered = false; // Whether to center the tags
	export let list = false;

	let tags = [];
	let loading = true;

	// on mount, fetch tags from the API
	onMount(async () => {
		try {
			tags = (await fetchTags(count)) || [];
		} catch (error) {
			console.error('Error fetching tags:', error);
		} finally {
			loading = false;
		}
	});

	function preventAnchorDrag(e) {
		e.preventDefault();
	}
</script>

<div class="tags-scrollbar" class:vertical={list}>
	<div class="tags">
		{#if tags.length > 0}
			<ul class={centered ? 'centered' : ''}>
				{#each tags as item}
					<li>
						<a
							href={`/tags/${encodeURIComponent(item.tag)}`}
							class="tag"
							draggable="false"
							on:dragstart={preventAnchorDrag}
						>
							{item.tag} ({item.count})
						</a>
					</li>
				{/each}
			</ul>
		{:else if loading}
			<p>Loading categories...</p>
		{:else}
			<p>No tags available</p>
		{/if}
	</div>
</div>

<style>
	.tags-scrollbar {
		width: 100vw;
		max-width: 100%;
		overflow-x: auto;
		background: #fff;
		padding: 0;
	}

	.tags-scrollbar::-webkit-scrollbar {
		height: 8px;
		background: #fff;
	}
	.tags-scrollbar::-webkit-scrollbar-thumb {
		background: #bbb;
		border-radius: 4px;
	}

	.tags {
		width: max-content;
		min-width: 100vw;
	}

	.tags ul {
		list-style: none;
		margin: 0;
		display: flex;
		flex-wrap: nowrap;
		gap: 0.5rem;
		-webkit-overflow-scrolling: touch;
		scroll-behavior: smooth;
	}

	.tags li {
		display: inline-block;
	}

	.tag {
		display: inline-block;
		padding: 1rem 1.1rem;
		background-color: #fff;
		color: #495057;
		text-decoration: none;
		font-size: 0.95rem;
		font-weight: 500;
		transition: all 0.2s ease;
		white-space: nowrap;
		border-right: solid 1px #c2c2c2;
	}

	.tag:hover {
		background-color: #007bff;
		color: white;
		border-color: #007bff;
		text-decoration: none;
		transform: translateY(-1px) scale(1.04);
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.13);
	}

	.tags p {
		color: #6c757d;
		font-style: italic;
		margin: 0;
		padding: 0 1rem;
	}

	.centered {
		justify-content: flex-start;
	}
	.vertical {
		width: 100%;
		background: transparent;
		overflow: visible;
	}
	.vertical .tags {
		width: 100%;
		min-width: 0;
	}
	.vertical .tags ul {
		display: flex;
		flex-direction: column;
		padding: 0;
		gap: 0.5rem;
	}
	.vertical .tag {
		display: block;
		border: 0;
		border-radius: 0.375rem;
		padding: 0.75rem 1rem;
		white-space: normal;
	}
	.vertical .tags p {
		color: inherit;
	}
</style>
