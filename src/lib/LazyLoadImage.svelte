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

	// start by trying webp if it's a jpg/png
	$: tryWebp = originalSrc && originalSrc.match(/\.(jpe?g|png)$/i);
	$: currentSrc = tryWebp ? originalSrc.replace(/\.(jpe?g|png)$/i, '.webp') : originalSrc;

	function handleLoad(event) {
		dispatch('load', event);
	}

	function handleError(event) {
		if (currentSrc !== originalSrc) {
			// fallback to the original JPG/PNG
			currentSrc = originalSrc;
		} else {
			console.error('Failed to load image:', currentSrc);
			addToast({ type: 'error', message: 'Failed to load image. Please try again later.' });
			dispatch('error', event);
		}
	}
</script>

<div class="enhanced-image-wrapper {className}">
	{#if currentSrc}
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
</div>

<style>
	.enhanced-image-wrapper {
		display: inline-block;
		max-width: 100%;
	}
	.enhanced-image-wrapper img {
		width: 100%;
		height: auto;
		transition: opacity 0.3s ease-out;
	}
	.enhanced-image-wrapper img[data-loading] {
		opacity: 0.7;
	}
	.enhanced-image-wrapper img[data-loaded] {
		opacity: 1;
	}
</style>
