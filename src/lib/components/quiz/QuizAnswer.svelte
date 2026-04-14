<script>
	import { quiz } from '$store/quiz';
	import { createEventDispatcher } from 'svelte';
	import { AnswerType } from '$lib/types/enums';

	export let card;
	let selectedChoice = null;
	let isCorrectChoice = null;
	let lastId = null;

	const dispatch = createEventDispatcher();

	$: item = card;
	$: currentMode = $quiz.currentMode;

	$: if (item?.id && item.id !== lastId) {
		lastId = item.id;

		isLockedIn = item.revealed ?? false;
		selectedChoice = item.userAnswer ?? null;
		isCorrectChoice = item.isCorrect ?? null;
		optionsCache = null;
	}

	let isLockedIn = false;
	let optionsCache = null;

	function updateCard(patch) {
		quiz.updateCardById(item.id, patch);
	}

	function normalize(v) {
		return String(v ?? '')
			.trim()
			.toLowerCase();
	}

	function getCorrectAnswer() {
		return Array.isArray(item.answer) ? item.answer[0] : item.answer;
	}

	function getMultipleChoiceOptions(count = 2) {
		if (optionsCache) return optionsCache;
		if (!item) return [];

		const correct = getCorrectAnswer();

		const wrongPool = $quiz.cards
			.filter((c) => c.id !== item.id)
			.map((c) => (Array.isArray(c.answer) ? c.answer[0] : c.answer))
			.filter(Boolean)
			.filter((a) => normalize(a) !== normalize(correct));

		const shuffledWrong = wrongPool.sort(() => Math.random() - 0.5);
		const selectedWrong = shuffledWrong.slice(0, count - 1);

		optionsCache = [correct, ...selectedWrong].filter(Boolean).sort(() => Math.random() - 0.5);

		return optionsCache;
	}

	function handleMultipleChoiceClick(choice) {
		if (isLockedIn) return;

		const correct = getCorrectAnswer();
		const isCorrect = normalize(choice) === normalize(correct);

		isLockedIn = true;
		selectedChoice = choice;
		isCorrectChoice = isCorrect;

		updateCard({
			revealed: true,
			userAnswer: choice,
			isCorrect
		});

		dispatch('correctAnswer', {
			id: item.id,
			userAnswer: choice,
			isCorrect,
			revealed: true
		});
	}

	function getChoiceClass(choice) {
		if (!isLockedIn && selectedChoice === null) {
			return 'choice-option';
		}

		const correct = getCorrectAnswer();

		if (choice === correct) return 'choice-option correct';
		if (choice === selectedChoice && !isCorrectChoice) return 'choice-option incorrect';

		return 'choice-option';
	}
</script>

<div class="answerbox mt-2">
	{#if currentMode === 'TRUE_FALSE'}
		<div class="choice-grid">
			{#each getMultipleChoiceOptions(2) as choice}
				<button
					type="button"
					class={getChoiceClass(choice)}
					on:click={() => handleMultipleChoiceClick(choice)}
					disabled={isLockedIn}
				>
					{choice}
				</button>
			{/each}
		</div>
	{:else if currentMode === 'MULTIPLE_CHOICE'}
		<div class="choice-grid">
			{#each getMultipleChoiceOptions(4) as choice}
				<button
					type="button"
					class={getChoiceClass(choice)}
					on:click={() => handleMultipleChoiceClick(choice)}
					disabled={isLockedIn}
				>
					{choice}
				</button>
			{/each}
		</div>
	{:else if item.answerType === AnswerType.MULTIPLE_CHOICE}
		<!-- MULTIPLE CHOICE -->
		<div class="multiple-choice-inputs">
			{#each item.answers || [] as choice}
				<button
					type="button"
					class="choice-option"
					on:click={() => {
						if (isLockedIn) return;

						isLockedIn = true;

						const correct = getCorrectAnswer();
						const isCorrect = choice === correct;

						updateCard({
							revealed: true,
							userAnswer: choice,
							isCorrect
						});

						dispatch('correctAnswer', {
							index: i,
							userAnswer: choice,
							isCorrect,
							revealed: true
						});
					}}
					disabled={isLockedIn}
				>
					{choice}
				</button>
			{/each}
		</div>
	{:else}
		<!-- FILL IN THE BLANK -->
		<input
			type="text"
			class="form-control answer-box"
			value={item.userAnswer}
			on:input={(e) => {
				if (isLockedIn) return;

				updateCard({ userAnswer: e.target.value });
			}}
		/>

		{#if item.revealed}
			<span class={item.isCorrect ? 'answer correct' : 'answer incorrect'}>
				{item.answer}
			</span>

			{#if item.extra}
				<span>{item.extra}</span>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.choice-option.correct {
		background: #d4edda;
		border: 1px solid #28a745;
		color: #155724;
	}

	.choice-option.incorrect {
		background: #f8d7da;
		border: 1px solid #dc3545;
		color: #721c24;
	}

	.choice-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.25rem;
		width: 100%;
	}

	.choice-option {
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		cursor: pointer;
		width: 100%;
		text-align: center;
		transition: all 0.15s ease;
	}
</style>
