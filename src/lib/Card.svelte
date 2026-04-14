<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { quiz } from '$store/quiz';

	import { areStringsClose } from '$lib/api/utils';
	import { AnswerType } from '$lib/types/enums';
	import QuizAnswer from '$lib/components/quiz/QuizAnswer.svelte';

	import LazyLoadImage from './LazyLoadImage.svelte';
	import YoutubeAudioPlayer from '$lib/YoutubeAudioPlayer.svelte';

	export let i = 0;

	const dispatch = createEventDispatcher();

	// ---------- STATE ----------
	$: item = $quiz.cards?.[i];
	$: currentMode = $quiz.currentMode;

	// ---------- LOCAL ----------
	let userAnswers = [];
	let isLockedIn = false;
	let multipleChoiceSelected = false;
	let validationTimeout;
	let cachedValidationResult = null;
	let lastValidationInput = '';
	let container;

	// ---------- STORE HELPERS ----------
	function updateCard(patch) {
		quiz.updateCard(i, patch);
	}

	export function scrollTo() {
		container?.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});

		setTimeout(() => {
			container?.querySelector('input')?.focus?.();
		}, 200);
	}

	function handleInput(idx, e) {
		if (isLockedIn) return;

		const value = e.target.value;

		if (item?.answerType === AnswerType.MULTIPLE_CHOICE) {
			multipleChoiceSelected = true;
			isLockedIn = true;

			const correct = isCorrect(value);

			updateCard({
				revealed: true,
				userAnswer: value,
				isCorrect: correct
			});

			dispatch('correctAnswer', {
				index: i,
				userAnswer: value,
				isCorrect: correct,
				revealed: true
			});

			return;
		}

		userAnswers[idx] = value;
		validateAnswer();
	}

	// ---------- ANSWER LOGIC ----------
	function normalize(v) {
		return String(v || '')
			.toLowerCase()
			.trim();
	}

	function isCorrect(valueOverride = null) {
		if (!item) return false;

		const input = normalize(valueOverride ?? userAnswers[0]);

		if (item.answerType === AnswerType.MULTIPLE_CHOICE) {
			return areStringsClose(input, normalize(item.answers?.[item.correctAnswerIndex || 0]));
		}

		if (Array.isArray(item.answer)) {
			return item.answer.some((a) => areStringsClose(input, normalize(a)));
		}

		return areStringsClose(input, normalize(item.answer));
	}

	function validateAnswer() {
		if (!item) return;

		const key = userAnswers.join('|');

		if (key === lastValidationInput && cachedValidationResult !== null) {
			return cachedValidationResult;
		}

		lastValidationInput = key;

		const result = isCorrect();
		cachedValidationResult = result;

		if (result && !isLockedIn) {
			isLockedIn = true;

			updateCard({
				revealed: true,
				isCorrect: true,
				userAnswer: userAnswers
			});

			dispatch('correctAnswer', {
				index: i,
				userAnswer: userAnswers,
				isCorrect: true,
				revealed: true
			});
		}

		return result;
	}

	// ---------- UI ----------
	function getChoiceClass(choice, idx) {
		const base = 'choice-option';

		if (!multipleChoiceSelected) {
			return userAnswers[0] === choice ? `${base} selected` : base;
		}

		const correctIdx = item?.correctAnswerIndex ?? 0;

		if (idx === correctIdx) return `${base} correct`;
		if (userAnswers[0] === choice) return `${base} incorrect`;

		return base;
	}

	function getRevealedClass() {
		if (!item?.revealed) return 'answer';
		return `answer ${item?.isCorrect ? 'correct' : 'incorrect'}`;
	}

	onDestroy(() => {
		clearTimeout(validationTimeout);
	});
</script>

{#if item && !item.hidden}
	<div
		class="card {item.revealed ? 'revealed' : ''} {item.incorrect
			? 'incorrect'
			: ''} {item.answerType}"
		data-card-index={i}
		role="button"
		tabindex="-1"
		bind:this={container}
		on:keydown={(e) => currentMode === 'FLASH_CARDS' && e.key === 'Enter'}
	>
		{#if item.type === 'audio'}
			<YoutubeAudioPlayer id={item.id} videoId={item.audio} />
		{/if}

		{#if item.type === 'image' && item.url}
			<LazyLoadImage imageUrl={item.url} />
		{/if}

		{#if item.supplemental}
			<span>{item.supplemental}</span>
		{/if}

		{#if item.question}
			<h2 class="p-3">{item.question}</h2>
		{/if}

		{#if item && item.id}
			<QuizAnswer card={item} on:correctAnswer={validateAnswer} />
		{/if}
		<details>
			<pre>{JSON.stringify(item, null, 2)}</pre>
		</details>
	</div>
{/if}

<style>
	.answer.correct {
		border: 2px solid #28a745;
		background: #d4edda;
		color: #155724;
	}

	.answer.incorrect {
		border: 2px solid #dc3545;
		background: #f8d7da;
		color: #721c24;
	}

	.choice-option {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 0.375rem;
		width: 100%;
		cursor: pointer;
	}

	.choice-option.selected {
		background: #e3f2fd;
	}

	.choice-option.correct {
		background: #d4edda;
	}

	.choice-option.incorrect {
		background: #f8d7da;
	}
</style>
