<script>
	import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { addToast } from '../store/toast';
	let searchTerm = '';
	let searchResults = [];
	const dispatch = createEventDispatcher();

	function onClicked(event) {
		// clear search term and results
		searchTerm = '';
		searchResults = [];
		// Dispatch a custom event with the clicked search item
		dispatch('SearchItemClicked', event.detail);
	}

	async function search(event) {
		if (!browser) return;
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/collections/search?searchTerm=${event.detail.query}`,
				{
					method: 'GET'
				}
			);

			if (!response.ok) {
				throw new Error('Failed to fetch search results');
			}

			const data = await response.json();
			searchResults = data;
		} catch (error) {
			console.error('Error fetching search results:', error);
			addToast({
				type: 'error',
				message: 'Failed to fetch search results. Please try again later.'
			});
		}
	}
</script>

<div class="searchForm">
	<div class="text-field inline">
		<input
			type="text"
			placeholder="Search..."
			id="search"
			bind:value={searchTerm}
			on:keydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					search({ detail: { query: searchTerm } });
				}
			}}
		/>
		<button
			on:click={(event) => {
				event.preventDefault();
				search({ detail: { query: searchTerm } });
			}}
		>
			<Fa icon={faMagnifyingGlass} />
		</button>
	</div>

	{#if searchResults.length > 0}
		<div class="searchResults white list condensed rounded">
			<ul>
				{#each searchResults as result}
					<li>
						<a
							href="/quiz/{result.author_public_id}/{result.slug}"
							on:click|preventDefault={() => onClicked({ detail: result })}
						>
							<img src={result.thumbnail} alt={result.category} />
							<p>
								{result.category} by: {result.author} [{result.itemsLength}]
							</p>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
