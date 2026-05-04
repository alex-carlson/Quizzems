<script>
	import { onDestroy, createEventDispatcher } from 'svelte';
	import { quiz } from '$store/quiz';
	import QuizAnswer from '$lib/components/quiz/QuizAnswer.svelte';

	import LazyLoadImage from './LazyLoadImage.svelte';
	import YoutubeAudioPlayer from '$lib/YoutubeAudioPlayer.svelte';

	export let i = 0;

	export function playAudio() {
		playerRef?.play();
	}

	let playerRef;
	const dispatch = createEventDispatcher();

	// ---------- STATE ----------
	$: item = $quiz.cards?.[i];
	$: currentMode = $quiz.currentMode;

	// ---------- LOCAL ----------
	let validationTimeout;
	let prevRevealed = false;

	$: {
		const wasJustAnswered = !prevRevealed && item.revealed;

		if (wasJustAnswered) {
			if ($quiz.currentMode === 'FILL_IN_THE_BLANK') {
				const nextIndex = $quiz.cards.findIndex((c, idx) => idx > i && !c.revealed);
				if (nextIndex !== -1) {
					setTimeout(() => {
						scrollToIndex(nextIndex);
					}, 100);
				}
			}

			const event = {
				...item,
				index: i
			};

			dispatch('correctAnswer', event);
		}

		prevRevealed = item.revealed;
	}

	function scrollToIndex(index) {
		const el = document.querySelector(`[data-card-index="${index}"]`);
		const y = el.getBoundingClientRect().top + window.pageYOffset - 80;

		window.scrollTo({
			top: y,
			behavior: 'instant'
		});

		setTimeout(() => {
			const input = el.querySelector('input, textarea');
			input?.focus();
			input?.select?.();
		}, 250);
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
		on:keydown={(e) => currentMode === 'FLASH_CARDS' && e.key === 'Enter'}
	>
		{#if $quiz.showCategory}
			<h3>{item.collection_name}</h3>
		{/if}

		{#if item.type === 'audio'}
			<YoutubeAudioPlayer id={item.id} videoId={item.audio} bind:this={playerRef} />
		{/if}

		{#if item.url}
			<LazyLoadImage imageUrl={item.url} />
		{/if}

		{#if item.supplemental}
			<span>{item.supplemental}</span>
		{/if}

		{#if item.question && item.url === null}
			<h2 class="p-3">{item.question}</h2>
		{/if}

		{#if item && item.id}
			<QuizAnswer card={item} />
		{/if}
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
