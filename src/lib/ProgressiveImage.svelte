<script>
	export let imageUrl = '';
	export let tempSize = '';
	export let priority = false; // For above-the-fold images

	import { addToast } from '../store/toast';

	let loaded = false;
	let thumbnailLoaded = false;
	let imgElement;

	// Generate thumbnail URL (adjust based on your image service)
	$: thumbnailUrl = imageUrl ? generateThumbnailUrl(imageUrl, 100) : '';
	$: mediumUrl = imageUrl ? generateThumbnailUrl(imageUrl, 300) : '';

	function generateThumbnailUrl(url, size) {
		// Example implementation - adjust based on your image service
		if (url.includes('supabase') || url.includes('storage')) {
			// Supabase storage example
			return url.replace(/\/(.*?)$/, `/resize_${size}_$1`);
		}
		// Fallback for other services
		return url;
	}

	function handleThumbnailLoad() {
		thumbnailLoaded = true;
	}

	function handleLoad() {
		loaded = true;
	}

	function handleError(e) {
		console.error('Error loading image');
	}

	// Check if image is in cache
	function checkIfImageLoaded(url) {
		if (!url) return false;
		const img = new Image();
		img.src = url;
		return img.complete && img.naturalWidth > 0;
	}

	$: if (imageUrl) {
		// Check if full image is already cached
		if (checkIfImageLoaded(imageUrl)) {
			loaded = true;
			thumbnailLoaded = true;
		} else if (checkIfImageLoaded(thumbnailUrl)) {
			thumbnailLoaded = true;
		}
	}
</script>

<div class="progressive-image" style={tempSize ? `width: ${tempSize}; height: ${tempSize};` : ''}>
	{#if !thumbnailLoaded && !loaded}
		<!-- Shimmer placeholder -->
		<div class="shimmer"></div>
	{/if}

	{#if thumbnailUrl && !loaded}
		<!-- Load thumbnail first -->
		<img
			src={thumbnailUrl}
			alt="Thumbnail"
			loading={priority ? 'eager' : 'lazy'}
			class="thumbnail"
			class:visible={thumbnailLoaded}
			on:load={handleThumbnailLoad}
			on:error={handleError}
		/>
	{/if}

	{#if imageUrl}
		<!-- Load full resolution image -->
		<img
			bind:this={imgElement}
			src={mediumUrl || imageUrl}
			alt="Full image"
			loading={priority ? 'eager' : 'lazy'}
			class="full-image"
			class:visible={loaded}
			on:load={handleLoad}
			on:error={handleError}
		/>
	{/if}
</div>

<style>
	.progressive-image {
		position: relative;
		overflow: hidden;
		display: inline-block;
		width: var(--temp-size, auto);
		height: var(--temp-size, auto);
	}

	.progressive-image img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 0.3s ease-in-out;
		opacity: 0;
	}

	.progressive-image img.visible {
		opacity: 1;
	}

	.thumbnail {
		filter: blur(2px);
		z-index: 1;
	}

	.full-image {
		z-index: 2;
	}

	.shimmer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(to right, #f0f0f0 0%, #e0e0e0 20%, #f0f0f0 40%, #f0f0f0 100%);
		background-size: 200% 100%;
		animation: shimmer 1.2s infinite;
		z-index: 0;
		border-radius: 2px;
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}
</style>
