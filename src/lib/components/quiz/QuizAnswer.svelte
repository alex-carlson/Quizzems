<script>
	import { quiz } from '$store/quiz';
	import { AnswerType } from '$lib/types/enums';
	import { areStringsClose } from '$lib/api/utils';
	import Fa from 'svelte-fa';
	import { faFlag, faLightbulb } from '@fortawesome/free-solid-svg-icons';

	export let card;
	let selectedChoice = null;
	let isCorrectChoice = null;
	let lastId = null;
	let draftAnswer = '';
	let draftAnswers = [];
	let lockedAnswers = [];
	let usedCorrect = new Set();
	let optionsCacheMap = new Map();

	$: item = card;
	$: currentMode = $quiz.currentMode;

	$: if (item?.id && item.id !== lastId) {
		lastId = item.id;

		isLockedIn = false;
		selectedChoice = null;
		isCorrectChoice = null;

		draftAnswer = '';
		draftAnswers = item.num_required ? Array(item.num_required).fill('') : [];

		lockedAnswers = [];
		usedCorrect = new Set();

		optionsCacheMap.delete(item.id);
	}

	let isLockedIn = false;

	function updateCard(patch) {
		quiz.updateCardById(item.id, patch);
	}

	function normalize(v) {
		return String(v ?? '')
			.trim()
			.toLowerCase();
	}

	function checkFillAnswer(values) {
		if (isLockedIn) return;

		const correctArr = getCorrectAnswer()
			.filter(Boolean)
			.map((v) => v.toString().trim().toLowerCase());

		values.forEach((val, i) => {
			if (lockedAnswers[i]) return;

			const normalized = (val ?? '').toString().trim().toLowerCase();

			const matchIndex = correctArr.findIndex(
				(c, ci) => !usedCorrect.has(ci) && areStringsClose(normalized, c, 0.95)
			);

			if (matchIndex !== -1) {
				lockedAnswers[i] = true;
				usedCorrect.add(matchIndex);
			}
		});

		if (usedCorrect.size === correctArr.length) {
			isLockedIn = true;

			updateCard({
				revealed: true,
				userAnswer: values,
				isCorrect: true
			});
		}
	}

	function getCorrectAnswer() {
		return normalizeAnswer(item.answer);
	}

	function getMultipleChoiceOptions(count = 2) {
		if (!item) return [];
		if (optionsCacheMap.has(item.id)) {
			return optionsCacheMap.get(item.id);
		}

		const correct = getCorrectAnswer();
		const wrongPool = $quiz.cards
			.filter((c) => c.id !== item.id)
			.map((c) => (Array.isArray(c.answer) ? c.answer[0] : c.answer))
			.filter(Boolean)
			.filter((a) => normalize(a) !== normalize(correct));

		const shuffledWrong = wrongPool.sort(() => Math.random() - 0.5);
		const selectedWrong = shuffledWrong.slice(0, count - 1);

		const options = [correct, ...selectedWrong].filter(Boolean).sort(() => Math.random() - 0.5);
		optionsCacheMap.set(item.id, options);
		return options;
	}

	function handleMultipleChoiceClick(choice) {
		if (isLockedIn) return;

		const correct = getCorrectAnswer();

		const isCorrect = correct.some((c) => normalize(choice) === normalize(c));

		isLockedIn = true;
		selectedChoice = choice;
		isCorrectChoice = isCorrect;

		updateCard({
			revealed: true,
			userAnswer: choice,
			isCorrect
		});
	}

	function handleHint() {
		const correct = getCorrectAnswer();
		if (!correct) return;
		let current = draftAnswer || '';
		let nextCharIndex = 0;
		// Find the next character that is not already revealed
		for (let i = 0; i < correct.length; i++) {
			if (current[i] !== correct[i]) {
				nextCharIndex = i;
				break;
			}
		}
		// Reveal the next character
		draftAnswer = correct.slice(0, nextCharIndex + 1);
	}

	function getChoiceClass(choice) {
		if (!isLockedIn && selectedChoice === null) {
			return 'choice-option';
		}

		const correct = getCorrectAnswer();

		const isCorrect = correct.some((c) => normalize(choice) === normalize(c));

		if (isLockedIn && isCorrect) return 'choice-option correct';
		if (choice === selectedChoice && !isCorrectChoice) return 'choice-option incorrect';

		return 'choice-option';
	}

	function normalizeAnswer(answer) {
		if (!answer) return [];
		return Array.isArray(answer) ? answer : [answer];
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

						const isCorrect = correct.some((c) => normalize(choice) === normalize(c));

						updateCard({
							revealed: true,
							userAnswer: choice,
							isCorrect
						});
					}}
					disabled={isLockedIn}
				>
					{choice}
				</button>
			{/each}
		</div>
	{:else if !item.revealed}
		<div class="input-row">
			<button class="flag-btn" on:click={() => updateCard({ revealed: true })}>
				<Fa icon={faFlag} />
			</button>
			<div class="w-100">
				{#if item.num_required}
					{#each Array(item.num_required) as _, index}
						<input
							type="text"
							class="form-control answer-box"
							bind:value={draftAnswers[index]}
							disabled={lockedAnswers[index]}
							on:input={(e) => {
								if (isLockedIn || lockedAnswers[index]) return;

								draftAnswers[index] = e.target.value;
								checkFillAnswer(draftAnswers);
							}}
						/>
					{/each}
				{:else}
					<input
						type="text"
						class="form-control answer-box"
						bind:value={draftAnswer}
						on:input={(e) => {
							if (isLockedIn) return;

							draftAnswer = e.target.value;
							checkFillAnswer(draftAnswer);
						}}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								e.target.blur();
							}
						}}
					/>
				{/if}
			</div>
			{#if $quiz.isPractice}
				<button class="hint-btn" on:click={handleHint}>
					<Fa icon={faLightbulb} />
				</button>
			{/if}
		</div>
	{:else}
		<span class={item.isCorrect ? 'answer correct' : 'answer incorrect'}>
			{item.answer}
		</span>

		{#if item.extra}
			<span>{item.extra}</span>
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
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.choice-grid button {
		white-space: normal;
		word-break: break-word;
		min-height: 3rem;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		align-items: stretch;
		justify-content: center;
		display: flex;
	}

	.choice-option {
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		cursor: pointer;
		width: 100%;
		text-align: center;
		transition: all 0.15s ease;
	}

	.correct {
		background: green;
		color: white;
	}

	.incorrect {
		background: red;
		color: white;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.flag-btn,
	.hint-btn {
		width: 45px;
		min-width: 45px;
		max-width: 45px;
		height: 45px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 0;
	}

	.flag-btn {
		background: #da0000;
	}

	.hint-btn {
		background: #1f1f1f;
	}

	.input-row .form-control.answer-box {
		flex: 1 1 auto;
	}
</style>
