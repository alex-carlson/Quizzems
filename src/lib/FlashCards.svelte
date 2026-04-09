<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { user } from '../stores/user';
	import { youtubePlayerService } from './api/youtubePlayer.js';
	import { getRandomPhraseForScore, toLetterGrade } from './api/quizScore';
	import { imagePreloader } from './imagePreloader.js';

	// Components
	import Modal from './Modal.svelte';
	import Card from './Card.svelte';
	import Toolbar from './components/quiz/Toolbar.svelte';
	import QuizActions from './components/quiz/QuizActions.svelte';
	import AnswerInput from './components/AnswerInput.svelte';

	// Props
	export let cards = [];
	export let practiceMode = false;
	export let isPartyMode = false;
	export let canEditCollection = false;

	const dispatch = createEventDispatcher();

	// Local reactive variables
	let isCompletingQuiz = false;
	let isProcessingAnswer = false;
	let answerProcessingTimeout;
	let stats = {
		total: cards.length,
		answered: 0,
		correct: 0,
		percentage: 0,
		isComplete: false
	};
	let showModal = false;
	let isGrid = false;
	let isFullscreen = false;
	let currentMode = 'FILL_IN_THE_BLANK';

	// --- Helpers ---
	function handleToolbarUpdate(event) {
		const updates = event.detail;
		if (updates.cards) {
			cards = updates.cards;
		}
		if (updates.hasOwnProperty('isGrid')) {
			isGrid = updates.isGrid;
		}
		if (updates.hasOwnProperty('isFullscreen')) {
			isFullscreen = updates.isFullscreen;
		}
		if (updates.hasOwnProperty('currentMode')) {
			currentMode = updates.currentMode;
		}
	}

	function onCardLoad(index) {
		cards[index].loaded = true;
	}

	function setRevealed(index, value, playerId = null) {
		cards[index].revealed = value;
		if (playerId) cards[index].answerer = playerId;
	}

	function shuffleCards() {
		for (let i = cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j], cards[i]];
		}
		dispatch('shuffle', { cards });
	}

	function toggleReveal(index) {
		const card = cards[index];
		const wasRevealed = card.revealed;
		card.revealed = !card.revealed;
		if (!wasRevealed) {
			const nextIndex = cards.findIndex((c, i) => i > index && !c.revealed);
			if (nextIndex !== -1 && cards[nextIndex].audio) {
				youtubePlayerService.loadVideoOnly(cards[nextIndex].audio);
			}
		}
	}

	function setMode(mode) {
		currentMode = mode;
	}

	function onCorrectAnswer(event) {
		if (isProcessingAnswer) return;
		isProcessingAnswer = true;

		const { index, answer, userAnswer, isCorrect } = event.detail;
		requestAnimationFrame(() => {
			cards[index].revealed = true;
			cards[index].userAnswer = userAnswer || answer;
			cards[index].isCorrect = isCorrect;
		});

		setTimeout(() => {
			const nextIndex = cards.findIndex((c, i) => i > index && !c.revealed);
			if (nextIndex !== -1 && cards[nextIndex].audio) {
				youtubePlayerService.loadVideoOnly(cards[nextIndex].audio);
			}
		}, 100);

		if (answerProcessingTimeout) clearTimeout(answerProcessingTimeout);
		answerProcessingTimeout = setTimeout(() => (isProcessingAnswer = false), 150);

		setTimeout(() => dispatch('correctAnswer', event.detail), 0);
	}

	function getStats() {
		// Calculate stats from cards
		const total = cards.length;
		const answered = cards.filter((c) => c.revealed).length;
		const correct = cards.filter((c) => c.isCorrect).length;
		const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
		const isComplete = answered === total && total > 0;
		return { total, answered, correct, percentage, isComplete };
	}

	// --- Auto complete ---
	$: {
		const s = getStats();
		if (s.isComplete && !showModal && !isCompletingQuiz) {
			isCompletingQuiz = true;
			const completionTimeout = setTimeout(() => {
				isCompletingQuiz = false;
				dispatch('finish');
			}, 10000);
			clearTimeout(completionTimeout);
			dispatch('finish');
			isCompletingQuiz = false;
		}
	}

	// --- Stats update throttle ---
	$: stats = getStats();

	onMount(() => {
		// Preload images
		if (cards.length > 0) {
			imagePreloader.preloadImagesForRange(cards, 0, 'forward');
		}
	});

	onDestroy(() => {
		if (answerProcessingTimeout) clearTimeout(answerProcessingTimeout);
		isProcessingAnswer = false;
		isCompletingQuiz = false;
	});
</script>

<div class="container white pt-3">
	{#if cards.length === 0}
		<p>No cards available.</p>
	{:else}
		{#if !isPartyMode}
			<Toolbar
				{cards}
				{isGrid}
				{isFullscreen}
				showEditButton={canEditCollection}
				on:update={handleToolbarUpdate}
				on:edit={() => dispatch('editCollection')}
				on:shuffle={shuffleCards}
			/>
		{/if}

		{#if !isPartyMode && practiceMode}
			<select class="my-3" on:change={(e) => setMode(e.target.value)}>
				{#each [['FILL_IN_THE_BLANK', 'Fill in the Blank'], ['TRUE_FALSE', '50/50'], ['MULTIPLE_CHOICE', 'Multiple Choice'], ['FLASH_CARDS', 'Flashcard']] as [mode, label]}
					<option value={mode} selected={mode === currentMode}>{label}</option>
				{/each}
			</select>
		{/if}

		<div class={'flashcards ' + (isGrid ? 'grid' : 'vertical')}>
			{#each cards as card, i (card.id || i)}
				<div data-card-index={i}>
					<Card
						{card}
						{i}
						{cards}
						{currentMode}
						{onCardLoad}
						{toggleReveal}
						{isPartyMode}
						isPractice={practiceMode}
						on:correctAnswer={onCorrectAnswer}
						on:giveUp={(e) => setRevealed(e.detail.index, true)}
					/>
				</div>
			{/each}
		</div>

		<QuizActions
			{currentMode}
			isComplete={stats.isComplete}
			on:giveup={() => dispatch('giveup')}
			onCompleteQuiz={() => dispatch('finish')}
			{isPartyMode}
		/>
	{/if}

	<div class="youtube-wrapper" id="player" style="width:1px;height:1px;overflow:hidden;"></div>

	<Modal
		bind:show={showModal}
		title={practiceMode ? 'Practice Concluded' : 'Quiz Completed'}
		message={practiceMode ? 'Practice makes perfect!' : getRandomPhraseForScore(stats.percentage)}
		grade={!practiceMode ? toLetterGrade(stats.percentage) : undefined}
		effect={!practiceMode && stats.isComplete ? 'confetti' : 'none'}
		onClose={() => {
			cards.forEach((c) => (c.revealed = true));
			showModal = false;
		}}
		buttons={practiceMode
			? [
					{ text: 'Retry', action: () => dispatch('retry'), class: 'bg-yellow-400 text-black' },
					{
						text: 'See Answers',
						action: () => {
							cards.forEach((c) => (c.revealed = true));
							showModal = false;
						},
						class: 'bg-yellow-400 text-black'
					}
				]
			: [
					{ text: 'Retry', action: () => dispatch('retry'), class: 'bg-yellow-400 text-black' },
					{
						text: 'Leaderboards',
						action: () => {
							window.location.href = '/leaderboard';
						},
						class: 'bg-blue-500 text-white'
					}
				]}
	/>
</div>
