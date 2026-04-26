<script>
	import { createEventDispatcher } from 'svelte';
	import Cropper from './Cropper.svelte';
	import Drawing from './Drawing.svelte';
	import AnswerInput from '../components/AnswerInput.svelte';
	import { QuestionType, AnswerType, isValidAnswerType } from '$lib/types/enums';
	import { Fa } from 'svelte-fa';
	import {
		faPenToSquare,
		faTrashCan,
		faFloppyDisk,
		faBan,
		faChevronUp,
		faChevronDown,
		faPlus
	} from '@fortawesome/free-solid-svg-icons';
	import { uploadData, saveEdit } from './uploader.js';
	import { addToast } from '../../store/toast.js';
	import { user } from '../../store/user.js';
	export let item;
	export let index;
	export let editableItemId;
	export let isReordering;
	export let collection; // Add collection prop to get category
	let isCropping = false; // Track if cropping is active
	let isDrawing = false; // Track if drawing is active
	let isDragging = false; // Track drag state
	let cropperComponent; // Reference to Cropper component
	let drawingComponent; // Reference to Drawing component
	const dispatch = createEventDispatcher();

	function removeItemHandler() {
		dispatch('removeItem', item.id);
	}

	function reorderItemHandler(prevIndex, newIndex) {
		dispatch('reorderItem', { prevIndex, newIndex });
	}

	// Drag and drop handlers
	function handleDragStart(e) {
		if (!isReordering) return;
		isDragging = true;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
		e.target.style.opacity = '0.5';
	}

	function handleDragEnd(e) {
		isDragging = false;
		e.target.style.opacity = '1';
	}

	function handleDragOver(e) {
		if (!isReordering) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(e) {
		if (!isReordering) return;
		e.preventDefault();
		const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
		const dropIndex = index;

		if (draggedIndex !== dropIndex) {
			reorderItemHandler(draggedIndex, dropIndex);
		}
	}
	async function saveEditHandler() {
		try {
			// If cropping is active, save the crop first
			if (isCropping && cropperComponent) {
				try {
					// Call the cropper's save method if it exists
					if (cropperComponent.saveCrop) {
						await cropperComponent.saveCrop();
					}
				} catch (error) {
					console.warn('Cropper save method not available, continuing with regular save');
				}
			}

			// If drawing is active, save the drawing first
			if (isDrawing && drawingComponent) {
				try {
					// Call the drawing's save method if it exists
					if (drawingComponent.saveDrawing) {
						drawingComponent.saveDrawing();
						return; // Drawing save will trigger onSave which will handle the item save
					}
				} catch (error) {
					console.warn('Drawing save method not available, continuing with regular save');
				}
			}

			// Proceed with regular item save
			await performSave();
		} catch (error) {
			console.error('Error in saveEditHandler:', error);
			addToast({
				type: 'error',
				message: 'Failed to save changes. Please try again.'
			});
		}
	}

	async function performSave() {
		try {
			// Prepare the edit data in the format expected by the server
			const editData = {
				id: item.id,
				collection: collection?.category || item.category,
				author_id: $user.public_id,
				isUpdate: true // Required by server to use addItemToCollectionHelper path
			};

			// Only add fields that have values and are not undefined/null/empty
			if (item.question !== undefined && item.question !== null && item.question !== '') {
				editData.question = item.question;
			}
			if (item.answer !== undefined && item.answer !== null && item.answer !== '') {
				editData.answer = item.answer;
			}
			if (
				item.answers !== undefined &&
				item.answers !== null &&
				item.answerType !== AnswerType.SINGLE
			) {
				editData.answers = item.answers;
			}
			if (
				item.supplemental !== undefined &&
				item.supplemental !== null &&
				item.supplemental !== ''
			) {
				editData.supplemental = item.supplemental;
			}
			if (item.extra !== undefined && item.extra !== null && item.extra !== '') {
				editData.extra = item.extra;
			}
			if (item.image !== undefined && item.image !== null && item.image !== '') {
				editData.image = item.image;
			}
			if (item.audio !== undefined && item.audio !== null && item.audio !== '') {
				editData.audio = item.audio;
			}
			if (item.thumbnail !== undefined && item.thumbnail !== null && item.thumbnail !== '') {
				editData.thumbnail = item.thumbnail;
			}
			if (item.title !== undefined && item.title !== null && item.title !== '') {
				editData.title = item.title;
			}
			if (
				item.questionType !== undefined &&
				item.questionType !== null &&
				item.questionType !== ''
			) {
				editData.questionType = item.questionType;
			} else {
				if (item.image) {
					editData.questionType = QuestionType.IMAGE;
				} else if (item.audio) {
					editData.questionType = QuestionType.AUDIO;
				} else {
					editData.questionType = QuestionType.TEXT;
				}
			}

			if (item.answerType !== undefined && item.answerType !== null && item.answerType !== '') {
				editData.answerType = item.answerType;
			} else {
				if (item.answers) {
					if (item.correctAnswerIndex !== undefined && item.correctAnswerIndex !== null) {
						editData.answerType = AnswerType.MULTIPLE_CHOICE;
					} else {
						editData.answerType = AnswerType.MULTI_ANSWER;
					}
				} else {
					editData.answerType = AnswerType.SINGLE;
				}
			}

			if (item.numRequired !== undefined && item.numRequired !== null && item.numRequired !== '') {
				editData.numRequired = item.numRequired;
			}
			if (item.correctAnswerIndex !== undefined && item.correctAnswerIndex !== null) {
				editData.correctAnswerIndex = item.correctAnswerIndex;
			}

			if (editData && editData.id) {
				// Use the server's returned updated item as the source of truth
				dispatch('saveEdit', editData);
			}
			editableItemId = null;
		} catch (error) {
			console.error('Error saving edit:', error);
			addToast({
				type: 'error',
				message: 'Failed to save changes. Please try again.'
			});
		}
	}

	async function addItemMetaData(videoId) {
		try {
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${import.meta.env.VITE_GOOGLE_API_KEY}`
			);
			const data = await response.json();
			if (data.items && data.items.length > 0) {
				const snippet = data.items[0].snippet;
				const updatedItem = {
					...item,
					thumbnail: snippet.thumbnails?.medium?.url || '',
					title: snippet.title || ''
				};
				console.log('Updated item with metadata:', updatedItem);
				dispatch('saveEdit', updatedItem);
			} else {
				console.warn('No video data found for ID:', videoId);
			}
		} catch (err) {
			console.error('Error fetching video data:', err);
		}
	}

	async function uploadChangedImage(file, fileName = null) {
		try {
			// Set the originalname property on the file
			if (file && typeof file === 'object') {
				const defaultFileName = fileName || file.name || 'modified-image.jpg';
				file.originalname = defaultFileName;
			}

			// Create a temporary item object with the new file
			const tempItem = {
				...item,
				file: file,
				// Keep the existing answer
				answer: item.answer,
				// Add category from collection
				category: collection?.category || item.category,
				// Send the existing item ID for server validation
				existingItemId: item.id,
				// Flag this as an update operation
				isUpdate: true,
				// Include type information
				questionType: item.questionType || QuestionType.IMAGE,
				answerType: item.answerType || AnswerType.SINGLE
			};

			console.log('Temporary item for upload with existing ID validation:', tempItem);

			// Upload the new image with existing item ID for validation - use a new UUID but include update flags
			const result = await uploadData(tempItem, item.id, false);

			if (result && Array.isArray(result) && result.length > 0 && result[0]?.items) {
				// Use the server's returned updated item as the source of truth
				const updatedItem = result[0].items.find((i) => i.id === item.id);
				if (updatedItem) {
					// Add cache-busting parameter to image URL to force browser reload
					if (updatedItem.image && typeof updatedItem.image === 'string') {
						const cacheBreaker = `_=${Date.now()}`;
						const separator = updatedItem.image.includes('?') ? '&' : '?';
						updatedItem.image = updatedItem.image.split('?')[0] + separator + cacheBreaker;
					}

					// Update all item properties with the server's data
					Object.assign(item, updatedItem);

					addToast({
						type: 'success',
						message: 'Image updated successfully!'
					});

					// Dispatch the complete updated item
					dispatch('updateItem', updatedItem);
				}
			} else {
				console.warn('Upload result structure unexpected:', result);
				addToast({
					type: 'warning',
					message: 'Image uploaded but response format unexpected. Please refresh.'
				});
			}
		} catch (error) {
			console.error('Error updating image:', error);
			addToast({
				type: 'error',
				message: 'Failed to update image. Please try again.'
			});
		}
	}

	async function onCropped(event) {
		console.log('Cropped event received:', event);
		const croppedFile = event.detail;

		//get extension from type
		const fileExtension = croppedFile.type.split('/')[1] || 'png';

		await uploadChangedImage(croppedFile, 'cropped-image.' + fileExtension);
		isCropping = false; // Reset cropping state
	}

	async function onSave(event) {
		console.log('Drawing saved:', event);
		const { dataURL } = event.detail;

		// Convert dataURL to File object
		const response = await fetch(dataURL);
		const blob = await response.blob();
		const file = new File([blob], 'drawing.png', { type: 'image/png' });

		await uploadChangedImage(file, 'drawing.png');
		isDrawing = false; // Reset drawing state

		// After drawing save completes, save the item
		await performSave();
	}

	function onCancel() {
		console.log('Drawing cancelled');
		isCropping = false; // Reset cropping state
		isDrawing = false; // Reset drawing state
	}

	function isEditable(image) {
		if (!image || typeof image !== 'string') return false;

		console.log('Checking if ' + image + ' is editable');

		// Still raster image extensions (case insensitive)
		// Exclude known animated formats like gif
		const stillRasterExtensions = /\.(bmp|png|jpe?g|webp|latest)$/i;
		const animatedExtensions = /\.(gif|apng|svg)$/i; // svg is vector, usually not editable as raster

		try {
			const url = new URL(image);
			console.log('URL pathname:', url.pathname);
			const segments = url.pathname.split('/').reverse();
			console.log('Path segments:', segments);

			for (const segment of segments) {
				console.log('Checking segment:', segment);
				// If it matches an animated extension, return false immediately
				if (animatedExtensions.test(segment)) {
					console.log('Matched animated extension, returning false');
					return false;
				}

				if (stillRasterExtensions.test(segment)) {
					console.log('Matched raster extension, returning true');
					return true;
				}
			}
		} catch (error) {
			console.log('URL parsing failed, using fallback:', error);
			// Fallback for non-URL strings
			const segments = image.split('?')[0].split('#')[0].split('/').reverse();
			console.log('Fallback segments:', segments);

			for (const segment of segments) {
				console.log('Checking fallback segment:', segment);
				if (animatedExtensions.test(segment)) {
					console.log('Fallback matched animated extension, returning false');
					return false;
				}

				if (stillRasterExtensions.test(segment)) {
					console.log('Fallback matched raster extension, returning true');
					return true;
				}
			}
		}

		// If no file extension found, assume it's editable (for blob URLs, cloud storage URLs, etc.)
		// This is safer than blocking all images without clear extensions
		console.log('No extension found, defaulting to true');
		return true;
	}
</script>

<li
	class="d-flex {isReordering ? 'item reorder' : 'item'} {isDragging ? 'dragging' : ''}"
	draggable={isReordering}
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
	on:dragover={handleDragOver}
	on:drop={handleDrop}
>
	{#if editableItemId === item.id && item.id != null}
		<div class="editing">
			{#if (item.type === 'image' || item.type === 'default') && item.url}
				{#if !isCropping && !isDrawing}
					<img src={item.url} alt="To crop" class="border" />
					<div class="actions">
						{#if isEditable(item.image)}
							<button class="btn btn-image-action me-2" on:click={() => (isCropping = true)}
								>Crop</button
							>
							<button class="btn btn-image-action" on:click={() => (isDrawing = true)}>Edit</button>
						{/if}
					</div>
				{:else if isCropping}
					<div class="cropper-section mb-3">
						<Cropper
							bind:this={cropperComponent}
							src={item.image}
							on:cropped={onCropped}
							on:cancel={onCancel}
						/>
					</div>
				{:else if isDrawing}
					<div class="drawing-section mb-3">
						<Drawing
							bind:this={drawingComponent}
							src={item.image}
							on:save={onSave}
							on:cancel={onCancel}
						/>
					</div>
				{/if}
			{/if}
			{#if item.questionType == QuestionType.TEXT}
				<div class="form-group mb-3">
					<input
						id="editedQuestion"
						type="text"
						bind:value={item.question}
						placeholder="Enter a question"
						class="form-control"
					/>
				</div>
			{:else if item.audio != null}
				<div class="form-group mb-3">
					<input
						id="editedAudio"
						type="text"
						bind:value={item.audio}
						placeholder="Enter an audio URL"
						class="form-control"
					/>
				</div>
			{/if}
			<div class="form-group mb-3">
				<textarea
					bind:value={item.supplemental}
					placeholder="Before answer is revealed"
					class="form-control"
				></textarea>
			</div>
			<div class="form-group mb-3">
				<AnswerInput {item} idPrefix="edit-{item.id}" label="Answer:" />
			</div>
			<div class="form-group mb-4">
				<input
					id="editedExtra"
					type="text"
					bind:value={item.extra}
					placeholder="After answer is revealed"
					class="form-control"
				/>
			</div>
			{#if !isCropping && !isDrawing}
				<div class="edit-actions d-flex gap-2">
					<button class="btn btn-success" on:click={saveEditHandler}
						><Fa icon={faFloppyDisk} /></button
					>
					<button class="btn btn-danger" on:click={(editableItemId = null)}
						><Fa icon={faBan} /></button
					>
				</div>
			{/if}
		</div>
	{:else}
		<div class="item-display d-flex gap-3 h-100">
			<div class="content-section flex-half d-flex flex-column">
				<div class="media-content">
					{#if (item.type === 'image' || item.type === 'default') && item.url}
						<img class="preview" src={item.url} alt="Preview" />
					{:else if item.audio != null}
						<div class="audio">
							{#if item.thumbnail}
								<img src={item.thumbnail} alt={item.answer} />
								<p>{item.title || item.answer}</p>
							{:else}
								<button on:click={() => addItemMetaData(item.audio)}>
									<Fa icon={faPenToSquare} />Update Data</button
								>
							{/if}
						</div>
					{:else}
						<span class="question">{item.question}</span>
					{/if}
				</div>
				{#if item.supplemental}
					<div class="supplemental-content">
						<span>{item.supplemental}</span>
					</div>
				{/if}
			</div>
			<div class="answer-section flex-half d-flex flex-column">
				<div class="answer-display">
					<span>Answer Type: {item.answer_type}</span>
					{#if item.answer_type === AnswerType.SINGLE || !isValidAnswerType(item.answer_type)}
						<span class="answer-text">{item.answer}</span>
					{:else if item.answer_type === AnswerType.MULTIPLE_CHOICE}
						<small class="text-muted mb-2">Multiple Choice:</small>
						{#each item.answer || [] as answer, index (index)}
							<span class="answer-option" class:correct={item.correctAnswerIndex === index}>
								{index + 1}. {answer}
								{#if item.correctAnswerIndex === index}✓{/if}
							</span>
						{/each}
					{:else}
						<small class="text-muted mb-2"
							>Multi-Answer (Required: {item.num_required ||
								(item.answer && item.answer.length) ||
								0}):</small
						>
						{#each item.answer || [] as a, index (index)}
							<span class="answer-option">{index + 1}. {a}</span>
						{/each}
					{/if}
				</div>
				{#if item.extra}
					<div class="extra-content">
						<span class="extra-text">{item.extra}</span>
					</div>
				{/if}
			</div>
			{#if isReordering}
				<div class="action-buttons reorder-actions">
					<button
						class="btn btn-outline-primary btn-sm"
						on:click={() => reorderItemHandler(index, index - 1)}
					>
						<Fa icon={faChevronUp} />
					</button>
					<button
						class="btn btn-outline-primary btn-sm"
						on:click={() => reorderItemHandler(index, index + 1)}
					>
						<Fa icon={faChevronDown} />
					</button>
				</div>
			{:else}
				<div class="action-buttons edit-actions">
					<button
						class="btn btn-outline-secondary btn-sm"
						on:click={() => (editableItemId = item.id)}
					>
						<Fa icon={faPenToSquare} />
					</button>
					<button class="btn btn-outline-danger btn-sm" on:click={() => removeItemHandler()}>
						<Fa icon={faTrashCan} />
					</button>
				</div>
			{/if}
		</div>
	{/if}
</li>

<style>
	.item {
		padding: 0.25rem;
		margin-bottom: 1rem;
	}

	.editing {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 1rem;
		margin-bottom: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.image-section img {
		max-width: 100%;
		height: auto;
		border-radius: 0.375rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-control {
		padding: 0.5rem;
		border: 1px solid #ced4da;
		/* border-radius: 0.375rem; */
		font-size: 0.9rem;
	}

	.form-control:focus {
		border-color: #007bff;
		box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
		outline: none;
	}

	.edit-actions {
		justify-content: flex-end;
	}

	.item-display {
		width: 100%;
		align-items: stretch;
	}

	.content-section {
		min-height: 0;
	}

	.media-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.preview {
		max-width: 100%;
		max-height: 200px;
		height: auto;
		border-radius: 0.375rem;
		body-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.question {
		font-weight: 600;
		font-size: 1.1rem;
		color: #495057;
	}

	.supplemental-content {
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 0.375rem;
		font-style: italic;
		color: #6c757d;
	}

	.answer-section {
		min-height: 0;
	}

	.answer-display {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.answer-text {
		font-weight: 600;
		font-size: 1rem;
		color: #28a745;
		padding: 0.5rem;
		background: #d4edda;
		border-radius: 0.375rem;
	}

	.answer-option {
		padding: 0.5rem 0.75rem;
		background: #f8f9fa;
		border-radius: 0.375rem;
		font-size: 0.9rem;
		border: 1px solid #e9ecef;
	}

	.answer-option.correct {
		background: #d4edda;
		color: #155724;
		font-weight: 600;
		border-color: #c3e6cb;
	}

	.extra-content {
		padding: 0.75rem;
		background: #e7f3ff;
		border-radius: 0.375rem;
		border-left: 4px solid #007bff;
	}

	.extra-text {
		font-style: italic;
		color: #495057;
	}

	.action-buttons {
		flex-shrink: 0;
		align-self: flex-start;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-left: auto;
	}

	.btn {
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.15s ease-in-out;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-image-action {
		background-color: #6c757d;
		color: white;
		border: 1px solid #5a6268;
		font-weight: 500;
	}

	.btn-image-action:hover {
		background-color: #5a6268;
		border-color: #4e555b;
		color: white;
	}

	.btn-success {
		background-color: #28a745;
		color: white;
		border: 1px solid #28a745;
		font-weight: 500;
	}

	.btn-success:hover {
		background-color: #218838;
		border-color: #1e7e34;
		color: white;
	}

	.btn-danger {
		background-color: #dc3545;
		color: white;
		border: 1px solid #dc3545;
		font-weight: 500;
	}

	.btn-danger:hover {
		background-color: #c82333;
		border-color: #bd2130;
		color: white;
	}

	@media (max-width: 768px) {
		.item-display {
			flex-direction: column;
			gap: 1rem;
		}

		.action-buttons {
			flex-direction: row;
			justify-content: center;
			align-self: center;
			margin-left: 0;
			gap: 1rem;
		}

		.content-section,
		.answer-section {
			flex: none;
		}
	}

	.reorder {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25) !important;
		transform: translateY(-2px);
		transition: all 0.3s ease;
		cursor: grab;
		border-radius: 0.5rem;
		background: #ffffff;
		z-index: 10;
		position: relative;
	}

	.reorder:hover {
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3) !important;
		transform: translateY(-4px);
	}

	.reorder:active {
		cursor: grabbing;
		transform: scale(1.02) translateY(-6px);
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35) !important;
	}

	/* Shrink content when reordering */
	.reorder .item-display {
		padding: 0.5rem;
		font-size: 0.85rem;
	}

	.reorder .preview {
		max-height: 100px;
		max-width: 120px;
	}

	.reorder .question {
		font-size: 0.9rem;
		line-height: 1.3;
	}

	.reorder .answer-text {
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem;
	}

	.reorder .answer-option {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
	}

	.reorder .supplemental-content {
		padding: 0.5rem;
		font-size: 0.75rem;
	}

	.reorder .extra-content {
		padding: 0.5rem;
		font-size: 0.75rem;
	}

	.reorder .action-buttons {
		gap: 0.25rem;
	}

	.reorder .btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}

	.dragging {
		opacity: 0.5 !important;
		transform: rotate(2deg) !important;
	}

	.reorder:hover {
		background: #f8f9fa;
	}
</style>
