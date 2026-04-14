<script>
	import Fa from 'svelte-fa';
	import {
		faEyeSlash,
		faEye,
		faTableCells,
		faList,
		faExpand,
		faCompress,
		faPencil
	} from '@fortawesome/free-solid-svg-icons';

	import { quiz } from '$store/quiz.js';

	$: cards = $quiz.cards || [];
	$: isGrid = $quiz.isGrid;
	$: isFullscreen = $quiz.isFullscreen;
	$: showEditButton = $quiz.canEditCollection;
	$: areAnyCardsRevealed = cards.some((card) => card?.revealed);

	function toggleRevealAll() {
		quiz.setCards(
			cards.map((card) => ({
				...card,
				revealed: !areAnyCardsRevealed
			}))
		);
	}

	function editCollection() {
		// if you have a store action:
		quiz.setEditing?.(true);
	}

	function goFullscreen() {
		if (isGrid) quiz.toggleGrid();

		quiz.setFullscreen(true);

		const container = document.querySelector('.container');
		container?.requestFullscreen?.() ||
			container?.webkitRequestFullscreen?.() ||
			container?.msRequestFullscreen?.();
	}

	function exitFullscreen() {
		quiz.setFullscreen(false);

		quiz.setCards(cards.map((card) => ({ ...card, scale: 1 })));

		document.exitFullscreen?.() ||
			document.webkitExitFullscreen?.() ||
			document.msExitFullscreen?.();
	}

	function toggleFullscreen() {
		isFullscreen ? exitFullscreen() : goFullscreen();
	}
</script>

<div class="toolbar">
	<button
		on:click={toggleRevealAll}
		title={areAnyCardsRevealed ? 'Hide all cards' : 'Reveal all cards'}
	>
		<Fa icon={areAnyCardsRevealed ? faEyeSlash : faEye} />
	</button>
	{#if !isFullscreen}
		<button
			on:click={quiz.toggleGrid}
			title={isGrid ? 'Switch to list view' : 'Switch to grid view'}
		>
			<Fa icon={isGrid ? faList : faTableCells} />
		</button>
	{/if}
	<button on:click={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
		<Fa icon={isFullscreen ? faCompress : faExpand} />
	</button>
	{#if showEditButton}
		<button on:click={editCollection} title="Edit this quiz">
			<Fa icon={faPencil} />
		</button>
	{/if}
</div>
