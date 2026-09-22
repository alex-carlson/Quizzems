<script>
	import { onDestroy, createEventDispatcher } from 'svelte';
	import { quiz } from '$store/quiz';

	import LazyLoadImage from './LazyLoadImage.svelte';
	import YoutubeAudioPlayer from '$lib/YoutubeAudioPlayer.svelte';

	export let i = 0;
	export let isActive = false;

	export function playAudio() {
		playerRef?.play();
	}

	let playerRef;
	const dispatch = createEventDispatcher();

	$: item = $quiz.cards?.[i];
	$: currentMode = $quiz.currentMode;
	$: cardStateClass = item?.revealed
		? item.isCorrect === true
			? 'correct'
			: item.isCorrect === false
				? 'incorrect'
				: ''
		: isActive
			? 'active'
			: '';

	let validationTimeout;
	let prevRevealed = false;

	$: {
		const wasJustAnswered = !prevRevealed && item?.revealed;

		if (wasJustAnswered) {
			const card = $quiz.cards[i];
			if ($quiz.currentMode === 'FILL_IN_THE_BLANK' && card?.revealed && card?.isCorrect) {
				const nextIndex = $quiz.cards.findIndex((c, idx) => idx > i && !c.revealed);
				if (nextIndex !== -1) {
					setTimeout(() => {
						scrollToIndex(nextIndex);
					}, 100);
				}
			}

			dispatch('correctAnswer', { ...item, index: i });
		}

		prevRevealed = !!item?.revealed;
	}

	function scrollToIndex(index) {
		const el = document.querySelector(`[data-card-index="${index}"]`);
		if (!el) return;

		const topInset = 80;
		const bottomInset = 16;
		const viewportHeight = window.innerHeight;
		const availableHeight = viewportHeight - topInset - bottomInset;
		const cardHeight = el.getBoundingClientRect().height;
		const centeredTop = topInset + Math.max(0, (availableHeight - cardHeight) / 2);
		const maxTop = viewportHeight - bottomInset - cardHeight;
		const visibleTop = Math.max(topInset, Math.min(centeredTop, maxTop));
		const y = el.getBoundingClientRect().top + window.pageYOffset - visibleTop;
		window.scrollTo({ top: y, behavior: 'instant' });

		setTimeout(() => {
			const input = el.querySelector('input, textarea');
			if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
				input.focus();
				input.select();
			}
		}, 250);
	}

	onDestroy(() => {
		clearTimeout(validationTimeout);
	});
</script>

{#if item && !item.hidden}
	<div
		class="card {item.revealed ? 'revealed' : ''} {item.answerType} {cardStateClass}"
		data-card-index={i}
		role="button"
		tabindex="0"
		on:click
		on:focus
		on:keydown={(e) => currentMode === 'FLASH_CARDS' && e.key === 'Enter'}
	>
		{#if $quiz.showCategory}
			<h3>{item.collection_name}</h3>
		{/if}

		{#if item.type === 'audio' || item.audio}
			<YoutubeAudioPlayer id={item.id} videoId={item.audio} bind:this={playerRef} />
		{/if}

		{#if item.url && item.type !== 'audio' && item.url != item.audio}
			<LazyLoadImage imageUrl={item.url} />
		{/if}

		{#if item.supplemental}
			<span>{item.supplemental}</span>
		{/if}

		{#if item.question && item.url === null}
			<h2 class="p-3">{item.question}</h2>
		{/if}

		{#if item.revealed}
			<div class="revealed-answer">
				{#if item.audio}
					<img
						src={`https://img.youtube.com/vi/${item.audio}/default.jpg`}
						alt="Answer image"
						class="img-fluid mb-2"
					/>
					<span>{item.yt_title}</span>
				{/if}
				<span class={item.isCorrect ? 'answer correct' : 'answer incorrect'}>
					{#if Array.isArray(item.answer)}
						{item.answer.join(', ')}
					{:else}
						{item.answer}
					{/if}
				</span>
				{#if item.extra}
					<span>{item.extra}</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.card {
		position: relative;
		border: 2px solid transparent;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			background 0.15s ease;
	}

	.card.active {
		border-color: #facc15;
		box-shadow:
			0 0 0 3px rgba(250, 204, 21, 0.22),
			0 8px 18px rgba(250, 204, 21, 0.14);
		background: linear-gradient(180deg, rgba(254, 249, 195, 0.95), rgba(255, 255, 255, 1));
	}

	.card.correct {
		border-color: #22c55e;
		background: linear-gradient(90deg, #09db53f2, #08a33ef2);
	}

	.card.incorrect {
		border-color: #ef4444;
		background: linear-gradient(90deg, #d60e0ef2, #970808);
	}

	.revealed-answer {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
	}

	.answer {
		display: inline-block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		font-weight: 600;
		color: white;
		/* background: transparent; */
		margin-top: 0;
	}

	/* .answer.correct {
		border: 2px solid #22c55e;
		background: #d4edda;
		color: #155724;
	}

	.answer.incorrect {
		border: 2px solid #ef4444;
		background: #f8d7da;
		color: #721c24;
	} */
</style>
