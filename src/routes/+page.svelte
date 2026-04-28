<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
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

	function loadSearchedPage(event) {
		const detail = event.detail;
		const url = `/quiz/${detail.author_public_id}/${detail.slug}`;
		const state = { collectionId: detail.id };
		if (browser) {
			goto(url, { state });
		}
	}

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
</div>

<div class="container mb-5">
	<h2>The quiz of the day is...</h2>
	<div class="p2">
		<Collections
			grid={true}
			list={false}
			sortmode="random-daily"
			limit={1}
			showAuthor={true}
			on:searched={loadSearchedPage}
		/>
	</div>
</div>

<div class="container">
	<h2>Popular Categories</h2>
</div>
<Tags count={12} centered={true} />

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
	<h2>Try Potpourri!</h2>
	<a href="/potpourri">p</a>
</div>

<div class="container">
	<div class="mt-3 mb-5">
		<a href="/explore?sort=popular">See More...</a>
	</div>
</div>
