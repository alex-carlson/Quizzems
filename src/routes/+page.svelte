<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Collections from '$lib/Collections.svelte';
	import Tags from '$lib/components/Tags.svelte';
	import { fetchCardCount, fetchCollectionsCount } from '$lib/api/items';

	let pageWidth = 0;
	let cardCount = 0;
	let collectionCount = 0;

	onMount(async () => {
		if (browser) {
			pageWidth = window.innerWidth;
			window.addEventListener('resize', () => {
				pageWidth = window.innerWidth;
			});
			document.title = 'Quizzems';

			try {
				const [cards, collections] = await Promise.all([fetchCardCount(), fetchCollectionsCount()]);

				cardCount = cards;
				collectionCount = collections;
			} catch (err) {
				console.error('Failed to load stats:', err);
			}
		}
	});

	onMount(() => {
		if (browser) {
			document.title = 'Quizzems';
		}
	});
</script>

<div class="image-section py-3">
	<div class="image-content my-3 container text-center">
		<img
			class="my-2"
			src="/logo_yellow.webp"
			alt="Quizzems Logo"
			fetchpriority="high"
			aria-label="Quizzems Logo"
		/>
		<h4 class="pt-4">
			{cardCount} questions across {collectionCount} quizzes!
		</h4>
	</div>
	<div class="hero-discovery container pb-4">
		<section aria-labelledby="daily-quizzes-heading">
			<h2 id="daily-quizzes-heading">Quizzes of the Day</h2>
			<Collections
				grid={false}
				list={true}
				compact={true}
				sortmode="quiz-of-the-day"
				limit={6}
				showAuthor={true}
			/>
		</section>
		<section aria-labelledby="popular-categories-heading">
			<h2 id="popular-categories-heading">Popular Categories</h2>
			<Tags count={5} list={true} />
		</section>
	</div>
</div>

<div class="container mt-5">
	<h2>Latest Quizzes</h2>
	<Collections sortmode="latest" limit={4} showAuthor={true} />
</div>

<div class="container mt-5">
	<h2>Try something different</h2>
	{#if pageWidth > 0}
		<Collections sortmode="random" limit={pageWidth > 500 ? 8 : 6} showAuthor={true} />
	{/if}
</div>

<div class="container mt-5">
	<h2><a href="/potpourri">Try Potpourri!</a></h2>
</div>

<style>
	.hero-discovery {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: 2rem;
	}
	.hero-discovery h2 {
		margin-bottom: 1rem;
	}
	@media (max-width: 767px) {
		.hero-discovery {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.5rem;
		}
	}
</style>
