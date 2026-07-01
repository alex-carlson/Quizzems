<script>
	import SortAndFilter from '$lib/SortAndFilter.svelte';
	import { apiFetch } from '$lib/api/fetchdata';
	import { onMount } from 'svelte';
	import CollectionCard from '$lib/components/CollectionCard.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import { Fa } from 'svelte-fa';
	import { faMinus } from '@fortawesome/free-solid-svg-icons';
	let collections = [];
	let filteredCollections = [];
	let page = 1;
	let sortOption = 'date';
	let sortOrder = 'desc';
	let filterText = '';
	let itemsPerPage = 20;
	let totalPages = 0;
	let totalCount = 0;
	let isLoading = true;
	let selection = [];

	function getLastModifiedValue(collection) {
		return collection?.last_modified || 0;
	}

	function applyFallbackSort(data, sortMode, order) {
		if (!Array.isArray(data)) return [];
		if (sortMode !== 'modified') return data;

		const direction = order === 'asc' ? 1 : -1;
		return [...data].sort((a, b) => {
			const aDate = new Date(getLastModifiedValue(a)).getTime();
			const bDate = new Date(getLastModifiedValue(b)).getTime();
			return (aDate - bDate) * direction;
		});
	}

	async function fetchPaginatedCollections(
		pageNum = 1,
		limit = 20,
		sortMode = 'date',
		sortOrder = 'desc',
		filterText = ''
	) {
		isLoading = true;
		try {
			const url = `/collections/page/${pageNum}/${limit}`;

			// Pass sort and filter parameters in the request body
			const requestBody = {
				sortMode,
				sortOrder,
				filter: filterText
			};

			const response = await apiFetch(url, 'POST', requestBody, false, false);

			if (response && response.collections) {
				const sortedCollections = applyFallbackSort(response.collections, sortMode, sortOrder);
				collections = sortedCollections;
				filteredCollections = sortedCollections;
				totalCount = response.totalCount || 0;
				totalPages = response.totalPages || 0;
			} else {
				console.warn('No collections in response');
				collections = [];
				filteredCollections = [];
				totalCount = 0;
				totalPages = 0;
			}
		} catch (error) {
			console.error('Error fetching paginated collections:', error);
			collections = [];
			filteredCollections = [];
			totalCount = 0;
			totalPages = 0;
		} finally {
			isLoading = false;
		}
	}

	function goToPage(pageNum) {
		if (pageNum >= 1 && pageNum <= totalPages && pageNum !== page) {
			page = pageNum;
			fetchPaginatedCollections(page, itemsPerPage, sortOption, sortOrder, filterText);
		}
	}

	function handleNavigation(collection) {
		// Navigate to the collection page
		const url = `/quiz/${collection.profiles.username_slug}/${collection.slug}`;
		const state = { collectionId: collection.id };
		window.history.pushState(state, '', url);
		// go to page
		window.location.href = url;
	}

	// Generate array of page numbers to show
	$: pageNumbers = (() => {
		if (totalPages <= 7) {
			// Show all pages if 7 or fewer
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages = [];
		const current = page;
		const total = totalPages;

		// Always show first page
		pages.push(1);

		if (current <= 4) {
			// Near beginning: 1, 2, 3, 4, 5, ..., last
			for (let i = 2; i <= Math.min(5, total - 1); i++) {
				pages.push(i);
			}
			if (total > 5) {
				pages.push('...');
				pages.push(total);
			}
		} else if (current >= total - 3) {
			// Near end: 1, ..., last-4, last-3, last-2, last-1, last
			if (total > 5) {
				pages.push('...');
			}
			for (let i = Math.max(total - 4, 2); i <= total; i++) {
				pages.push(i);
			}
		} else {
			// Middle: 1, ..., current-1, current, current+1, ..., last
			pages.push('...');
			for (let i = current - 1; i <= current + 1; i++) {
				pages.push(i);
			}
			pages.push('...');
			pages.push(total);
		}

		return pages;
	})();
	// Handle items per page change
	async function handleItemsPerPageChange(event) {
		const newItemsPerPage = event.detail;
		if (newItemsPerPage !== itemsPerPage) {
			itemsPerPage = newItemsPerPage;
			page = 1; // Reset to first page
			await fetchPaginatedCollections(page, itemsPerPage, sortOption, sortOrder, filterText);
		}
	}

	// Handle server-side filter changes
	async function handleServerFilterChange(event) {
		const {
			sortMode,
			sortOrder: newOrder,
			filterText: newFilter,
			itemsPerPage: newLimit
		} = event.detail;
		// Update current values
		sortOption = sortMode;
		sortOrder = newOrder;
		filterText = newFilter;
		itemsPerPage = newLimit;

		page = 1; // Reset to first page when filters change
		await fetchPaginatedCollections(page, itemsPerPage, sortOption, sortOrder, filterText);
	}

	function handleToggleSelect(event) {
		const { id, selected } = event.detail;
		if (selected) {
			if (!selection.includes(id)) {
				selection = [...selection, id];
			}
		} else {
			selection = selection.filter((item) => item !== id);
		}
	}

	function removeSelected(id) {
		selection = selection.filter((item) => item !== id);
	}

	function getCollectionLabel(collection) {
		return collection?.category || collection?.title || `#${collection?.id}`;
	}

	$: selectedCollections = filteredCollections.filter((collection) => selection.includes(collection.id));

	function handlePlaySelected() {
		if (!selection.length) return;
		const query = encodeURIComponent(selection.join(','));
		window.location.href = `/mix?ids=${query}`;
	}

	onMount(async () => {
		document.title = 'Explore';
		isLoading = true;
		await fetchPaginatedCollections(1, itemsPerPage, sortOption, sortOrder, filterText);
	});
</script>

<div class="container mt-3">
	<h1>Explore</h1>
	<p>Discover a new quiz, practice up!</p>
</div>

<SortAndFilter
	collection={collections}
	bind:sortOption
	bind:sortOrder
	bind:itemsPerPage
	on:itemsPerPageChanged={handleItemsPerPageChange}
	on:serverFilterChange={handleServerFilterChange}
/>

<div class="container">
	{#if selection.length > 0}
		<div class="full-width white rounded p-1">
			<h3>Selected collections:</h3>
			<ul class="selected-collections-list">
				{#each selectedCollections as collection}
					<li>
						{getCollectionLabel(collection)}
						<button
							type="button"
							class="remove-selected"
							on:click={() => removeSelected(collection.id)}
							aria-label="Remove selected collection"
						>
							<Fa icon={faMinus} size="sm" />
						</button>
					</li>
				{/each}
			</ul>
			<button
				on:click|preventDefault={handlePlaySelected}
			>
				Play Selected
			</button>
		</div>
	{/if}
	<div class="list grid">
		{#if isLoading}
			<Loading invert={true} />
		{:else}
			<!-- show # of collections -->
			<p class="collection-count">
				Showing {filteredCollections.length} of {totalCount} collections
			</p>
			<ul>
				{#each filteredCollections as collection}
					<CollectionCard
						{collection}
						showAdd={true}
						selected={selection.includes(collection.id)}
						on:toggleSelect={handleToggleSelect}
						onNavigate={handleNavigation}
					/>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<!-- Pagination controls -->
{#if !isLoading && totalPages > 1}
	<div class="paginationControls container margin-auto">
		{#each pageNumbers as pageNum}
			{#if pageNum === '...'}
				<span class="ellipsis">...</span>
			{:else}
				<button
					on:click|preventDefault={() => goToPage(pageNum)}
					class:active={pageNum === page}
					type="button"
				>
					{pageNum}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.selected-collections-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.selected-collections-list li {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: #f8f9fa;
		border-radius: 9999px;
		margin: 0;
	}

	.selected-collections-list li button.remove-selected {
		border: none;
		background: transparent;
		color: #dc3545;
		cursor: pointer;
		padding: 0;
		width: auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.selected-collections-list li button.remove-selected:hover {
		color: #c82333;
	}
</style>
