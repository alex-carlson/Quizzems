<script>
	import { createEventDispatcher } from 'svelte';
	import { Fa } from 'svelte-fa';
	import { faSearch, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
	const dispatch = createEventDispatcher();
	export function addSong(data) {
		searchTerm = '';
		// This function can be used to add a song to a playlist or perform other actions
		console.log(`Adding song with title: ${data.title}, ID: ${data.videoId}`);
		dispatch('addSong', data);
	}
	let searchTerm = '';
	let results = [];
	let pasteUrl = '';
	let isLoading = false;

	async function searchYoutube() {
		if (!searchTerm) return;

		isLoading = true;
		const query = searchTerm + ' song';
		const url = `${import.meta.env.VITE_API_URL}/youtube/search?q=${encodeURIComponent(query)}`;

		try {
			const res = await fetch(url);
			const data = await res.json();
			console.log('YouTube search data:', data);
			results = (data.items || data.results || []).map((item) => {
				const videoId = item.videoId || (item.id && item.id.videoId) || item.id || '';
				return {
					title: item.title || (item.snippet && item.snippet.title) || '',
					videoId,
					thumbnail:
						item.thumbnail ||
						(item.snippet &&
							item.snippet.thumbnails &&
							item.snippet.thumbnails.medium &&
							item.snippet.thumbnails.medium.url) ||
						(item.thumbnails && item.thumbnails.medium && item.thumbnails.medium.url) ||
						(videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : '')
				};
			});
		} catch (err) {
			console.error('Error fetching YouTube data:', err);
		} finally {
			isLoading = false;
		}
	}

	function handlePasteUrl() {
		const url = pasteUrl.trim();
		if (!url) {
			alert('Invalid YouTube URL');
			return;
		}
		// Regex to extract YouTube video ID from various URL formats
		const match =
			url.match(
				/(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
			) || url.match(/^([a-zA-Z0-9_-]{11})$/);

		const videoId = match ? match[1] : null;
		if (!videoId) {
			alert('Invalid YouTube URL or ID');
			return;
		}
		addSong({
			title: `Video ID: ${videoId}`,
			videoId,
			thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`
		});
	}
</script>

<div class="container white audio-uploader padding">
	<h2 class="mb-3">Search YouTube</h2>
	<div class="search-container">
		{#if searchTerm.trim() !== ''}
			<button
				type="button"
				on:click={() => {
					searchTerm = '';
					results = [];
				}}
				aria-label="Clear"
				class="clear-btn left"
				style="margin-left: 4px;"
			>
				<Fa icon={faTimes} />
			</button>
		{/if}
		<input
			id="youtube-search-input"
			type="text"
			bind:value={searchTerm}
			placeholder="e.g. Prince"
			class:hasText={searchTerm.trim().length > 0}
			on:keydown={(e) => {
				if (e.key === 'Enter') searchYoutube();
			}}
		/>
		<button on:click={searchYoutube} disabled={isLoading}>
			{#if isLoading}
				<div class="spinner"></div>
			{:else}
				<Fa icon={faSearch} />
			{/if}
		</button>
	</div>
	{#if isLoading}
		<div class="loading-message">Searching YouTube...</div>
	{:else if results.length > 0}
		<ul>
			{#each results as result}
				<li>
					<button
						type="button"
						on:click={() => addSong(result)}
						style="background:none;border:none;padding:0;cursor:pointer;text-align:left;width:100%;"
					>
						<img
							src={`https://img.youtube.com/vi/${result.videoId}/default.jpg`}
							alt="Thumbnail"
							width="80"
							height="60"
							style="vertical-align: middle; margin-right: 8px;"
						/>
						<div class="text">
							{@html result.title
								.replace(/&amp;/g, '&')
								.replace(/&quot;/g, '"')
								.replace(/&#39;/g, "'")}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="mt-4">
		<p class="text-muted mb-0">
			You can also paste a YouTube video ID or URL directly below to add it.
		</p>
	</div>
	<div class="paste-url-container d-flex align-items-center gap-2">
		<input
			type="text"
			bind:value={pasteUrl}
			placeholder="Paste YouTube ID here"
			on:keydown={(e) => {
				if (e.key === 'Enter') handlePasteUrl();
			}}
			class="form-control"
		/>
		<button
			style="width: 45px; height: 45px;"
			on:click={handlePasteUrl}
			class="btn btn-sm btn-primary"><Fa icon={faPlus} /></button
		>
	</div>
</div>

<style>
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid #f3f3f3;
		border-top: 2px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.loading-message {
		text-align: center;
		padding: 1rem;
		color: #666;
		font-style: italic;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
