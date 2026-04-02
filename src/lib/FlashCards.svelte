<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { user } from '../stores/user';
	import { youtubePlayerService } from './api/youtubePlayer.js';
	import { getRandomPhraseForScore, toLetterGrade } from './api/quizScore';
	import { createQuizStore } from '../stores/quiz';
	import { imagePreloader } from './imagePreloader.js';

	// Components
	import Modal from './Modal.svelte';
	import Card from './Card.svelte';
	import Loading from './components/Loading.svelte';
	import Toolbar from './components/quiz/Toolbar.svelte';
	import QuizActions from './components/quiz/QuizActions.svelte';
	import ErrorDisplay from './components/quiz/ErrorDisplay.svelte';
	// Props
	export let collectionId;
	export let practiceMode;
	export let isPartyMode = false;
	export let quiz; // Allow external quiz store to be passed in
	export let canEditCollection = false;

	// Initialize quiz store (use external if provided, otherwise create new)
	const quizStore = quiz ?? createQuizStore();
	const dispatch = createEventDispatcher();

	// Access stats as a separate reactive store with throttling
	let statsUpdateTimeout;
	let currentStats = quizStore.stats;
	$: {
		// Throttle stats updates to prevent excessive recalculations
		if (statsUpdateTimeout) clearTimeout(statsUpdateTimeout);
		statsUpdateTimeout = setTimeout(() => {
			currentStats = quizStore.stats;
		}, 50); // 50ms throttle
	}
	$: stats = currentStats;

	// Flag to prevent multiple completion attempts
	let isCompletingQuiz = false;

	// Auto-trigger completion when all cards are revealed
	$: {
		if ($stats.isComplete && !$quizStore.showModal && !$quizStore.isComplete && !isCompletingQuiz) {
			isCompletingQuiz = true;

			// Add timeout to prevent hanging
			const completionTimeout = setTimeout(() => {
				console.warn('Quiz completion timed out, forcing completion');
				isCompletingQuiz = false;
				dispatch('finish');
			}, 10000); // 10 second timeout

			quizStore
				.completeQuiz($user?.id ?? undefined, $user?.token ?? undefined)
				.then(() => {
					clearTimeout(completionTimeout);
					dispatch('finish');
				})
				.catch((error) => {
					console.error('Error completing quiz:', error);
					clearTimeout(completionTimeout);
					// Reset flag on error so user can try again
					isCompletingQuiz = false;
					// Still dispatch finish to show results
					dispatch('finish');
				})
				.finally(() => {
					// Reset flag after completion (success or error)
					isCompletingQuiz = false;
				});
		}
	}

	// Dispatch stats updates for live score display
	$: if ($stats && $quizStore.hasInitialized) {
		dispatch('statsUpdate', $stats);
	}

	// Handle toolbar updates
	function handleToolbarUpdate(event) {
		const updates = event.detail;

		// Handle different types of updates
		if (updates.cards) {
			// Update all cards (e.g., shuffle, reset)
			quizStore.update((state) => ({ ...state, ...updates }));
		} else if (updates.hasOwnProperty('isGrid')) {
			// Toggle grid
			quizStore.toggleGrid();
		} else if (updates.hasOwnProperty('isFullscreen')) {
			// Handle fullscreen toggle
			quizStore.update((state) => ({ ...state, ...updates }));
		} else {
			// Generic update
			quizStore.update((state) => ({ ...state, ...updates }));
		}
	}

	function onCardLoad(index) {
		quizStore.updateCard(index, { loaded: true });
	}

	export function setRevealed(index, value, playerId = null) {
		const updates = { revealed: value };
		if (playerId) {
			updates.answerer = playerId;
		}
		quizStore.updateCard(index, updates);
	}

	export function shuffleCards(seed) {
		quizStore.shuffleCards(seed);
	}

	function toggleReveal(index) {
		const card = $quizStore.cards[index];
		const wasRevealed = card.revealed;

		quizStore.updateCard(index, { revealed: !card.revealed });

		// If card was just revealed (not hidden), trigger auto-play for next audio
		if (!wasRevealed) {
			console.log('Card revealed in FLASH_CARDS mode, checking for next audio');
			// Auto-play next audio question when a card is revealed
			const nextCardIndex = $quizStore.cards.findIndex((card, i) => i > index && !card.revealed);
			console.log('Looking for next card after index', index, 'found:', nextCardIndex);

			if (nextCardIndex !== -1) {
				const nextCard = $quizStore.cards[nextCardIndex];
				console.log('Next card:', nextCard);

				// Check if the next card has audio content
				if (nextCard.audio) {
					try {
						console.log('Auto-playing next audio question:', nextCard.audio);
						youtubePlayerService.loadVideoOnly(nextCard.audio);
					} catch (error) {
						console.error('Failed to auto-play next audio question:', error);
					}
				} else {
					console.log('Next card has no audio content');
				}
			} else {
				console.log('No next card found');
			}
		}
	}

	function setMode(mode) {
		quizStore.setMode(mode);
	}

	// Throttle answer processing to prevent hangs from rapid submissions
	let isProcessingAnswer = false;
	let answerProcessingTimeout;

	function onCorrectAnswer(event) {
		if (isProcessingAnswer) {
			console.log('Already processing an answer, ignoring duplicate event');
			return;
		}

		isProcessingAnswer = true;

		try {
			const { index, answer, userAnswer, isCorrect } = event.detail;
			console.log('Correct answer event received:', { index, answer, userAnswer, isCorrect });

			// Use requestAnimationFrame for better performance
			requestAnimationFrame(() => {
				quizStore.updateCard(index, {
					revealed: true,
					userAnswer: userAnswer || answer,
					isCorrect: isCorrect // Store whether the answer was actually correct
				});
			});

			// Auto-play next audio question when a correct answer is given (debounced)
			setTimeout(() => {
				const nextCardIndex = $quizStore.cards.findIndex((card, i) => i > index && !card.revealed);

				if (nextCardIndex !== -1) {
					const nextCard = $quizStore.cards[nextCardIndex];

					// Check if the next card has audio content
					if (nextCard.audio) {
						try {
							youtubePlayerService.loadVideoOnly(nextCard.audio);
						} catch (error) {
							console.error('Failed to auto-play next audio question:', error);
						}
					} else {
						console.log('Next card has no audio content');
					}
				} else {
					console.log('No next card found');
				}
			}, 100); // Delay auto-play slightly
		} catch (error) {
			console.error('Error processing correct answer:', error);
		} finally {
			// Reset the processing flag after a delay to prevent rapid-fire events
			if (answerProcessingTimeout) clearTimeout(answerProcessingTimeout);
			answerProcessingTimeout = setTimeout(() => {
				isProcessingAnswer = false;
			}, 150); // Slightly longer delay
		}

		// Dispatch event on next tick to prevent blocking
		setTimeout(() => {
			dispatch('correctAnswer', event.detail);
		}, 0);
	}

	function retryFetch() {
		quizStore.retry();
	}

	onMount(() => {
		if (collectionId && !$quizStore.hasInitialized) {
			quizStore.loadCollection(collectionId);
		}

		// Setup image preloading
		if ($quizStore.cards.length > 0) {
			// Start preloading first few images
			imagePreloader.preloadImagesForRange($quizStore.cards, 0, 'forward');

			// Setup intersection observer for adaptive preloading
			const observer = imagePreloader.setupIntersectionObserver((cardIndex) => {
				const index = parseInt(cardIndex);
				if (index >= 0) {
					imagePreloader.preloadImagesForRange($quizStore.cards, index + 1, 'forward');
				}
			});

			// Observe all card elements
			setTimeout(() => {
				document.querySelectorAll('[data-card-index]').forEach((el) => {
					observer.observe(el);
				});
			}, 100);
		}
	});

	export function onQuizStart() {
		quizStore.setIsPractice(practiceMode);
		// Trigger initial preloading when quiz starts
		if ($quizStore.cards.length > 0) {
			imagePreloader.preloadImagesForRange($quizStore.cards, 0, 'forward');
		}
	}

	onDestroy(() => {
		// Clean up timeouts to prevent memory leaks
		if (statsUpdateTimeout) {
			clearTimeout(statsUpdateTimeout);
			statsUpdateTimeout = null;
		}
		if (answerProcessingTimeout) {
			clearTimeout(answerProcessingTimeout);
			answerProcessingTimeout = null;
		}
		// Reset processing flags
		isProcessingAnswer = false;
		isCompletingQuiz = false;

		// Clean up image preloader
		imagePreloader.destroy();
	});

	export function getStats() {
		return $stats;
	}

	$: if (collectionId && !$quizStore.hasInitialized && !$quizStore.isLoading && !isPartyMode) {
		quizStore.loadCollection(collectionId);
	}
</script>

<div class="container white pt-3">
	{#if $quizStore.isLoading || (!$quizStore.hasInitialized && collectionId)}
		<Loading />
	{:else if $quizStore.loadingError}
		<ErrorDisplay error={$quizStore.loadingError} onRetry={retryFetch} />
	{:else if $quizStore.cards.length > 0}
		{#if !isPartyMode}
			<Toolbar
				cards={$quizStore.cards}
				isGrid={$quizStore.isGrid}
				isFullscreen={$quizStore.isFullscreen}
				shuffleTrigger={$quizStore.shuffleTrigger}
				showEditButton={canEditCollection}
				on:update={handleToolbarUpdate}
				on:edit={() => dispatch('editCollection')}
			/>
		{/if}

		{#if !isPartyMode && practiceMode}
			<select class="my-3" name="mode" id="mode" on:change={(e) => setMode(e.target.value)}>
				{#each [['FILL_IN_THE_BLANK', 'Fill in the Blank'], ['TRUE_FALSE', '50/50'], ['MULTIPLE_CHOICE', 'Multiple Choice'], ['FLASH_CARDS', 'Flashcard']] as [mode, label]}
					<option value={mode} selected={mode === $quizStore.currentMode}>
						{label}
					</option>
				{/each}
			</select>
		{/if}

		<div class={'flashcards ' + ($quizStore.isGrid ? 'grid' : 'vertical')}>
			{#if $quizStore.hasInitialized}
				{#each $quizStore.cards as item, i (item.id || i)}
					<div data-card-index={i}>
						<Card
							{item}
							{i}
							cards={$quizStore.cards}
							currentMode={$quizStore.currentMode}
							shuffleTrigger={$quizStore.shuffleTrigger}
							{onCardLoad}
							{toggleReveal}
							{isPartyMode}
							isPractice={practiceMode}
							updateCards={() => {}}
							on:correctAnswer={onCorrectAnswer}
							on:giveUp={(e) => {
								console.log('Give up on card', i);
								setRevealed(e.detail.index, true);
							}}
						/>
					</div>
				{/each}
			{/if}
		</div>

		<QuizActions
			currentMode={$quizStore.currentMode}
			isComplete={$quizStore.isComplete}
			on:giveup={() => {
				quizStore.completeQuiz($user?.id, $user?.token);
				dispatch('giveup');
			}}
			onCompleteQuiz={() => quizStore.completeQuiz($user?.id, $user?.token)}
			{isPartyMode}
		/>
	{/if}

	<div class="youtube-wrapper" id="player" style="width:1px; height:1px; overflow:hidden;"></div>
	{#if $quizStore.isPractice}
		<Modal
			bind:show={$quizStore.showModal}
			title="Practice Concluded"
			message="Practice makes perfect!"
			onClose={() => {
				quiz.revealCards();
				quiz.closeModal();
			}}
			buttons={[
				{
					text: 'Retry',
					action: () => {
						quiz.retry();
					},
					class: 'bg-yellow-400 text-black'
				},
				{
					text: 'See Answers',
					action: () => {
						quiz.revealCards();
						quiz.closeModal();
					},
					class: 'bg-yellow-400 text-black'
				}
			]}
		/>
	{:else}
		<Modal
			bind:show={$quizStore.showModal}
			title="Quiz Completed"
			message={getRandomPhraseForScore($stats.percentage)}
			grade={toLetterGrade($stats.percentage)}
			effect={$stats.isComplete ? 'confetti' : 'none'}
			onClose={() => {
				quiz.revealCards();
				quiz.closeModal();
			}}
			buttons={[
				{
					text: 'Retry',
					action: () => {
						quiz.retry();
					},
					class: 'bg-yellow-400 text-black'
				},
				{
					text: 'Leaderboards',
					action: () => {
						window.location.href = '/leaderboard';
					},
					class: 'bg-blue-500 text-white'
				}
			]}
		/>
	{/if}
</div>
