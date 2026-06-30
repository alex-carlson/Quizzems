<script>
	import { Fa } from 'svelte-fa';
	import { faTimes } from '@fortawesome/free-solid-svg-icons';
	import { AnswerType } from '$lib/types/enums';

	export let item;
	export let idPrefix = 'answer';
	export let label = 'Answer:';

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
		const base = normalizeToArray(item.answers ?? item.answer);

		// ensure we always have a usable array
		const arr = base.length ? base : [];

		switch (item.answer_type) {
			case 'single': {
				item.answer = arr[0] ?? '';
				delete item.isMultipleChoice;
				delete item.numRequired;
				item.answerType = AnswerType.SINGLE;
				break;
			}

			case 'multiple-choice': {
				item.answer = arr.length ? arr : ['', ''];
				item.isMultipleChoice = true;
				item.numRequired = 1;
				item.answerType = 'multiple-choice';
				break;
			}

			case 'multi-answer': {
				item.answer = arr.length ? arr : ['', ''];
				delete item.isMultipleChoice;

				if (!item.numRequired) {
					item.numRequired = 1;
				}

				item.answerType = 'multi-answer';
				break;
			}
		}
	}

	// Remove answer function for multi-answer support
	function removeAnswer(index) {
		if (item.answer && item.answer.length > 1) {
			item.answer = item.answer.filter((_, i) => i !== index);
			// If we removed the correct answer in multiple choice mode, reset it
			if (item.answer_type === 'multiple-choice' && item.correctAnswerIndex === index) {
				item.correctAnswerIndex = 0;
			} else if (item.answer_type === 'multiple-choice' && item.correctAnswerIndex > index) {
				item.correctAnswerIndex--;
			}

			// If only one answer remains, convert back to single answer mode
			if (item.answer.length === 1) {
				item.answer = item.answer[0];
				delete item.isMultipleChoice;
				delete item.numRequired;
				delete item.correctAnswerIndex;
				item.answer_type = 'single';
			}
		}
	}

	// Function to add a new answer
	function addAnswer() {
		item.answer = [...item.answer, ''];
	}
</script>

<div class="form-group white">
	<div class="d-flex justify-content-between align-items-center mb-2">
		<label for="{idPrefix}-0">{label}</label>
		<select
			class="form-select form-select-sm"
			bind:value={item.answer_type}
			on:change={handleModeChange}
			style="width: auto; min-width: 150px; background-color: white; color: #343a40;"
		>
			<option value="single">Single Answer</option>
			<option value="multiple-choice">Multiple Choice</option>
			<option value="multi-answer">Multi-Answer</option>
		</select>
	</div>

	{#if item.answer_type === 'single'}
		<div class="single-answer-container">
			<input
				id="image-answer-input"
				class="form-control"
				bind:value={item.answer}
				type="text"
				placeholder="Enter the answer"
			/>
		</div>
	{:else if item.answer_type === 'multiple-choice'}
		<div class="multiple-choice-container">
			<div class="mb-2">
				<small class="text-muted"
					>Enter multiple options. Mark the correct answer with a checkmark.</small
				>
			</div>
			{#each item.answer as answer, index}
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
						bind:value={item.answer[index]}
						placeholder="Enter option {index + 1}"
					/>
					{#if item.answer.length > 2}
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
	{:else if item.answer_type === 'multi-answer'}
		<div class="multi-answer-container">
			<div class="mb-2">
				<small class="text-muted"
					>Enter multiple correct answers. Players need to answer the defined number of correct
					options</small
				>
			</div>
			{#each item.answer as answer, index}
				<div class="input-group mb-2">
					<input
						id="{idPrefix}-{index}"
						type="text"
						class="form-control"
						bind:value={answer}
						placeholder="Enter answer {index + 1}"
					/>
					{#if item.answer.length > 1}
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
				{#if item.answer.length > 1}
					<div class="d-flex align-items-center gap-2">
						<label for="numRequired-{idPrefix}" class="form-label mb-0">Required:</label>
						<input
							id="numRequired-{idPrefix}"
							type="number"
							class="form-control form-control-sm"
							min="1"
							max={item.answer ? item.answer.length : 1}
							bind:value={item.numRequired}
							placeholder={item.answer ? String(item.answer.length) : '1'}
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
