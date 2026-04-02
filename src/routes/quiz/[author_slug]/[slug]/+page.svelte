<script>
	import FlashCards from '$lib/FlashCards.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { incrementPlayCounter } from '$lib/api/collections.js';
	import { fetchCollaborators } from '$lib/api/user';
	import QuizHeader from '$lib/components/quiz/QuizHeader.svelte';
	import { createQuizStore } from '$lib/../stores/quiz';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/../stores/user';
	export let data;

	// Debug the incoming data and route params
	console.log('Page data received:', data);
	console.log('Route params from page store:', $page.params);
	console.log('Current URL:', $page.url.href);

	// Destructure page data with fallbacks
	const { category, collectionId, author, thumbnail, quizScore, timesPlayed, meta } = data || {};

	console.log('Destructured values:', {
		category,
		collectionId,
		author,
		thumbnail,
		quizScore,
		timesPlayed
	});

	// Initialize quiz store
	const quiz = createQuizStore();
	$: stats = quiz.stats;

	let timer = 0;
	let interval = null;
	let quizStarted = false;
	let practiceMode = false;
	let flashCardsComponent;
	let quizStats = { correct: 0, total: 0 };
	let imagesPreloaded = false;
	let imagePreloadCount = 0;
	let totalImages = 0;
	let preloadStarted = false;
	let loadedImages = 0;
	let failedImages = 0;
	let canEditCollection = false;
	let permissionCheckKey = '';

	function slugify(value = '') {
		return String(value)
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
	}

	async function refreshEditPermission() {
		if (!collectionId || !$user?.id) {
			canEditCollection = false;
			return;
		}

		const currentUserName = ($user.username || '').toLowerCase();
		const authorFromCollection = ($quiz.collection?.author || '').toLowerCase();
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

	function handleEditCollection() {
		if (!collectionId) return;
		goto(`/upload?collectionId=${encodeURIComponent(collectionId)}`);
	}

	// Preload images function
	function preloadImages(cards) {
		// Extract all unique image URLs from cards
		const imageUrls = [
			...new Set([
				...cards
					.filter((card) => card.questionType === 'image' && card.imageUrl)
					.map((card) => card.imageUrl)
			])
		];

		totalImages = imageUrls.length;
		imagePreloadCount = 0;
		loadedImages = 0;
		failedImages = 0;

		console.log(`Starting preload of ${totalImages} unique images:`, imageUrls);

		if (totalImages === 0) {
			imagesPreloaded = true;
			return;
		}

		const preloadPromises = imageUrls.map((url, index) => {
			return new Promise((resolve) => {
				const img = new Image();
				let completed = false;

				const onComplete = (loaded = false) => {
					if (completed) return; // Prevent multiple calls
					completed = true;
					imagePreloadCount++;
					if (loaded) {
						loadedImages++;
					} else {
						failedImages++;
					}
					resolve(loaded);
				};

				img.onload = () => onComplete(true);
				img.onerror = () => onComplete(false); // Mark as failed but continue
				img.src = url;
				// No artificial timeout - let the browser handle loading naturally
			});
		});

		// Wait for all images to either load or fail naturally
		Promise.all(preloadPromises).then(() => {
			console.log(
				`Image preloading completed. Loaded: ${loadedImages}, Failed: ${failedImages}, Total: ${imagePreloadCount}/${totalImages}`
			);
			imagesPreloaded = true;
		});
	}

	// Preload images when cards are loaded (memoized to prevent excessive checks)
	let lastCardsHash = '';
	$: {
		if ($quiz.hasInitialized && $quiz.cards.length > 0 && !imagesPreloaded && !preloadStarted) {
			// Create a hash to avoid redundant preload triggers
			const cardsHash = `${$quiz.cards.length}-${$quiz.hasInitialized}`;
			if (cardsHash !== lastCardsHash) {
				lastCardsHash = cardsHash;
				preloadStarted = true;
				preloadImages($quiz.cards);
			}
		}
	}

	// Log collection data when received
	$: {
		console.log('Quiz state debug:', {
			hasInitialized: $quiz.hasInitialized,
			isLoading: $quiz.isLoading,
			collectionExists: !!$quiz.collection,
			collectionName: $quiz.collection?.name,
			cardsLength: $quiz.cards?.length,
			loadingError: $quiz.loadingError,
			collectionIdFromProps: collectionId
		});

		if ($quiz.hasInitialized && $quiz.collection) {
			console.log('Collection data received:', $quiz.collection);
		}

		if ($quiz.loadingError) {
			console.error('Quiz loading error:', $quiz.loadingError);
		}
	}

	$: {
		const key = `${collectionId || ''}:${$user?.id || ''}:${$quiz?.collection?.author || ''}`;
		if (key !== permissionCheckKey) {
			permissionCheckKey = key;
			refreshEditPermission();
		}
	}

	function startQuiz(isPractice = false) {
		if (!isPractice) {
			timer = 0;
			interval = setInterval(() => (timer += 1), 1000);
		} else {
			clearInterval(interval);
		}

		if (collectionId) {
			incrementPlayCounter(collectionId);
		}

		quizStarted = true;
		practiceMode = isPractice;

		// Call onQuizStart on the FlashCards component
		if (flashCardsComponent?.onQuizStart) {
			flashCardsComponent.onQuizStart();
		}
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

	// Add event listener on mount and remove on destroy
	onMount(() => {
		console.log('Quiz page mounted with data:', {
			collectionId,
			category,
			author,
			thumbnail,
			status: data?.status,
			routeParams: $page.params,
			currentUrl: $page.url.href
		});

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

		if (collectionId) {
			console.log('Attempting to load collection:', collectionId);
			quiz.loadCollection(collectionId);
		} else {
			console.error('No collectionId provided to quiz page. Data was:', data);
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
		// Cleanup quiz store
		if (quiz?.cleanup) {
			quiz.cleanup();
		}
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
			{#if $quiz.hasInitialized}
				<QuizHeader
					collectionName={$quiz.collection.name || category}
					author={$quiz.collection.author || author}
					authorSlug={$quiz.collection.author_slug}
					thumbnail={$quiz.collection.thumbnail || thumbnail}
					description={$quiz.collection.description}
				/>
			{:else}
				<QuizHeader collectionName={category} {author} authorSlug="" {thumbnail} description="" />
			{/if}
			{#if timesPlayed > 0}<h3 class="mb-3">Times Played: {timesPlayed}</h3>{/if}
			{#if !$quiz.hasInitialized || data?.status === 404 || data?.status === 500 || data?.status === 400}
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
					{#if $quiz.isLoading}
						<p class="text-muted">Fetching collection data...</p>
					{/if}
					{#if $quiz.loadingError}
						<div class="alert alert-danger">
							<strong>Loading Error:</strong>
							{$quiz.loadingError}
							<br /><small>Collection ID: {collectionId}</small>
						</div>
					{/if}
				{/if}
			{:else if !imagesPreloaded && totalImages > 0}
				<h2 class="mb-3">Preparing images... ({imagePreloadCount}/{totalImages})</h2>
				<div class="progress mb-3" style="height: 12px;">
					<div
						class="progress-bar bg-success"
						role="progressbar"
						style="width: {totalImages > 0 ? (loadedImages / totalImages) * 100 : 0}%"
						title="Successfully loaded images"
					></div>
					<div
						class="progress-bar bg-warning"
						role="progressbar"
						style="width: {totalImages > 0 ? (failedImages / totalImages) * 100 : 0}%"
						title="Failed to load images"
					></div>
				</div>
				<p class="text-muted small mb-2">
					{loadedImages} loaded, {failedImages} failed of {totalImages} images
				</p>
				<p class="text-muted small mb-3">Loading images in the background...</p>
				<button
					class="btn btn-outline-primary btn-sm me-2"
					style="width: auto; padding: 0 1rem;"
					on:click={() => {
						imagesPreloaded = true;
						preloadStarted = true;
					}}>Skip Preload</button
				>
				{#if failedImages > 0}
					<small class="text-muted"
						>{failedImages} image(s) failed to load and will be skipped</small
					>
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
					{quizStats.correct}/{quizStats.total}
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
		<FlashCards
			bind:this={flashCardsComponent}
			{practiceMode}
			{collectionId}
			{quiz}
			{canEditCollection}
			on:finish={handleQuizFinish}
			on:giveup={handleQuizFinish}
			on:statsUpdate={(e) => {
				quizStats = e.detail;
			}}
			on:editCollection={handleEditCollection}
		/>
	</div>
</div>
