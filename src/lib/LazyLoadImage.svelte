<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let src = '';
	export let imageUrl = '';
	export let alt = 'Image';
	export let width = 800;
	export let height = undefined;
	export let sizes = '100vw';
	export let quality = 75;
	export let loading = 'lazy';
	export let className = '';
	export let placeholder = 'blur';
	export let priority = false;
	export let objectFit = 'contain';

	// original image URL
	$: originalSrc = src || imageUrl;

	// Only try webp if original is not webp
	$: isWebp = originalSrc && originalSrc.match(/\.webp($|\?)/i);
	$: webpSrc = !isWebp && originalSrc ? generateWebpUrl(originalSrc) : '';

	// Track loading attempts: 'webp' -> 'original'
	let currentFormat = !isWebp && webpSrc ? 'webp' : 'original';
	$: currentSrc = getCurrentSrc(originalSrc, webpSrc, currentFormat);

	function getCurrentSrc(original, webp, format) {
		if (!original) return '';

		switch (format) {
			case 'webp':
				return webp || original;
			case 'original':
			default:
				return original;
		}
	}

	function generateWebpUrl(url) {
		if (!url) return '';
		// Don't convert if already webp
		if (url.match(/\.webp($|\?)/i)) return url;

		// If URL has query params, add webp format
		if (url.includes('?')) {
			return url.includes('format=')
				? url.replace(/format=[^&]+/, 'format=webp')
				: `${url}&format=webp`;
		}

		// For direct file URLs, try changing extension to .webp
		if (url.match(/\.(jpe?g|png|gif|bmp|tiff?)$/i)) {
			return url.replace(/\.(jpe?g|png|gif|bmp|tiff?)$/i, '.webp');
		}

		// For other URLs, try adding webp query param
		return `${url}?format=webp`;
	}

	function handleLoad(event) {
		dispatch('load', event);
	}

	function handleError(event) {
		// Progress through formats: webp -> original
		if (currentFormat === 'webp') {
			currentFormat = 'original';
		} else {
			// All formats failed
			console.error('Failed to load image in all formats:', originalSrc);
			dispatch('error', event);
		}
	}
</script>

<div class="enhanced-image-wrapper {className}" class:cover-fit={objectFit === 'cover'}>
	{#if currentSrc}
		<img
			src={currentSrc}
			{alt}
			{width}
			{height}
			loading="eager"
			on:load={handleLoad}
			on:error={handleError}
			style="width:100%;height:100%;object-fit:{objectFit};"
		/>
	{/if}
</div>

<style>
	.enhanced-image-wrapper {
		display: block;
		width: 100%;
	}
	.enhanced-image-wrapper.cover-fit {
		display: block;
		width: 100%;
		height: 100%;
	}
	.enhanced-image-wrapper img {
		width: 100%;
		height: auto;
		transition: opacity 0.3s ease-out;
	}
	.enhanced-image-wrapper.cover-fit img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
