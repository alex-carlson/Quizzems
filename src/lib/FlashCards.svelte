<script>
	import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
	import { getRandomPhraseForScore, toLetterGrade } from './api/quizScore';
	import { imagePreloader } from './imagePreloader.js';

	import Modal from './Modal.svelte';
	import Card from './Card.svelte';
	import Toolbar from './components/quiz/Toolbar.svelte';
	import QuizActions from './components/quiz/QuizActions.svelte';
	import { quiz } from '$store/quiz.js';

	const dispatch = createEventDispatcher();

	$: cards = $quiz.cards || [];
	$: practiceMode = $quiz.isPractice;
	$: isGrid = $quiz.isGrid;
	$: currentMode = $quiz.currentMode;

	let isProcessingAnswer = false;
	let answerProcessingTimeout;
	let cardRefs = [];

	let showModal = false;

	function setRevealed(index, value, playerId = null) {
		const updated = [...$quiz.cards];
		updated[index].revealed = value;
		if (playerId) updated[index].answerer = playerId;
		quiz.setCards(updated);
	}

	function onCorrectAnswer(event) {
		// if (isProcessingAnswer) return;
		// isProcessingAnswer = true;

		const { index, answer, userAnswer, isCorrect } = event.detail;

		const updated = [...$quiz.cards];
		// updated[index] = {
		// 	...updated[index],
		// 	revealed: true,
		// 	userAnswer: userAnswer || answer,
		// 	isCorrect
		// };

		// quiz.setCards(updated);

		// console.log('On correct answer event triggered');

		const nextIndex = updated.findIndex((c, i) => i > index && !c.revealed);

		// if (answerProcessingTimeout) clearTimeout(answerProcessingTimeout);
		// answerProcessingTimeout = setTimeout(() => (isProcessingAnswer = false), 150);

		if (nextIndex !== -1 && cardRefs[nextIndex]) {
			cardRefs[index]?.stop?.();
			cardRefs[nextIndex]?.playAudio?.();
		}

		// setTimeout(() => dispatch('correctAnswer', event.detail), 0);
	}

	function getStats(cards) {
		const total = cards.length;
		const answered = cards.filter((c) => c.revealed).length;
		const correct = cards.filter((c) => c.isCorrect).length;
		const percentage = total ? Math.round((correct / total) * 100) : 0;
		const isComplete = total > 0 && answered === total;

		return { total, answered, correct, percentage, isComplete };
	}

	$: stats = getStats(cards);
	$: if (stats.isComplete && !showModal) {
		dispatch('finish');
	}

	onMount(() => {
		if (cards.length > 0) {
			imagePreloader.preloadImagesForRange(cards, 0, 'forward');
		}
	});

	onDestroy(() => {
		if (answerProcessingTimeout) clearTimeout(answerProcessingTimeout);
		isProcessingAnswer = false;
	});
</script>

<div class="container white pt-3">
	{#if cards.length === 0}
		<p>No cards available.</p>
	{:else}
		<Toolbar on:edit={() => dispatch('editCollection')} />

		{#if practiceMode}
			<select
				class="my-3"
				value={$quiz.currentMode}
				on:change={(e) => quiz.setMode(e.currentTarget.value)}
			>
				{#each [['FILL_IN_THE_BLANK', 'Fill in the Blank'], ['TRUE_FALSE', '50/50'], ['MULTIPLE_CHOICE', 'Multiple Choice'], ['FLASH_CARDS', 'Flashcard']] as [mode, label]}
					<option value={mode} selected={mode === currentMode}>
						{label}
					</option>
				{/each}
			</select>
		{/if}

		<div class={'flashcards ' + (isGrid ? 'grid' : 'vertical')}>
			{#each cards as card, i (card.id || i)}
				<Card
					bind:this={cardRefs[i]}
					{card}
					{i}
					on:correctAnswer={onCorrectAnswer}
					on:giveUp={(e) => setRevealed(e.detail.index, true)}
				/>
			{/each}
		</div>

		<QuizActions
			{currentMode}
			isComplete={stats.isComplete}
			on:giveup={() => dispatch('giveup')}
			onCompleteQuiz={() => dispatch('finish')}
		/>
	{/if}

	<Modal
		bind:show={showModal}
		title={practiceMode ? 'Practice Concluded' : 'Quiz Completed'}
		message={practiceMode ? 'Practice makes perfect!' : getRandomPhraseForScore(stats.percentage)}
		grade={!practiceMode ? toLetterGrade(stats.percentage) : undefined}
		effect={!practiceMode && stats.isComplete ? 'confetti' : 'none'}
		onClose={() => {
			quiz.setCards(cards.map((c) => ({ ...c, revealed: true })));
			showModal = false;
		}}
	/>
</div>
