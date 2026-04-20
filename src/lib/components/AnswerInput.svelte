<script>
	import { Fa } from 'svelte-fa';
	import { faTimes } from '@fortawesome/free-solid-svg-icons';
	import { AnswerType } from '$lib/types/enums';

	export let item;
	export let idPrefix = 'answer';
	export let label = 'Answer:';

	// Answer mode options
	let answerMode = 'single'; // 'single', 'multiple-choice', 'multi-answer'

	// Initialize answer mode based on current item state
	$: {
		if (item.answerType === AnswerType.MULTIPLE_CHOICE) {
			answerMode = 'multiple-choice';
		} else if (item.answerType === AnswerType.MULTI_ANSWER) {
			answerMode = 'multi-answer';
		} else {
			answerMode = 'single';
		}
	}

	// Defensive: ensure item.answers is always an array in MC/multi mode
	$: if (
		(answerMode === 'multiple-choice' || answerMode === 'multi-answer') &&
		!Array.isArray(item.answers)
	) {
		item.answers = [item.answer || '', ''];
	}

	function normalizeToArray(answer) {
		if (Array.isArray(answer)) {
			return answer.map((a) => String(a).trim()).filter(Boolean);
		}

		if (typeof answer === 'string') {
			return answer.trim() ? [answer.trim()] : [];
		}

		return [];
	}

	function handleModeChange() {
		switch (answerMode) {
			case 'single': {
				const arr = item.answers ?? normalizeToArray(item.answer);

				item.answer = arr[0] ?? '';
				delete item.answers;
				delete item.isMultipleChoice;
				delete item.numRequired;
				item.answerType = AnswerType.SINGLE;
				break;
			}

			case 'multiple-choice': {
				const arr = item.answers ?? normalizeToArray(item.answer);

				item.answers = arr.length ? arr : ['', ''];
				item.answer = item.answers;
				item.isMultipleChoice = true;
				item.numRequired = 1;
				item.answerType = AnswerType.MULTIPLE_CHOICE;
				break;
			}

			case 'multi-answer': {
				const arr = item.answers ?? normalizeToArray(item.answer);

				item.answers = arr.length ? arr : ['', ''];
				item.answer = item.answers;
				delete item.isMultipleChoice;

				if (!item.numRequired) {
					item.numRequired = item.answers.length;
				}

				item.answerType = AnswerType.MULTI_ANSWER;
				console.log(item);
				break;
			}
		}
	}

	// Remove answer function for multi-answer support
	function removeAnswer(index) {
		if (item.answers && item.answers.length > 1) {
			item.answers = item.answers.filter((_, i) => i !== index);
			// If we removed the correct answer in multiple choice mode, reset it
			if (answerMode === 'multiple-choice' && item.correctAnswerIndex === index) {
				item.correctAnswerIndex = 0;
			} else if (answerMode === 'multiple-choice' && item.correctAnswerIndex > index) {
				item.correctAnswerIndex--;
			}

			// If only one answer remains, convert back to single answer mode
			if (item.answers.length === 1) {
				item.answer = item.answers[0];
				delete item.answers;
				delete item.isMultipleChoice;
				delete item.numRequired;
				delete item.correctAnswerIndex;
				item.answerType = AnswerType.SINGLE;
				answerMode = 'single';
			}
		}
	}

	// Function to add a new answer
	function addAnswer() {
		item.answers = [...item.answers, ''];
	}
</script>

<div class="form-group white">
	<div class="d-flex justify-content-between align-items-center mb-2">
		<label for="{idPrefix}-0">{label}</label>
		<select
			class="form-select form-select-sm"
			bind:value={answerMode}
			on:change={handleModeChange}
			style="width: auto; min-width: 150px; background-color: white; color: #343a40;"
		>
			<option value="single">Single Answer</option>
			<option value="multiple-choice">Multiple Choice</option>
			<option value="multi-answer">Multi-Answer</option>
		</select>
	</div>

	{#if answerMode === 'single'}
		<div class="single-answer-container">
			<input
				id="{idPrefix}-0"
				type="text"
				class="form-control"
				bind:value={item.answer}
				placeholder="Enter the answer"
			/>
		</div>
	{:else if answerMode === 'multiple-choice'}
		<div class="multiple-choice-container">
			<div class="mb-2">
				<small class="text-muted"
					>Enter multiple options. Mark the correct answer with a checkmark.</small
				>
			</div>
			{#each item.answers as answer, index}
				<div class="input-group mb-2">
					<div class="input-group-text">
						<input
							type="radio"
							name="{idPrefix}-correct"
							value={index}
							checked={item.correctAnswerIndex === index}
							on:change={() => {
								item.correctAnswerIndex = index;
								item.numRequired = 1;
							}}
							aria-label="Mark as correct answer"
						/>
					</div>
					<input
						id="{idPrefix}-{index}"
						type="text"
						class="form-control"
						bind:value={item.answers[index]}
						placeholder="Enter option {index + 1}"
					/>
					{#if item.answers.length > 2}
						<button
							type="button"
							class="btn btn-outline-danger"
							on:click={() => removeAnswer(index)}
							title="Remove this option"
						>
							<Fa icon={faTimes} />
						</button>
					{/if}
				</div>
			{/each}
			<button type="button" class="btn btn-primary btn-sm add-button" on:click={addAnswer}>
				Add Option
			</button>
		</div>
	{:else if answerMode === 'multi-answer'}
		<div class="multi-answer-container">
			<div class="mb-2">
				<small class="text-muted"
					>Enter multiple correct answers. Players need to answer the defined number of correct
					options</small
				>
			</div>
			{#each item.answers as answer, index}
				<div class="input-group mb-2">
					<input
						id="{idPrefix}-{index}"
						type="text"
						class="form-control"
						bind:value={item.answers[index]}
						placeholder="Enter answer {index + 1}"
					/>
					{#if item.answers.length > 1}
						<button
							type="button"
							class="btn btn-outline-danger"
							on:click={() => removeAnswer(index)}
							title="Remove this answer"
						>
							<Fa icon={faTimes} />
						</button>
					{/if}
				</div>
			{/each}
			<div class="multi-answer-controls d-flex gap-2 align-items-center">
				{#if item.answers.length > 1}
					<div class="d-flex align-items-center gap-2">
						<label for="numRequired-{idPrefix}" class="form-label mb-0">Required:</label>
						<input
							id="numRequired-{idPrefix}"
							type="number"
							class="form-control form-control-sm"
							min="1"
							max={item.answers ? item.answers.length : 1}
							bind:value={item.numRequired}
							placeholder={item.answers ? String(item.answers.length) : '1'}
							style="width: 120px;"
						/>
					</div>
				{/if}
			</div>
			<button type="button" class="btn btn-primary btn-sm add-button mt-3" on:click={addAnswer}>
				Add Answer
			</button>
		</div>
	{/if}
</div>

<style>
	.multi-answer-container,
	.multiple-choice-container {
		background: #f8f9fa;
		padding: 15px;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.multi-answer-controls {
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid #e9ecef;
	}

	.single-answer-container {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		font-weight: 600;
		margin-bottom: 8px;
		display: block;
		color: #495057;
	}

	.input-group-text {
		background-color: #e9ecef;
		border-color: #ced4da;
	}

	.input-group-text input[type='radio'] {
		margin: 0;
	}

	.text-muted {
		font-size: 0.875rem;
		color: #6c757d;
	}

	.input-group {
		display: flex;
		width: 100%;
		flex-wrap: nowrap;
		align-items: stretch;
	}

	.form-control {
		border: solid 2px green;
		background: white;
	}

	.input-group .form-control {
		flex: 1 1 auto;
		width: auto;
		min-width: 0;
		border-radius: 0px;
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.input-group .btn {
		flex: 0 0 auto;
		width: auto;
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: 0;
		z-index: 1;
	}

	.input-group .btn:hover {
		border-left: 1px solid #dc3545;
	}

	.add-button {
		background: linear-gradient(135deg, #0066cc, #004499) !important;
		border-color: #004499 !important;
		color: white !important;
		font-weight: 600;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s ease-in-out;
		box-shadow: 0 2px 4px rgba(0, 100, 200, 0.2);
	}

	.add-button:hover {
		background: linear-gradient(135deg, #0052a3, #003366) !important;
		border-color: #003366 !important;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 100, 200, 0.3);
	}
</style>
