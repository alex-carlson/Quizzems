<script>
	import { createEventDispatcher } from 'svelte';
	import FileUpload from '../Upload/FileUpload.svelte';
	import AudioUploader from '../Upload/AudioUploader.svelte';
	import ImageSuggestions from '../Upload/ImageSuggestions.svelte';
	import AnswerInput from './AnswerInput.svelte';
	import { addToast } from '../../store/toast';
	import { uploadData, uploadQuestion, uploadAudio } from '../Upload/uploader';
	import { QuestionType, AnswerType } from '$lib/types/enums';
	import { Fa } from 'svelte-fa';
	import { faUpload, faSearch } from '@fortawesome/free-solid-svg-icons';

	const dispatch = createEventDispatcher();

	// collection is passed for reference only, component doesn't mutate it directly
	export const collection = {};
	export let item;
	export let questionType = 'Image';
	let imageSubTab = 'search'; // 'upload' or 'search'

	let imageSuggestions = [];
	let searchTerm = '';
	let fileUploadComponent; // Reference to FileUpload component

	// Check if Add Image button should be enabled
	$: isImageUploadDisabled = (() => {
		// Check if answer is provided
		const hasAnswer =
			(item.answer ?? '').trim() !== '' ||
			(Array.isArray(item.answers) ? item.answers.join('').trim() : (item.answers ?? '').trim()) !==
				'';

		// Check if image is provided
		const hasImage = !!(item.file || item.src);

		return !hasAnswer || !hasImage;
	})();

	// Reactive statement to update searchTerm when answer input changes
	$: {
		if (questionType === 'Image') {
			const currentAnswer = Array.isArray(item.answers)
				? item.answers.join(' ').trim()
				: (item.answer || '').trim();
			if (currentAnswer !== searchTerm) {
				searchTerm = currentAnswer;
			}
		}
	}

	// Focus function for question input
	function focusQuestionInput() {
		const questionInput = document.getElementById('question-input-question');
		if (questionInput) {
			questionInput.focus();
			questionInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	// Upload handlers
	async function handleImageUpload() {
		if (
			(item.answer ?? '').trim() === '' &&
			(Array.isArray(item.answers) ? item.answers.join('').trim() : (item.answers ?? '').trim()) ===
				''
		) {
			addToast({
				type: 'error',
				message: 'Please enter an answer.'
			});
			return;
		}

		if (!item.src && !item.file) {
			console.log('No image found - src:', item.src, 'file:', item.file);
			addToast({
				type: 'error',
				message: 'Please add an image.'
			});
			return;
		}

		// Prepare item for upload
		const uploadItem = {
			...item,
			questionType: QuestionType.IMAGE,
			answerType: item.answerType || AnswerType.SINGLE
		};

		// If we only have a URL source, convert it to a file object
		if (item.src && !item.file) {
			console.log('Converting URL to file object:', item.src);
			try {
				const response = await fetch(item.src);
				const blob = await response.blob();
				const filename = item.src.split('/').pop()?.split('?')[0] || 'image';
				const file = new File([blob], filename, { type: blob.type });
				uploadItem.file = file;
				uploadItem.src = ''; // Clear src since we now have a file
				console.log('URL converted to file:', file);
			} catch (error) {
				console.error('Failed to fetch image from URL:', error);
				addToast({
					type: 'error',
					message: 'Failed to load image from URL. Please try again.'
				});
				return;
			}
		}

		const newItems = await uploadData(uploadItem, undefined, false);
		if (newItems && Array.isArray(newItems) && newItems.length > 0 && newItems[0]?.items) {
			// Dispatch event to parent instead of directly modifying collection
			dispatch('itemAdded', {
				items: newItems[0].items,
				itemsLength: newItems[0].items.length,
				questionType: 'image'
			});

			// Check for duplicate answers
			const currentAnswer = Array.isArray(item.answers)
				? item.answers.join(' ').trim().toLowerCase()
				: (item.answer || '').trim().toLowerCase();

			if (currentAnswer && newItems[0].items.length > 1) {
				const existingAnswers = newItems[0].items
					.slice(0, -1)
					.map((i) =>
						Array.isArray(i.answers)
							? i.answers.join(' ').trim().toLowerCase()
							: (i.answer || '').trim().toLowerCase()
					);
				if (existingAnswers.includes(currentAnswer)) {
					addToast({
						type: 'warning',
						message: 'This answer already exists in the collection.'
					});
				} else {
					addToast({
						type: 'success',
						message: 'Image added successfully!'
					});
				}
			}

			item.question = '';
			item.answer = '';
			item.answers = '';
			item.src = '';
			item.file = null;
			item.supplemental_text = '';
			imageSuggestions = [];
			searchTerm = '';
			// Clear the FileUpload component
			if (fileUploadComponent) {
				fileUploadComponent.clearImage();
			}
			// Focus and scroll to question input for next item
			setTimeout(focusQuestionInput, 100);
		}
	}

	async function handleAudioUpload() {
		// Add type properties for audio uploads
		const audioItem = {
			...item,
			questionType: QuestionType.AUDIO,
			answerType: item.answerType || AnswerType.SINGLE
		};
		const newItems = await uploadAudio(audioItem);
		if (newItems && Array.isArray(newItems) && newItems.length > 0 && newItems[0]?.items) {
			// Dispatch event to parent instead of directly modifying collection
			dispatch('itemAdded', {
				items: newItems[0].items,
				itemsLength: newItems[0].items.length,
				questionType: 'audio'
			});

			addToast({
				type: 'success',
				message: 'Audio added successfully!'
			});
			item.question = '';
			item.answer = '';
			item.answers = '';
			item.src = '';
			item.supplemental_text = '';
			// Focus and scroll to question input for next item
			setTimeout(focusQuestionInput, 100);
		}
	}

	async function handleQuestionUpload() {
		if ((item.question ?? '').trim() === '') {
			addToast({
				type: 'error',
				message: 'Please enter a question.'
			});
			return;
		}
		const newItems = await uploadQuestion({
			...item,
			questionType: QuestionType.TEXT,
			answerType: item.answerType || AnswerType.SINGLE
		});
		if (newItems && Array.isArray(newItems) && newItems.length > 0 && newItems[0]?.items) {
			// Dispatch event to parent instead of directly modifying collection
			dispatch('itemAdded', {
				items: newItems[0].items,
				itemsLength: newItems[0].items.length,
				questionType: 'text'
			});

			addToast({
				type: 'success',
				message: 'Question added successfully!'
			});
			item.question = '';
			item.answer = '';
			item.answers = '';
			item.src = '';
			item.supplemental_text = '';
			const inputs = document.querySelectorAll('input, textarea');
			inputs.forEach((input) => {
				input.value = '';
			});
			// Focus and scroll to question input for next item
			setTimeout(focusQuestionInput, 100);
		}
	}
</script>

<div class="question-type-form w-100 px-2">
	<!-- Navigation Tabs -->
	<nav class="nav nav-tabs">
		<button
			class="nav-link {questionType === 'Image' ? 'active' : ''}"
			on:click={() => (questionType = 'Image')}
		>
			Image
		</button>
		<button
			class="nav-link {questionType === 'Audio' ? 'active' : ''}"
			on:click={() => (questionType = 'Audio')}
		>
			Audio
		</button>
		<button
			class="nav-link {questionType === 'Question' ? 'active' : ''}"
			on:click={() => (questionType = 'Question')}
		>
			Question
		</button>
	</nav>

	<!-- Tab Content -->
	<div class="tab-content">
		{#if questionType === 'Image'}
			<!-- Image Sub-tabs -->
			<div class="sub-tabs mb-3">
				<button
					class="sub-tab-btn {imageSubTab === 'upload' ? 'active' : ''}"
					on:click={() => (imageSubTab = 'upload')}
				>
					<Fa icon={faUpload} class="me-2" />Upload
				</button>
				<button
					class="sub-tab-btn {imageSubTab === 'search' ? 'active' : ''}"
					on:click={() => (imageSubTab = 'search')}
				>
					<Fa icon={faSearch} class="me-2" />Search
				</button>
			</div>

			<div class="form-group mt-3">
				<AnswerInput bind:item idPrefix="answer-image" />
			</div>

			<form on:submit|preventDefault={handleImageUpload}>
				<div class="row">
					{#if imageSubTab === 'upload'}
						<div class="mt-3">
							<FileUpload
								bind:this={fileUploadComponent}
								on:uploadImage={(event) => {
									// Handle both file uploads and URL uploads
									if (typeof event.detail === 'string') {
										// URL upload
										console.log('Setting URL:', event.detail);
										item.src = event.detail;
										item.file = null;
									} else {
										// File upload
										console.log('Setting file:', event.detail);
										item.file = event.detail;
										item.src = '';
									}
								}}
							/>
						</div>
					{:else if imageSubTab === 'search'}
						<div class="mt-3">
							<ImageSuggestions
								bind:searchTerm
								bind:suggestions={imageSuggestions}
								on:addImage={(e) => {
									item.file = e.detail.file;
									if (e.detail.src) item.src = e.detail.src;
								}}
							/>
						</div>
					{/if}
				</div>
				<button
					type="submit"
					class="btn mt-2 {isImageUploadDisabled ? 'btn-secondary' : 'btn-success'}"
					disabled={isImageUploadDisabled}
				>
					Add Image
				</button>
			</form>
		{:else if questionType === 'Audio'}
			<form on:submit|preventDefault={handleAudioUpload}>
				<div class="row">
					<div class="mt-3">
						<AudioUploader
							on:addSong={(e) => {
								item.videoId = e.detail.videoId;
								item.title = e.detail.title;
								item.thumbnail = e.detail.thumbnail;
								handleAudioUpload();
							}}
						/>
					</div>
				</div>
				<button type="submit" class="btn btn-success mt-2">Add Audio</button>
			</form>
		{:else if questionType === 'Question'}
			<form on:submit|preventDefault={handleQuestionUpload}>
				<div class="form-group">
					<label for="question-input-question">Question:</label>
					<textarea
						id="question-input-question"
						class="form-control"
						bind:value={item.question}
						placeholder="Enter the question"
					/>
				</div>
				<AnswerInput bind:item idPrefix="answer-question" />
				<button type="submit" class="btn btn-success mt-2">Add Question</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.nav-tabs {
		border-bottom: 1px solid #e9ecef;
		margin-bottom: 20px;
		background: #f8f9fa;
		border-radius: 8px 8px 0 0;
		padding: 4px;
	}

	.nav-tabs .nav-link {
		background: none;
		border: none;
		padding: 12px 24px;
		color: #6c757d;
		cursor: pointer;
		border-radius: 6px;
		transition: all 0.2s ease;
		font-weight: 500;
		position: relative;
		margin: 0 2px;
	}

	.nav-link:hover {
		color: #495057;
		background: rgba(13, 110, 253, 0.05);
	}

	.nav-tabs .nav-link.active {
		color: #ffffff;
		background: linear-gradient(135deg, #0d6efd, #0b5ed7);
		font-weight: 600;
		box-shadow: 0 2px 8px rgba(13, 110, 253, 0.3);
		transform: translateY(-1px);
	}

	.nav-tabs .nav-link.active:hover {
		background: linear-gradient(135deg, #0b5ed7, #0a58ca);
	}

	.tab-content {
		background: #ffffff;
		border: 1px solid #e9ecef;
		border-top: none;
		border-radius: 0 0 8px 8px;
		padding: 24px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.question-type-form {
		border-radius: 8px;
		overflow: hidden;
	}

	.sub-tabs {
		display: flex;
		gap: 8px;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e9ecef;
	}

	.sub-tab-btn {
		background: #ffffff;
		border: 1px solid #e9ecef;
		padding: 8px 16px;
		border-radius: 4px;
		color: #6c757d;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
	}

	.sub-tab-btn:hover {
		color: #495057;
		background: #e9ecef;
		border-color: #adb5bd;
	}

	.sub-tab-btn.active {
		background: linear-gradient(135deg, #0d6efd, #0b5ed7);
		color: #ffffff;
		border-color: #0d6efd;
		box-shadow: 0 2px 4px rgba(13, 110, 253, 0.25);
	}

	.sub-tab-btn.active:hover {
		background: linear-gradient(135deg, #0b5ed7, #0a58ca);
		border-color: #0b5ed7;
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

	.image-preview {
		margin-top: 15px;
		text-align: center;
	}

	.image-preview img {
		max-height: 200px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.audio-preview {
		padding: 10px;
		background: #f8f9fa;
		border-radius: 8px;
	}
</style>
