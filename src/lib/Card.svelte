<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import LazyLoadImage from './LazyLoadImage.svelte';
	import Options from './Options.svelte';
	import ProfilePicture from './ProfilePicture.svelte';
	import YoutubeAudioPlayer from '$lib/YoutubeAudioPlayer.svelte';
	import { areStringsClose } from '$lib/api/utils';
	import { QuestionType, AnswerType } from '$lib/types/enums';
	import Fa from 'svelte-fa';
	import { faFlag } from '@fortawesome/free-solid-svg-icons';
	import Hint from './components/quiz/Hint.svelte';

	export let item = {
		answerType: AnswerType.SINGLE,
		questionType: QuestionType.TEXT,
		question: '',
		answer: '',
		userAnswer: '',
		revealed: false,
		incorrect: false,
		hidden: false
	};
	export let i = 0;
	export let cards = [];
	export let currentMode = 'FLASH_CARDS';
	export let shuffleTrigger = 0;
	export let onCardLoad = () => {};
	export let toggleReveal = () => {};
	export let updateCards = () => {};
	export let isPartyMode = false;
	export let isPractice = false;

	const dispatch = createEventDispatcher();

	function handleGiveUp() {
		dispatch('giveUp', { index: i });
	}

	// Handle focus events - use default browser scroll behavior
	function handleInputFocus(event) {
		// Find the card containing this input and scroll it to the top with offset
		const cardElement = event.target.closest('.card');
		if (cardElement) {
			const scrollToCard = () => {
				const cardRect = cardElement.getBoundingClientRect();
				const offsetTop = cardRect.top + window.pageYOffset - 80;
				window.scrollTo({ top: offsetTop, behavior: 'instant' });
			};

			// Initial scroll
			scrollToCard();

			// Re-scroll after mobile keyboard animation (if any)
			setTimeout(scrollToCard, 300);
		}
	}

	let userAnswers = [];
	let isValidated = false;
	let isLockedIn = false;
	let multipleChoiceSelected = false; // Track if user has made a selection
	let validationTimeout; // For debouncing validation
	let cachedValidationResult = null; // Cache validation results
	let lastValidationInput = ''; // Track input changes
	let normalizedSingleAnswers = [];
	let normalizedMultiAnswers = [];
	let normalizedMultiAnswersSet = new Set();
	let normalizedMultipleChoiceCorrect = '';

	function normalizeAnswerText(value) {
		return String(value || '')
			.toLowerCase()
			.trim()
			.replace(/[\u2018\u2019\u02BC']/g, '');
	}

	function getValidationKey() {
		if (!userAnswers.length) return '';
		return userAnswers.map((ans) => (ans ? ans.trim() : '')).join('\u0001');
	}

	$: {
		if (Array.isArray(item.answer)) {
			normalizedSingleAnswers = item.answer.map((ans) => normalizeAnswerText(ans));
		} else {
			normalizedSingleAnswers = [normalizeAnswerText(item.answer)];
		}

		normalizedMultiAnswers = (item.answers || [item.answer]).map((ans) => normalizeAnswerText(ans));
		normalizedMultiAnswersSet = new Set(normalizedMultiAnswers);
		normalizedMultipleChoiceCorrect = normalizeAnswerText(
			item.answers?.[item.correctAnswerIndex || 0]
		);
	}

	function handleInput(idx, e) {
		if (isLockedIn) return; // Prevent editing when locked in

		if (item.answerType === AnswerType.MULTIPLE_CHOICE) {
			userAnswers[0] = e.target.value;
			multipleChoiceSelected = true;
			// Lock in immediately for multiple choice to show feedback
			isLockedIn = true;
			item.revealed = true; // Mark as completed

			// Always dispatch correctAnswer event for multiple choice
			dispatch('correctAnswer', {
				index: i,
				answer: item.answers[item.correctAnswerIndex || 0],
				userAnswer: userAnswers[0],
				isCorrect: isCorrect()
			});
		} else {
			userAnswers[idx] = e.target.value;
			// Clear cached result when input changes
			cachedValidationResult = null;
			// Debounce validation to prevent excessive calls
			if (validationTimeout) clearTimeout(validationTimeout);
			validationTimeout = setTimeout(() => {
				validateAnswer();
			}, 150); // Increased debounce for low-end devices
		}
	}

	function isCorrect() {
		if (item.answerType === AnswerType.MULTIPLE_CHOICE) {
			// For multiple choice, check if selected answer matches the correct one
			return areStringsClose(normalizeAnswerText(userAnswers[0]), normalizedMultipleChoiceCorrect);
		} else if (item.answerType === AnswerType.MULTI_ANSWER) {
			// Optimized multi-answer checking
			const req = item.numRequired ?? (item.answers ? item.answers.length : 1);
			const filledUserAnswers = userAnswers.filter((ans) => ans && ans.trim());

			if (filledUserAnswers.length < req) return false;

			// Use Set for better performance
			const matchedCorrectAnswers = new Set();

			// Optimized: break early when possible
			for (const userAns of filledUserAnswers) {
				const normalizedUserAns = normalizeAnswerText(userAns);
				for (const correctAns of normalizedMultiAnswers) {
					if (areStringsClose(normalizedUserAns, correctAns)) {
						matchedCorrectAnswers.add(correctAns);
						break; // Found match, move to next user answer
					}
				}
				// Early exit if we already have enough matches
				if (matchedCorrectAnswers.size >= req) {
					return true;
				}
			}

			return matchedCorrectAnswers.size >= req;
		} else {
			// Check both userAnswers[0] and item.userAnswer for single answer type
			const userInput = userAnswers[0] || item.userAnswer || '';
			if (!userInput.trim()) return false;

			if (Array.isArray(item.answer)) {
				const normalizedUserInput = normalizeAnswerText(userInput);
				// Early exit optimization
				for (const ans of normalizedSingleAnswers) {
					if (areStringsClose(normalizedUserInput, ans)) {
						return true;
					}
				}
				return false;
			}
			return areStringsClose(normalizeAnswerText(userInput), normalizedSingleAnswers[0]);
		}
	}

	function validateAnswer() {
		// Performance optimization: Check if we already have a cached result
		const currentInput = getValidationKey();
		if (lastValidationInput === currentInput && cachedValidationResult !== null) {
			isValidated = cachedValidationResult;
			return;
		}
		lastValidationInput = currentInput;

		if (item.answerType === AnswerType.MULTIPLE_CHOICE) {
			// For multiple choice, just validate if an option is selected
			// Event dispatching is handled in handleInput
			const result = userAnswers[0]?.trim() && isCorrect();
			cachedValidationResult = result;
			isValidated = result;
		} else if (item.answerType === AnswerType.MULTI_ANSWER) {
			// Performance optimization: Cache expensive operations
			const req = item.numRequired ?? normalizedMultiAnswers.length;
			const filledAnswers = userAnswers.filter((a) => a && a.trim());

			if (filledAnswers.length === 0) {
				cachedValidationResult = false;
				isValidated = false;
				return;
			}

			let correctCount = 0;
			let allCorrect = true;

			for (const userAns of filledAnswers) {
				const userAnsLower = normalizeAnswerText(userAns);
				let foundMatch = false;

				// Fast exact match first
				if (normalizedMultiAnswersSet.has(userAnsLower)) {
					foundMatch = true;
					correctCount++;
				} else {
					// Slower fuzzy match only if exact match fails
					for (const correctAns of normalizedMultiAnswers) {
						if (areStringsClose(userAnsLower, correctAns)) {
							foundMatch = true;
							correctCount++;
							break;
						}
					}
				}

				if (!foundMatch) {
					allCorrect = false;
				}
			}

			// Validate if we have enough correct answers and all filled answers are correct
			const result = filledAnswers.length >= req && allCorrect && correctCount >= req;
			cachedValidationResult = result;
			isValidated = result;

			// Lock in immediately when multi-answer validation succeeds
			if (result && !isLockedIn) {
				isLockedIn = true;
				item.revealed = true; // Mark as completed

				// Dispatch correctAnswer event to notify parent
				dispatch('correctAnswer', {
					index: i,
					answer: item.answers || [item.answer],
					userAnswer: userAnswers.filter((a) => a && a.trim()),
					isCorrect: true
				});
			}
		} else {
			// Check both userAnswers[0] and item.userAnswer for validation
			const userInput = userAnswers[0] || item.userAnswer || '';
			const inputTrimmed = userInput.trim();

			if (!inputTrimmed) {
				cachedValidationResult = false;
				isValidated = false;
				return;
			}

			const result = isCorrect();
			cachedValidationResult = result;
			isValidated = result;

			// if is valid, lock in the answer
			if (result) {
				isLockedIn = true;
				item.revealed = true; // Mark as completed

				// Dispatch correctAnswer event to notify parent
				dispatch('correctAnswer', {
					index: i,
					answer:
						getUserValidAnswer() || (Array.isArray(item.answer) ? item.answer[0] : item.answer),
					userAnswer: userInput,
					isCorrect: true
				});

				// Enhanced focus management with better timing
				requestAnimationFrame(() => {
					setTimeout(() => {
						try {
							// Find all text inputs in the flashcards container
							const container = document.querySelector('.flashcards') || document;
							const inputs = Array.from(
								container.querySelectorAll('input[type="text"]:not([disabled])')
							);

							if (inputs.length <= 1) return;

							// Find current input by matching value or by being the active element
							let currentInputIndex = -1;

							// First try to find by matching the user input
							for (let j = 0; j < inputs.length; j++) {
								if (inputs[j].value === userInput || inputs[j] === document.activeElement) {
									currentInputIndex = j;
									break;
								}
							}

							// Find next available input with looping behavior
							if (currentInputIndex >= 0) {
								let nextInput = null;

								// First, look for next available input after current one
								for (let j = currentInputIndex + 1; j < inputs.length; j++) {
									const input = inputs[j];
									if (!input.disabled && input.value.trim() === '') {
										nextInput = input;
										break;
									}
								}

								// If no next input found, loop back to beginning
								if (!nextInput) {
									for (let j = 0; j <= currentInputIndex; j++) {
										const input = inputs[j];
										if (!input.disabled && input.value.trim() === '' && j !== currentInputIndex) {
											nextInput = input;
											break;
										}
									}
								}

								// Focus the next available input with default scroll behavior
								if (nextInput) {
									nextInput.focus();
									// nextInput.select(); // Also select the text for better UX
								}
							}
						} catch (error) {
							console.warn('Error focusing next input:', error);
						}
					}, 50); // Small delay to ensure DOM is updated
				});
			}
		}
	}

	function getInputClass(idx) {
		if (item.answerType === AnswerType.MULTIPLE_CHOICE) {
			// For multiple choice, we don't need input styling since we use radio buttons
			return '';
		}

		return 'form-control answer-box';
	}

	// Get class for multiple choice option buttons
	function getChoiceClass(choice, idx) {
		let baseClass = 'choice-option';

		if (!multipleChoiceSelected) {
			// Before selection, show selected state
			return userAnswers[0] === choice ? `${baseClass} selected` : baseClass;
		}

		// After selection, show correct/incorrect states
		const isCorrectChoice = idx === (item.correctAnswerIndex || 0);
		const isSelectedChoice = userAnswers[0] === choice;

		if (isCorrectChoice) {
			return `${baseClass} correct`;
		} else if (isSelectedChoice) {
			return `${baseClass} incorrect`;
		}

		return baseClass;
	}

	// Get the user's valid answer when they entered a correct answer from an array
	function getUserValidAnswer() {
		const userInput = userAnswers[0] || item.userAnswer || '';
		if (!userInput.trim() || !Array.isArray(item.answer)) return null;
		const normalizedUserInput = normalizeAnswerText(userInput);

		// Check if user's input matches any of the valid answers
		for (let idx = 0; idx < normalizedSingleAnswers.length; idx++) {
			if (areStringsClose(normalizedUserInput, normalizedSingleAnswers[idx])) {
				return item.answer[idx]; // Return the matched answer from the original array
			}
		}
		return null;
	}

	// Get class for revealed answer based on correctness
	function getRevealedClass() {
		if (!item.revealed) return 'answer';
		return `answer ${isCorrect() ? 'correct' : 'incorrect'}`;
	}

	// Cleanup validation timeout and cache on destroy
	onDestroy(() => {
		if (validationTimeout) {
			clearTimeout(validationTimeout);
			validationTimeout = null;
		}
		// Clear cache to prevent memory leaks
		cachedValidationResult = null;
		lastValidationInput = '';
	});
</script>

{#if !item.hidden}
	<div
		class="card {item.revealed ? 'revealed' : ''} {item.incorrect
			? 'incorrect'
			: ''} {item.questionType} {item.answerType}"
		data-card-index={i}
		role="button"
		tabindex="-1"
		on:keydown={(e) => currentMode === 'FLASH_CARDS' && e.key === 'Enter' && toggleReveal(i)}
		on:click={() => currentMode === 'FLASH_CARDS' && toggleReveal(i)}
	>
		{#if item.audio}
			<YoutubeAudioPlayer id={item.id} videoId={item.audio} />
			{#if item.revealed}
				<div class="audio-revealed">
					<img src={item.thumbnail} alt="YouTube thumbnail" class="youtube-thumbnail" />
					<div class="youtube-title">
						<a
							href={`https://www.youtube.com/watch?v=${item.audio}`}
							target="_blank"
							rel="noopener noreferrer"
							on:click|preventDefault={(e) => {
								window.open(e.currentTarget.href, '_blank', 'noopener,noreferrer');
							}}
						>
							{item.title}
						</a>
					</div>
				</div>
			{/if}
		{/if}

		{#if item.imageUrl}
			<LazyLoadImage
				imageUrl={item.imageUrl}
				on:load={() => onCardLoad(i)}
				on:error={() => {
					item.hidden = true;
					updateCards();
				}}
			/>
		{/if}

		{#if item.questionType === QuestionType.TEXT && item.type != 'image' && item.type != 'audio' && !item.imageUrl && !item.image}
			<h2 class="p-3">{item.question || 'Loading'}</h2>
		{/if}

		{#if item.supplemental}
			<span class="supplemental">{@html (item.supplemental || '').replace(/\n/g, '<br>')}</span>
		{/if}

		<div class="answerbox mt-2">
			{#if currentMode === 'TRUE_FALSE'}
				<Options
					{cards}
					currentCardIndex={i}
					numberOfOptions="2"
					{shuffleTrigger}
					on:correctAnswer
				/>
			{:else if currentMode === 'MULTIPLE_CHOICE'}
				<Options
					{cards}
					currentCardIndex={i}
					numberOfOptions="4"
					{shuffleTrigger}
					on:correctAnswer
				/>
			{:else if currentMode === 'FILL_IN_THE_BLANK'}
				{#if item.answerer}
					<ProfilePicture userId={item.answerer} size={32} class="answerer" />
				{/if}
				<span
					class={`${getRevealedClass()} ${item.revealed ? 'revealed' : 'hidden'}`}
					style="transform: scale(1);"
				>
					{#if item.revealed}
						{#if item.answerType === AnswerType.MULTIPLE_CHOICE}
							{item.answers[item.correctAnswerIndex || 0]}
						{:else if item.answerType === AnswerType.MULTI_ANSWER}
							{#if item.answers && item.answers.length > 0}
								{item.answers.join(', ')}
							{:else}
								{Array.isArray(item.answer) ? item.answer.join(', ') : item.answer}
							{/if}
						{:else}
							{Array.isArray(item.answer) ? item.answer[0] : item.answer}
						{/if}
					{:else}
						{item.answer}
					{/if}
				</span>
				{#if item.extra && item.revealed}
					<span class="extra">{item.extra}</span>
				{/if}
				<div class="input-container">
					{#if !item.revealed && !isPartyMode}
						<button
							class="give-up-btn small {item.answerType === AnswerType.MULTIPLE_CHOICE ||
							item.answerType === AnswerType.MULTI_ANSWER
								? 'floating'
								: ''}"
							on:click|stopPropagation={handleGiveUp}
							tabindex="-1"
						>
							<Fa icon={faFlag} />
						</button>
					{/if}
					{#if item.answerType === AnswerType.MULTIPLE_CHOICE}
						<!-- Multiple Choice - Radio buttons -->
						<div class="multiple-choice-inputs">
							{#each item.answers || [] as choice, idx}
								<button
									type="button"
									class={getChoiceClass(choice, idx)}
									on:click={() => {
										if (!isLockedIn) {
											userAnswers[0] = choice;
											handleInput(0, { target: { value: choice } });
										}
									}}
									on:focus={handleInputFocus}
									disabled={isLockedIn}
								>
									<span class="choice-text">{choice}</span>
								</button>
							{/each}
						</div>
					{:else if item.answerType === AnswerType.MULTI_ANSWER}
						<!-- Multi-Answer - Multiple text inputs -->
						<div class="multi-answer-inputs">
							{#each Array(item.numRequired || (item.answers ? item.answers.length : 1)) as _, idx}
								<div class="input-row">
									<input
										type="text"
										class={getInputClass(idx)}
										placeholder={`Answer ${idx + 1}`}
										value={userAnswers[idx] || ''}
										on:input={(e) => handleInput(idx, e)}
										on:focus={handleInputFocus}
										disabled={isLockedIn}
									/>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Single Answer - Single text input -->
						<input
							type="text"
							class={getInputClass(0)}
							placeholder="Enter your answer"
							bind:value={userAnswers[0]}
							on:input={(e) => handleInput(0, e)}
							on:focus={handleInputFocus}
						/>
						{#if isPractice && !isPartyMode && !item.revealed}
							<Hint
								answer={item.answer}
								on:reveal={(e) => {
									userAnswers[0] = e.detail.revealedAnswer;
									validateAnswer();
								}}
							/>
						{/if}
					{/if}
				</div>
			{:else}
				<span
					class={`answer black ${item.revealed ? 'revealed' : 'hidden'}`}
					style="transform: scale(1);"
				>
					{getUserValidAnswer() ||
						(Array.isArray(item.answer) ? item.answer[0] : item.answer) ||
						'Loading'}
				</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.answer.correct {
		border: 2px solid #28a745;
		background-color: #d4edda;
		color: #155724;
		padding: 0.5rem;
		border-radius: 0.375rem;
	}

	.answer.incorrect {
		border: 2px solid #dc3545;
		background-color: #f8d7da;
		color: #721c24;
		padding: 0.5rem;
		border-radius: 0.375rem;
	}

	.validation-status {
		display: inline-block;
		margin-left: 10px;
		font-weight: bold;
	}

	.validation-status.correct {
		color: #28a745;
	}

	.validation-status.incorrect {
		color: #dc3545;
	}

	input:disabled {
		background-color: #e9ecef;
		opacity: 1;
		cursor: not-allowed;
	}

	.multi-answer-inputs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		flex: 1;
		width: 100%;
	}

	.multiple-choice-inputs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		flex: 1;
		width: 100%;
	}

	.choice-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 0.375rem;
		cursor: pointer;
		background-color: white;
		color: #333;
		width: 100%;
		transition:
			background-color 0.3s ease,
			border-color 0.3s ease,
			box-shadow 0.3s ease;
	}

	.choice-option.selected {
		background-color: #e3f2fd;
		border-color: #2196f3;
		color: #1565c0;
		box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
	}

	.choice-option.correct {
		background-color: #d4edda;
		border-color: #28a745;
		color: #155724;
		box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
	}

	.choice-option.incorrect {
		background-color: #f8d7da;
		border-color: #dc3545;
		color: #721c24;
		box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
	}

	.choice-option:hover:not(.correct):not(.incorrect) {
		background-color: #f8f9fa;
		border-color: #adb5bd;
	}

	.choice-option:disabled {
		cursor: not-allowed;
		opacity: 0.8;
	}

	.choice-text {
		flex: 1;
		cursor: pointer;
		user-select: none;
	}

	.input-row {
		display: block;
		width: 100%;
	}

	.input-row input {
		width: 100%;
		display: block;
		flex: 1;
	}

	.input-container {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
		width: 100%;
	}

	.give-up-btn {
		flex-shrink: 0;
		align-self: flex-start;
	}
</style>
