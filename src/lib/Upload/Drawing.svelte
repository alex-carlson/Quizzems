<script>
	import Fa from 'svelte-fa';
	import {
		faUndo,
		faCancel,
		faCheck,
		faEraser,
		faEyedropper,
		faFloppyDisk,
		faPencil,
		faSquare
	} from '@fortawesome/free-solid-svg-icons';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let src; // Image source passed into the component
	let canvas;
	let ctx;
	let image = new Image();
	let drawing = false;
	let eyedropping = false;
	let erasing = false;
	let drawingRect = false;
	let color = '#000000';
	let width = 10;

	let lastX = 0;
	let lastY = 0;
	let rectStartX = 0;
	let rectStartY = 0;
	let tempCanvas = null; // For preview while dragging

	// Track previous tool state for eyedropper
	let previousToolState = {
		erasing: false,
		drawingRect: false
	};

	let removingBackground = false;
	const undoStack = []; // Stack to keep track of undo actions

	function saveState() {
		if (!canvas) return;
		undoStack.push(canvas.toDataURL('image/png'));
	}

	// Load image and draw it on the canvas
	function drawImageToCanvas() {
		canvas.width = image.width;
		canvas.height = image.height;
		ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.lineWidth = width;
	}

	image.onload = drawImageToCanvas;
	image.crossOrigin = 'anonymous'; // Enable CORS for image loading
	onMount(() => {
		if (src) {
			// Set crossOrigin before setting src
			image.crossOrigin = 'anonymous';
			image.src = src;
		}
	});

	function startDrawing(x, y) {
		saveState(); // Save the current state before starting a new drawing
		drawing = true;
		[lastX, lastY] = [x, y];

		if (drawingRect) {
			[rectStartX, rectStartY] = [x, y];
			// Create temporary canvas for preview
			if (!tempCanvas) {
				tempCanvas = document.createElement('canvas');
			}
			tempCanvas.width = canvas.width;
			tempCanvas.height = canvas.height;
			const tempCtx = tempCanvas.getContext('2d');
			tempCtx.drawImage(canvas, 0, 0);
		}
	}
	function draw(x, y) {
		if (!drawing) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		if (drawingRect) {
			// Clear canvas and restore original image
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(tempCanvas, 0, 0);

			// Draw preview rectangle
			const rectWidth = x - rectStartX;
			const rectHeight = y - rectStartY;

			ctx.fillStyle = color;
			ctx.fillRect(rectStartX, rectStartY, rectWidth, rectHeight);
			return;
		}

		if (erasing) {
			// Use destination-out composite operation to erase
			ctx.globalCompositeOperation = 'destination-out';
			ctx.strokeStyle = 'rgba(0,0,0,1)'; // Color doesn't matter for erasing
		} else {
			// Normal drawing
			ctx.globalCompositeOperation = 'source-over';
			ctx.strokeStyle = color;
		}

		ctx.lineWidth = width * scaleX; // Adjust line width based on canvas scaling
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();
		[lastX, lastY] = [x, y];
	}

	function endDrawing() {
		if (drawingRect && drawing) {
			// Rectangle is complete, no need to do anything special
			// The final rectangle is already drawn on the canvas
			tempCanvas = null;
		}
		drawing = false;
		// Reset composite operation to normal
		ctx.globalCompositeOperation = 'source-over';
	}
	function toggleEyedropper() {
		if (!eyedropping) {
			// Save current tool state before activating eyedropper
			previousToolState = {
				erasing: erasing,
				drawingRect: drawingRect
			};
		}

		eyedropping = !eyedropping;
		erasing = false;
		drawingRect = false;
		if (eyedropping) {
			canvas.style.cursor = 'crosshair';
		} else {
			canvas.style.cursor = 'default';
		}
	}

	function toggleEraser() {
		erasing = !erasing;
		eyedropping = false;
		drawingRect = false;
		if (erasing) {
			canvas.style.cursor = 'crosshair';
		} else {
			canvas.style.cursor = 'default';
		}
	}

	function toggleRectangle() {
		drawingRect = !drawingRect;
		eyedropping = false;
		erasing = false;
		if (drawingRect) {
			canvas.style.cursor = 'crosshair';
		} else {
			canvas.style.cursor = 'default';
		}
	}
	function pickColor(x, y) {
		saveState(); // Save the current state before picking color
		try {
			const imageData = ctx.getImageData(x, y, 1, 1);
			const pixel = imageData.data;
			const r = pixel[0];
			const g = pixel[1];
			const b = pixel[2];
			color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

			// Turn off eyedropper and restore previous tool
			eyedropping = false;
			erasing = previousToolState.erasing;
			drawingRect = previousToolState.drawingRect;

			// Update cursor based on restored tool
			if (drawingRect || erasing) {
				canvas.style.cursor = 'crosshair';
			} else {
				canvas.style.cursor = 'default';
			}
		} catch (error) {
			console.error('Cannot pick color from cross-origin image:', error);
			// Fallback: just turn off eyedropper and restore previous tool
			eyedropping = false;
			erasing = previousToolState.erasing;
			drawingRect = previousToolState.drawingRect;

			if (drawingRect || erasing) {
				canvas.style.cursor = 'crosshair';
			} else {
				canvas.style.cursor = 'default';
			}
			alert(
				'Cannot pick color from this image due to security restrictions. Please use the color picker instead.'
			);
		}
	}

	function floodFillRemove(startX, startY, threshold = 30) {
		saveState(); // Save the current state before removing background
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;

		const width = canvas.width;
		const height = canvas.height;

		const index = (x, y) => (y * width + x) * 4;

		// Get target color
		const i = index(startX, startY);
		const target = [data[i], data[i + 1], data[i + 2]];

		const visited = new Uint8Array(width * height);
		const stack = [[startX, startY]];

		const colorDistance = (r1, g1, b1, r2, g2, b2) =>
			Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

		while (stack.length) {
			const [x, y] = stack.pop();
			const idx = index(x, y);

			if (x < 0 || x >= width || y < 0 || y >= height) continue;
			if (visited[y * width + x]) continue;

			const r = data[idx];
			const g = data[idx + 1];
			const b = data[idx + 2];

			if (colorDistance(r, g, b, ...target) < threshold) {
				// Make transparent
				data[idx + 3] = 0;

				stack.push([x + 1, y]);
				stack.push([x - 1, y]);
				stack.push([x, y + 1]);
				stack.push([x, y - 1]);
			}

			visited[y * width + x] = 1;
		}

		ctx.putImageData(imageData, 0, 0);
	}
	// Mouse events
	function handleMouseDown(e) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = Math.floor((e.clientX - rect.left) * scaleX);
		const y = Math.floor((e.clientY - rect.top) * scaleY);

		if (eyedropping) {
			pickColor(x, y);
		} else if (removingBackground) {
			floodFillRemove(x, y);
		} else {
			// Normal drawing, erasing, or rectangle
			startDrawing(x, y);
		}
	}

	function handleMouseMove(e) {
		if (eyedropping) return; // Don't draw when eyedropper is active

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;
		draw(x, y);
	}
	// Touch events
	function getTouchPos(touch) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return {
			x: (touch.clientX - rect.left) * scaleX,
			y: (touch.clientY - rect.top) * scaleY
		};
	}
	function handleTouchStart(e) {
		e.preventDefault();
		const touch = e.touches[0];
		const pos = getTouchPos(touch);

		if (eyedropping) {
			pickColor(pos.x, pos.y);
		} else if (removingBackground) {
			floodFillRemove(Math.floor(pos.x), Math.floor(pos.y));
			removingBackground = false;
		} else {
			// Normal drawing, erasing, or rectangle
			startDrawing(pos.x, pos.y);
		}
	}

	function handleTouchMove(e) {
		if (eyedropping) return; // Don't draw when eyedropper is active

		e.preventDefault();
		const touch = e.touches[0];
		const pos = getTouchPos(touch);
		draw(pos.x, pos.y);
	}

	function handleTouchEnd() {
		endDrawing();
	}

	function undo() {
		if (undoStack.length === 0) return;
		const lastState = undoStack.pop();
		const img = new Image();
		img.onload = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0);
		};
		img.src = lastState;
	}

	function saveDrawing() {
		// dispatch a custom event to notify parent component
		const dataURL = canvas.toDataURL('image/webp', 0.6);
		dispatch('save', { dataURL });
	}
	function cancelDrawing() {
		console.log('Drawing cancelled');
		// dispatch a custom event to notify parent component
		dispatch('cancel');
	}
</script>

<div class="drawing-padding-wrapper">
	<div class="drawing-container">
		<div class="container py-3 drawing-controls">
			<h4 class="mb-3">Tools</h4>
			<!-- Tool Buttons -->
			<div class="row mb-3">
				<div class="col-12 drawing-tool-buttons">
					<button
						type="button"
						class="btn btn-outline-secondary"
						on:click={() => {
							eyedropping = false;
							erasing = false;
							drawingRect = false;
							// Clear previous tool state when explicitly selecting draw
							previousToolState = { erasing: false, drawingRect: false };
							canvas && (canvas.style.cursor = 'default');
						}}
						class:active={!eyedropping && !erasing && !drawingRect}
					>
						<Fa icon={faPencil} /> Draw
					</button>

					<button
						type="button"
						class="btn btn-outline-secondary"
						on:click={toggleRectangle}
						class:active={drawingRect}
					>
						<Fa icon={faSquare} /> Rectangle
					</button>

					<button
						type="button"
						class="btn btn-outline-secondary"
						on:click={toggleEraser}
						class:active={erasing}
					>
						<Fa icon={faEraser} /> Erase
					</button>

					<button
						type="button"
						class="btn btn-outline-secondary"
						on:click={toggleEyedropper}
						class:active={eyedropping}
					>
						<Fa icon={faEyedropper} /> Pick Color
					</button>
					<button
						type="button"
						class="btn btn-outline-secondary"
						on:click={() => {
							removingBackground = !removingBackground;
						}}
					>
						{#if removingBackground}
							<Fa icon={faCheck} /> Confirm Background
						{:else}
							<Fa icon={faEraser} />Remove Background
						{/if}
					</button>
				</div>
			</div>

			<!-- Color and Brush Size -->
			<div class="row mb-3" style="height: 50px;">
				<div class="col-12 d-flex align-items-center gap-3 flex-wrap">
					<label class="d-flex align-items-center gap-2 m-0">
						Color:
						<input
							type="color"
							bind:value={color}
							style="
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            border: 1px solid black;
                            padding: 0;
                            appearance: none;
                            cursor: pointer;
                        "
						/>
					</label>

					<label class="d-flex align-items-center gap-2 m-0">
						Brush Size:
						<input type="range" min="1" max="200" bind:value={width} />
						<span>{width}px</span>
					</label>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="row">
				<div class="col-12 drawing-action-buttons">
					<button type="button" class="btn btn-gray-action" on:click={undo}
						><Fa icon={faUndo} />Undo</button
					>
				</div>
			</div>
		</div>

		<canvas
			class="my-3"
			bind:this={canvas}
			on:mousedown={handleMouseDown}
			on:mousemove={handleMouseMove}
			on:mouseup={endDrawing}
			on:mouseleave={endDrawing}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
		/>

		<!-- Save/Cancel Buttons -->
		<div class="drawing-actions drawing-action-buttons mt-3">
			<button type="button" class="btn btn-success" on:click={saveDrawing}
				><Fa icon={faFloppyDisk} />Save</button
			>
			<button type="button" class="btn btn-danger" on:click={cancelDrawing}
				><Fa icon={faCancel} />Cancel</button
			>
		</div>
	</div>
</div>

<style>
	/* Responsive tool buttons */
	.drawing-tool-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		flex-direction: row;
	}
	.drawing-action-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
		flex-direction: row;
	}
	@media (max-width: 500px) {
		.drawing-tool-buttons,
		.drawing-action-buttons {
			flex-direction: column;
			gap: 12px;
			align-items: stretch;
		}
		.drawing-tool-buttons button,
		.drawing-action-buttons button {
			width: 100%;
			min-width: 0;
			font-size: 1rem;
			padding: 0.75rem 1rem;
		}
	}
	.drawing-padding-wrapper {
		width: 100%;
		max-width: 100vw;
		display: flex;
		flex-direction: column;
		overflow: auto;
		position: relative;
	}
	.drawing-padding-top,
	.drawing-padding-bottom {
		width: 100vw;
		height: 60px;
		flex-shrink: 0;
		background: transparent;
		z-index: 10;
		touch-action: pan-y;
	}
	.drawing-padding-left,
	.drawing-padding-right {
		height: 100%;
		width: 24px;
		flex-shrink: 0;
		background: transparent;
		z-index: 10;
		position: absolute;
		top: 60px;
		bottom: 60px;
		touch-action: pan-x;
	}
	.drawing-padding-left {
		left: 0;
		border-right: 1px solid #eee;
	}
	.drawing-padding-right {
		right: 0;
		border-left: 1px solid #eee;
	}
	.drawing-padding-top {
		border-bottom: 1px solid #eee;
	}
	.drawing-padding-bottom {
		border-top: 1px solid #eee;
	}
	canvas {
		border: 1px solid #ccc;
		touch-action: none;
		max-width: 100%;
		display: block;
	}

	.drawing-container {
		background-color: #dadada;
	}

	.drawing-controls {
		display: flex;
		gap: 15px;
		align-items: center;
		flex-wrap: wrap;
	}
	.drawing-controls label {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 14px;
	}

	.btn-gray-action {
		background-color: #6c757d;
		color: white;
		border: 1px solid #5a6268;
		font-weight: 500;
		transition: all 0.15s ease-in-out;
	}

	.btn-gray-action:hover {
		background-color: #5a6268;
		border-color: #4e555b;
		color: white;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.drawing-controls button.active {
		background-color: #007bff;
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
</style>
