<script>
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '../stores/toast';

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

	// original image URL
	$: originalSrc = src || imageUrl;

	// Generate format URLs
	$: mp4Src = originalSrc ? generateMp4Url(originalSrc) : '';
	$: webpSrc = originalSrc ? generateWebpUrl(originalSrc) : '';

	// Track loading attempts: 'mp4' -> 'webp' -> 'original'
	let currentFormat = 'mp4';
	$: currentSrc = getCurrentSrc(originalSrc, mp4Src, webpSrc, currentFormat);

	function getCurrentSrc(original, mp4, webp, format) {
		if (!original) return '';

		switch (format) {
			case 'mp4':
				return mp4 || webp || original;
			case 'webp':
				return webp || original;
			case 'original':
			default:
				return original;
		}
	}

	function generateMp4Url(url) {
		if (!url) return '';

		// If URL has query params, add mp4 format
		if (url.includes('?')) {
			return url.includes('format=')
				? url.replace(/format=[^&]+/, 'format=mp4')
				: `${url}&format=mp4`;
		}

		// For direct file URLs, try changing extension to .mp4
		if (url.match(/\.(jpe?g|png|gif|bmp|tiff?|webp)$/i)) {
			return url.replace(/\.(jpe?g|png|gif|bmp|tiff?|webp)$/i, '.mp4');
		}

		// For other URLs, try adding mp4 query param
		return `${url}?format=mp4`;
	}

	function generateWebpUrl(url) {
		if (!url) return '';

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
		// Progress through formats: mp4 -> webp -> original
		if (currentFormat === 'mp4' && webpSrc) {
			currentFormat = 'webp';
		} else if (currentFormat === 'webp') {
			currentFormat = 'original';
		} else {
			// All formats failed
			console.error('Failed to load image in all formats:', originalSrc);
			addToast({ type: 'error', message: 'Failed to load image. Please try again later.' });
			dispatch('error', event);
		}
	}

	// Reset format when URL changes
	$: if (originalSrc) {
		currentFormat = 'mp4';
	}
</script>

<div class="enhanced-image-wrapper {className}">
	{#if currentSrc}
		{#if currentFormat === 'mp4' && currentSrc.includes('.mp4')}
			<!-- Try MP4 as video first -->
			<video
				src={currentSrc}
				{width}
				{height}
				loading={priority ? 'eager' : loading}
				autoplay
				muted
				loop
				playsinline
				on:loadeddata={handleLoad}
				on:error={handleError}
				style="width:100%;height:auto;object-fit:cover;"
			/>
		{:else}
			<!-- WebP or original image formats -->
			<img
				src={currentSrc}
				{alt}
				{width}
				{height}
				loading={priority ? 'eager' : loading}
				on:load={handleLoad}
				on:error={handleError}
				style="width:100%;height:auto;"
			/>
		{/if}
	{/if}
</div>

<style>
	.enhanced-image-wrapper {
		display: inline-block;
		max-width: 100%;
	}
	.enhanced-image-wrapper img,
	.enhanced-image-wrapper video {
		width: 100%;
		height: auto;
		transition: opacity 0.3s ease-out;
	}
	.enhanced-image-wrapper img[data-loading],
	.enhanced-image-wrapper video[data-loading] {
		opacity: 0.7;
	}
	.enhanced-image-wrapper img[data-loaded],
	.enhanced-image-wrapper video[data-loaded] {
		opacity: 1;
	}
</style>
