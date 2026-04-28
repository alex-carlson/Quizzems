<script>
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '../../store/toast';
	import { Fa } from 'svelte-fa';
	import { faSearch } from '@fortawesome/free-solid-svg-icons';
	const dispatch = createEventDispatcher();
	const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
	const CX = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;
	export let searchTerm = '';
	let searchOverride = '';

	export let fileType = 'any';
	export let suggestions = [];

	// Pagination tracking
	let currentStartIndex = 1;
	let isLoading = false;
	let hasMoreResults = true;
	let totalResults = 0;

	// Use searchOverride if it exists, otherwise use searchTerm
	$: effectiveSearchTerm = searchOverride || searchTerm;

	// Auto-update searchOverride when searchTerm changes (from answer text box)
	$: if (searchTerm) {
		searchOverride = searchTerm;
	}

	// Clear suggestions when fileType changes (but only for user-initiated changes)
	let previousFileType = fileType;
	$: {
		if (fileType !== previousFileType && suggestions.length > 0) {
			// Only clear if we're not currently fetching and this is a true file type change
			if (!isLoading) {
				suggestions = [];
				currentStartIndex = 1;
				hasMoreResults = true;
			}
		}
		previousFileType = fileType;
	}

	export async function fetchSuggestions(append = false) {
		if (isLoading) {
			return;
		}
		isLoading = true;

		// Reset pagination for new searches
		if (!append) {
			currentStartIndex = 1;
			hasMoreResults = true;
		}

		// if filetype is png, add transparent, no background, isolated, etc. to the query
		let fullQuery = effectiveSearchTerm;

		// Add file type filter
		if (fileType === 'any') {
			// For 'any', we'll exclude vector formats by adding negative terms to the query
			fullQuery += ' -svg -eps -pdf -ai';
		}

		// Build the URL with the final query
		let url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(fullQuery)}&searchType=image&key=${API_KEY}&cx=${CX}&start=${currentStartIndex}`;

		// Add specific file type filter if not 'any'
		if (fileType !== 'any') {
			url += `&fileType=${fileType}`;
		}

		try {
			const res = await fetch(url);
			const data = await res.json();

			if (data.error && data.error.errors && data.error.errors[0].reason === 'dailyLimitExceeded') {
				addToast({
					type: 'error',
					message:
						'Google Search API quota limit reached. Please try again tomorrow or use another upload method.'
				});
				if (!append) suggestions = [];
				isLoading = false;
				console.error(data.error);
				return;
			}

			if (data.items) {
				const newItems = data.items
					.filter((item) => item.link && item.image && item.image.thumbnailLink)
					.map((item) => ({
						title: item.title,
						thumbnail: item.image.thumbnailLink,
						url: item.link,
						loaded: false // Track if full image is loaded
					}));

				if (append) {
					suggestions = [...suggestions, ...newItems];
				} else {
					suggestions = newItems;
				}

				// Update pagination
				currentStartIndex += 10;
				totalResults = parseInt(data.searchInformation?.totalResults || '0');
				hasMoreResults = currentStartIndex <= Math.min(totalResults, 100); // Google limits to 100 results
			} else {
				if (!append) suggestions = [];
				hasMoreResults = false;
			}
		} catch (e) {
			console.error('Image search failed:', e);
			addToast({
				type: 'error',
				message: 'Failed to fetch image suggestions. Please try again later.'
			});
			// Only clear suggestions for new searches
			if (!append) suggestions = [];
			hasMoreResults = false;
		}

		isLoading = false;
	}
	function handleAddImage(url, index) {
		// Check if suggestion exists
		if (!suggestions[index]) {
			addToast({
				type: 'error',
				message: 'Invalid image selection. Please try again.'
			});
			return;
		}

		// Create proper data structure with src - let QuestionTypeForm handle answers
		const imageData = {
			file: url, // Pass URL string directly for URL-based uploads
			src: url, // Set src to the image URL
			url: url // Ensure url field is present for URL uploads
		};

		dispatch('addImage', imageData);

		// Clear search override after adding image
		searchOverride = '';
	}

	// Handle load more button click
	function loadMoreImages() {
		fetchSuggestions(true); // append = true
	}
</script>

<div class="suggestions">
	<div class="search-controls">
		<label for="searchOverride">Search Override</label>
		<input
			name="searchOverride"
			type="text"
			bind:value={searchOverride}
			placeholder="Search for images..."
			class="search-input search-override"
		/>
		<div class="d-flex align-items-end gap-3 w-100">
			<div class="file-type-selector flex-fill">
				<label for="fileType" class="form-label">File Type:</label>
				<select id="fileType" bind:value={fileType}>
					<option value="any">Any (PNG, JPG, GIF, etc.)</option>
					<option value="png">PNG</option>
					<option value="jpg">JPG</option>
					<option value="gif">GIF</option>
				</select>
			</div>
			<button
				class="btn btn-primary"
				on:click|preventDefault={() => fetchSuggestions(false)}
				disabled={!effectiveSearchTerm || effectiveSearchTerm.length <= 3}
				style="max-width: 50px;"
			>
				<Fa icon={faSearch} />
			</button>
		</div>
		{#if suggestions.length > 0}
			<h6 class="mt-2">Showing results for {effectiveSearchTerm}</h6>
		{/if}
	</div>
	<div class="scroll-wrapper">
		<div class="suggestions-list">
			{#each suggestions as suggestion, originalIndex}
				<div class="suggestion-item">
					<div class="image-container">
						<img
							src={suggestion.loaded ? suggestion.url : suggestion.thumbnail}
							alt={suggestion.title}
							loading="lazy"
							on:load={() => {
								if (!suggestion.loaded && !suggestion.url.includes('nocookie')) {
									const img = new window.Image();
									img.src = suggestion.url;
									img.onload = () => {
										suggestions[originalIndex].loaded = true;
										suggestions = [...suggestions];
									};
								}
							}}
							on:error={(e) => {
								// fallback to thumbnail if main image fails
								suggestions[originalIndex].loaded = false;
								suggestions = [...suggestions];
								e.target.src = suggestion.thumbnail;
							}}
						/>
					</div>
					<p class="suggestion-title">{suggestion.title}</p>
					<div class="button-group">
						<button on:click={() => handleAddImage(suggestion.url, originalIndex)}> Add </button>
					</div>
				</div>
			{/each}
		</div>
		{#if suggestions.length > 0}
			<div class="load-more-section">
				{#if hasMoreResults}
					<button class="load-more-btn" on:click={loadMoreImages} disabled={isLoading}>
						{#if isLoading}
							<div class="loading-spinner-small"></div>
							Loading...
						{:else}
							More
						{/if}
					</button>
				{:else}
					<div class="end-message">
						<p>No more results available (showing {suggestions.length} images)</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.search-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.search-input,
	.file-type-selector select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.scroll-wrapper {
		max-height: 75vh;
		overflow-y: auto;
		overflow-x: hidden;
		width: 100%;
	}

	.suggestions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		box-sizing: border-box;
	}

	.suggestion-item {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		background: white;
		transition: all 0.2s ease;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Horizontal layout on desktop */
	@media (min-width: 768px) {
		.suggestion-item {
			flex-direction: row;
			align-items: flex-start;
		}
	}

	.image-container {
		position: relative;
		flex-shrink: 0;
		width: 100%;
		max-width: 400px;
		height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f8f9fa;
		border-radius: 4px;
		overflow: hidden;
	}

	.search-override {
		border: solid 2px #131313;
		border-radius: 8px;
	}

	/* Desktop: fixed width, mobile: constrained width */
	@media (min-width: 768px) {
		.image-container {
			width: 400px;
		}
	}

	.suggestion-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 120px;
	}

	.suggestion-item img {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		border-radius: 4px;
	}

	.validation-overlay {
		position: absolute;
		top: 5px;
		right: 5px;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		background: rgba(0, 0, 0, 0.8);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
	}

	.validation-icon {
		font-weight: bold;
		font-size: 16px;
	}

	.validation-icon.valid {
		color: #28a745;
	}

	.validation-icon.validating {
		color: #ffc107;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.image-info {
		color: white;
		font-size: 10px;
	}

	.suggestion-title {
		font-size: 14px;
		margin: 0.5rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
		margin-top: auto;
	}

	.button-group button {
		flex: 1;
		padding: 0.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
		transition: background-color 0.2s ease;
	}

	.button-group button:first-child {
		background: #007bff;
		color: white;
	}

	.button-group button:first-child:disabled {
		background: #6c757d;
		cursor: not-allowed;
	}

	.load-more-section {
		display: flex;
		justify-content: center;
		padding: 2rem;
	}

	.load-more-btn {
		padding: 1rem 2rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 16px;
		font-weight: 500;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 200px;
		justify-content: center;
	}

	.load-more-btn:hover:not(:disabled) {
		background: #0056b3;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
	}

	.load-more-btn:disabled {
		background: #6c757d;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.loading-spinner-small {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.end-message {
		text-align: center;
		padding: 2rem;
		color: #6c757d;
		font-style: italic;
	}

	.end-message p {
		margin: 0;
	}
</style>
