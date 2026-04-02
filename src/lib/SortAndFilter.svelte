<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let collection = [];
	export let sortOption = 'date';
	export let sortOrder = 'desc';
	export let itemsPerPage = 20;

	let itemsPerPageOptions = [20, 40, 80];

	// Local state for pending changes (before apply)
	let pendingSortOption = sortOption;
	let pendingSortOrder = sortOrder;

	import { tick } from 'svelte';
	let pendingFilterText = '';
	let filterDebounceTimeout;

	// Debounced filter dispatch
	$: if (pendingFilterText !== '' && typeof applyFilters === 'function') {
		clearTimeout(filterDebounceTimeout);
		filterDebounceTimeout = setTimeout(async () => {
			await tick();
			applyFilters();
		}, 400);
	}

	// Update pending values when props change
	$: pendingSortOption = sortOption;
	$: pendingSortOrder = sortOrder;

	// Handle itemsPerPage changes with explicit function (immediate effect)
	function handleItemsPerPageChange() {
		dispatch('itemsPerPageChanged', itemsPerPage);
	}

	// Apply filters and sorting (for server-side)
	function applyFilters() {
		// Update the actual values
		sortOption = pendingSortOption;
		sortOrder = pendingSortOrder;

		dispatch('serverFilterChange', {
			sortMode: sortOption,
			sortOrder,
			filterText: pendingFilterText,
			itemsPerPage
		});
	}
</script>

<div class="container">
	<div class="sort-and-filter white radius mb-3">
		<div class="controls-wrapper padding">
			<div class="controls-row">
				<div class="control-group">
					<label for="itemsPerPage">Items per page:</label>
					<select id="itemsPerPage" bind:value={itemsPerPage} on:change={handleItemsPerPageChange}>
						{#each itemsPerPageOptions as option, i}
							<option value={option} selected={i === 0}>{option}</option>
						{/each}
					</select>
				</div>
				<div class="control-group">
					<label for="sort">Sort by:</label>
					<select id="sort" bind:value={pendingSortOption}>
						<option value="name">Alphabetical</option>
						<option value="date">Creation Date</option>
						<option value="modified">Last Modified</option>
						<option value="size">Size</option>
						<option value="plays">Times Played</option>
					</select>
				</div>
				<div class="control-group">
					<label for="order">Order:</label>
					<select id="order" bind:value={pendingSortOrder}>
						<option value="asc">Ascending</option>
						<option value="desc">Descending</option>
					</select>
				</div>
				<div class="control-group">
					<label for="filter">Filter by:</label>
					<input
						type="text"
						id="filter"
						bind:value={pendingFilterText}
						placeholder="Type to filter..."
					/>
				</div>
			</div>

			<div class="apply-section">
				<button type="button" class="btn btn-primary" on:click={applyFilters}>
					Apply Filters
				</button>
			</div>
		</div>
	</div>
</div>
