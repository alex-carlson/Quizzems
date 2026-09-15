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
	$: currentSrc = originalSrc;

	function handleLoad(event) {
		dispatch('load', event);
	}

	function handleError(event) {
		console.error('Failed to load image:', originalSrc);
		dispatch('error', event);
	}
</script>

<div class="enhanced-image-wrapper {className}" class:cover-fit={objectFit === 'cover'}>
	{#if currentSrc}
		<img
			src={currentSrc}
			{alt}
			{width}
			{height}
			loading={priority ? 'eager' : loading}
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
