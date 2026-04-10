<script>
	import FlashCards from '$lib/FlashCards.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { fetchCollectionById, incrementPlayCounter } from '$lib/api/collections.js';
	import { fetchCollectionItems } from '$lib/api/items.js';
	import { fetchCollaborators } from '$lib/api/user';
	import QuizHeader from '$lib/components/quiz/QuizHeader.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/../stores/user';
	export let data;

	// Destructure page data with fallbacks
	const { category, collectionId, author, thumbnail, quizScore, timesPlayed, meta } = data || {};

	let timer = 0;
	let interval = null;
	let quizStarted = false;
	let loading = true;
	let practiceMode = false;
	let flashCardsComponent;
	let collectionInfo = null;
	let cards = null;
	let canEditCollection = false;

	let collectionError;
	let collectionLoading = true;
	let cardsError;
	let cardsLoading = true;

	function slugify(value = '') {
		return String(value)
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
	}

	function handleEditCollection() {
		if (!collectionId) return;
		goto(`/upload?collectionId=${encodeURIComponent(collectionId)}`);
	}

	async function refreshEditPermission() {
		if (!collectionId || !$user?.id) {
			canEditCollection = false;
			return;
		}

		const currentUserName = ($user.username || '').toLowerCase();
		const authorFromCollection = (collectionInfo.author || '').toLowerCase();
		const authorSlugParam = $page.params?.author_slug || '';
		const isAuthor =
			(currentUserName && authorFromCollection && currentUserName === authorFromCollection) ||
			(currentUserName && slugify(currentUserName) === authorSlugParam);

		if (isAuthor) {
			canEditCollection = true;
			return;
		}

		try {
			const collaborators = await fetchCollaborators(collectionId);
			const list = Array.isArray(collaborators?.data)
				? collaborators.data
				: Array.isArray(collaborators)
					? collaborators
					: [];

			canEditCollection = list.some((collab) => {
				const collabUsername = (collab?.username || '').toLowerCase();
				return (
					collab?.id === $user.id ||
					collab?.public_id === $user.public_id ||
					(collabUsername && collabUsername === currentUserName)
				);
			});
		} catch (error) {
			console.error('Failed to check collaborator permissions:', error);
			canEditCollection = false;
		}
	}

	function startQuiz(isPractice = false) {
		practiceMode = isPractice;
		quizStarted = true;

		// Reset timer if not practice
		if (!isPractice) {
			timer = 0;
			interval = setInterval(() => (timer += 1), 1000);
		} else {
			clearInterval(interval);
		}

		// Increment play count for analytics
		if (collectionId) {
			incrementPlayCounter(collectionId);
		}
		loading = false;
	}

	// Track quiz completion state
	let quizCompleted = false;

	// Handle quiz finish
	function handleQuizFinish() {
		quizCompleted = true;
		clearInterval(interval);
	}

	// Add beforeunload warning when quiz is active
	function handleBeforeUnload(event) {
		if (quizStarted && !quizCompleted && !practiceMode) {
			const message =
				'You are in the middle of a quiz. Are you sure you want to leave? Your progress will be lost.';
			event.preventDefault();
			event.returnValue = message;
			return message;
		}
	}

	// Handle back button navigation
	function handlePopState(event) {
		if (quizStarted && !quizCompleted && !practiceMode) {
			const confirmed = confirm(
				'You are in the middle of a quiz. Are you sure you want to leave? Your progress will be lost.'
			);
			if (!confirmed) {
				// Push the current state back to prevent navigation
				history.pushState(null, '', window.location.href);
				return;
			} else {
				// User confirmed, allow navigation
				quizCompleted = true;
			}
		}
	}

	onMount(async () => {
		// Additional validation for route params
		const { author_slug, slug } = $page.params;
		if (!author_slug || !slug) {
			console.error('Missing route parameters:', { author_slug, slug });
			console.error('This suggests a routing/static generation issue');
		}

		// Don't attempt to load collection if we have server errors
		if (data?.status === 404 || data?.status === 500 || data?.status === 400) {
			console.error('Server returned error status:', data.status);
			return;
		}

		if (!collectionId) {
			collectionLoading = false;
			collectionError = 'No collectionId provided.';
			return;
		}
		try {
			collectionLoading = true;
			collectionError = null;
			// Fetch collection info (public)
			collectionInfo = await fetchCollectionById(collectionId, false);
			collectionLoading = false;
		} catch (err) {
			collectionError = err?.message || 'Failed to load collection info.';
			collectionLoading = false;
		}
		try {
			cardsLoading = true;
			cardsError = null;
			const result = await fetchCollectionItems(collectionId, false);
			if (result && Array.isArray(result.data)) {
				cards = result.data;
			} else if (Array.isArray(result)) {
				cards = result;
			} else {
				cards = [];
			}
			cardsLoading = false;
		} catch (err) {
			cardsError = err?.message || 'Failed to load cards.';
			cardsLoading = false;
		}

		// Add a history state to catch back button (browser only)
		if (typeof window !== 'undefined') {
			history.pushState(null, '', window.location.href);
			window.addEventListener('beforeunload', handleBeforeUnload);
			window.addEventListener('popstate', handlePopState);
		}
	});

	onDestroy(() => {
		clearInterval(interval);
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			window.removeEventListener('popstate', handlePopState);
		}
	});
</script>

<svelte:head>
	{#if meta}
		<!-- Title & Description -->
		<title>{meta.title}</title>
		<meta name="description" content={meta.description} />

		<!-- Open Graph -->
		<meta property="og:type" content="website" />
		<meta property="og:title" content={meta.title} />
		<meta property="og:description" content={meta.description} />
		<meta property="og:site_name" content={meta.siteName || 'Quizzems'} />
		{#if meta.url}<meta property="og:url" content={meta.url} />{/if}

		<!-- Twitter -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={meta.title} />
		<meta name="twitter:description" content={meta.description} />

		<!-- Image -->
		{#if meta.image}
			<meta name="image" content={meta.image} />
			<meta property="og:image" content={meta.image} />
			<meta property="og:image:secure_url" content={meta.image} />
			<meta property="og:image:type" content="image/jpeg" />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta name="twitter:image" content={meta.image} />
			<meta name="twitter:image:src" content={meta.image} />
			<link rel="image_src" href={meta.image} />
			<link rel="apple-touch-icon" href={meta.image} />
		{/if}

		<!-- Additional metadata -->
		<meta name="robots" content="index, follow" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta name="format-detection" content="telephone=no" />
		<meta name="application-name" content={meta.siteName || 'Quizzems'} />
		<meta name="theme-color" content={meta.themeColor || '#6F1D1B'} />
	{/if}
</svelte:head>

<div>
	{#if !quizStarted}
		<div class="white padding rounded m-3">
			{#if quizStarted}
				<!-- <QuizHeader
					collectionName={$quiz.collection.name || category}
					author={$quiz.collection.author || author}
					authorSlug={$quiz.collection.author_slug}
					thumbnail={$quiz.collection.thumbnail || thumbnail}
					description={$quiz.collection.description}
				/> -->
			{:else}
				<QuizHeader collectionName={category} {author} authorSlug="" {thumbnail} description="" />
			{/if}
			{#if timesPlayed > 0}<h3 class="mb-3">Times Played: {timesPlayed}</h3>{/if}
			{#if !quizStarted && !cards}
				{#if data?.status === 400}
					<h2 class="mb-3">Invalid URL</h2>
					<div class="alert alert-warning">
						The quiz URL is missing required parameters. Please check the link.
						<br /><small>URL: {$page?.url?.href || 'Unknown'}</small>
					</div>
				{:else if data?.status === 404}
					<h2 class="mb-3">Quiz Not Found</h2>
					<div class="alert alert-warning">
						This quiz could not be found. The author or collection may not exist.
					</div>
				{:else if data?.status === 500}
					<h2 class="mb-3">Server Error</h2>
					<div class="alert alert-danger">
						There was an error loading this quiz. Please try again later.
					</div>
				{:else}
					<h2 class="mb-3">Loading quiz data...</h2>
					{#if loading}
						<p class="text-muted">Fetching collection data...</p>
					{/if}
				{/if}
			{:else}
				<h2 class="mb-3">Ready to start?</h2>
				<button
					class="btn btn-primary me-2"
					style="width: auto; padding: 0 2rem;"
					on:click={() => startQuiz(false)}>Go</button
				>
				<button
					class="btn btn-outline-secondary"
					style="width: auto; padding: 0 2rem;"
					on:click={() => startQuiz(true)}>Practice</button
				>
			{/if}
		</div>
	{:else}
		<div class="mb-3 sticky-top white py-3">
			<div
				style="display:flex; justify-content:space-between; align-items:center; padding:0 1rem; gap: 1rem;"
			>
				<div style="flex:1;"></div>
				<h2 style="margin:0; text-align:center; flex:1;">
					{Array.isArray(cards) ? cards.filter((c) => c.isCorrect).length : 0}/{Array.isArray(cards)
						? cards.length
						: 0}
				</h2>
				{#if !practiceMode}
					<div class="timer" style="flex:1; text-align:right; white-space:nowrap;">
						Time: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
					</div>
				{:else}
					<div class="timer" style="flex:1; text-align:right; white-space:nowrap;"></div>
				{/if}
			</div>
		</div>
	{/if}

	<div id="quiz" style="display: {quizStarted ? 'block' : 'none'}">
		{#if loading}
			<div class="alert alert-info">Loading...</div>
		{:else}
			<FlashCards
				bind:this={flashCardsComponent}
				{practiceMode}
				{canEditCollection}
				{cards}
				on:finish={handleQuizFinish}
				on:giveup={handleQuizFinish}
				on:statsUpdate={(e) => {
					quizStats.set(e.detail);
				}}
				on:editCollection={handleEditCollection}
			/>
		{/if}
	</div>
</div>
