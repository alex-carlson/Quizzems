<script>
	import { onMount } from 'svelte';
	import { fetchRandomItems } from '$lib/api/items';
	import FlashCards from '$lib/FlashCards.svelte';
	import { quiz } from '$store/quiz';

	let count = 5;
	let loading = false;
	let error = '';

	async function getRandomItems() {
		error = '';
		loading = true;

		try {
			const result = await fetchRandomItems(count);

			const cards = Array.isArray(result) ? result : result?.data || [];

			quiz.setCards(cards);
			quiz.setQuizStarted(false);
			quiz.setQuizCompleted(false);
			quiz.setShowCategory(true);
		} catch (e) {
			error = e?.message || 'Failed to fetch items';
			quiz.setCards([]);
		}

		loading = false;
	}

	onMount(() => {
		document.title = 'Potpourri';
	});
</script>

<div class="container mt-3 white p-2 rounded">
	<h1>Potpourri!</h1>

	<span>
		<label for="count">How many? (1-200): </label>

		<input type="number" name="count" id="count" min="1" max="200" bind:value={count} />
		<button on:click={getRandomItems} disabled={loading}> Get Random </button>
	</span>
</div>

<div class="container mt-3">
	{#if loading}
		<div class="loading-state" style="display: flex; align-items: center; gap: 0.5rem;">
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				class="spin"
			>
				<circle
					cx="12"
					cy="12"
					r="10"
					stroke="#007bff"
					stroke-width="4"
					stroke-linecap="round"
					stroke-dasharray="60 20"
				/>
			</svg>
			<span>Loading random items...</span>
		</div>
	{:else if error}
		<p class="error">{error}</p>
	{:else if $quiz.cards.length > 0}
		<FlashCards />
	{/if}
</div>

<style>
	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}
</style>
