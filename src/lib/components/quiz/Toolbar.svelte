<script>
	import Fa from 'svelte-fa';
	import {
		faShuffle,
		faEyeSlash,
		faEye,
		faTableCells,
		faList,
		faExpand,
		faCompress,
		faRotateBack,
		faPencil
	} from '@fortawesome/free-solid-svg-icons';
	import { createEventDispatcher } from 'svelte';

	// Props for state
	export let cards = [];
	export let isGrid = false;
	export let isFullscreen = false;
	export let shuffleTrigger = 0;
	export let showEditButton = false;

	// Computed values
	$: areAnyCardsRevealed = cards.some((card) => card?.revealed);
	$: canReset = cards.some((card) => card?.scale !== 1 || card?.hidden);

	const dispatch = createEventDispatcher();

	// Toolbar functions
	function shuffleCards() {
		const newCards = [...cards];
		for (let i = newCards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[newCards[i], newCards[j]] = [newCards[j], newCards[i]];
		}

		dispatch('update', {
			cards: newCards,
			shuffleTrigger: shuffleTrigger + 1
		});
	}

	function toggleRevealAll() {
		const newCards = cards.map((card) => ({
			...card,
			revealed: !areAnyCardsRevealed
		}));

		dispatch('update', { cards: newCards });
	}

	function resetCards() {
		const newCards = cards.map((card) => ({
			...card,
			hidden: false,
			scale: 1
		}));

		dispatch('update', { cards: newCards });
	}

	function toggleGrid() {
		dispatch('update', { isGrid: !isGrid });
	}

	function toggleFullscreen() {
		if (isFullscreen) {
			exitFullscreen();
		} else {
			goFullscreen();
		}
	}

	function editCollection() {
		dispatch('edit');
	}
	function goFullscreen() {
		// Exit grid mode when going fullscreen
		const updates = { isFullscreen: true };
		if (isGrid) {
			updates.isGrid = false;
		}

		dispatch('update', updates);

		const container = document.querySelector('.container');
		if (container?.requestFullscreen) {
			container.requestFullscreen();
		}
		// @ts-ignore - Legacy browser support
		else if (container?.webkitRequestFullscreen) {
			// @ts-ignore
			container.webkitRequestFullscreen();
		}
		// @ts-ignore - Legacy browser support
		else if (container?.msRequestFullscreen) {
			// @ts-ignore
			container.msRequestFullscreen();
		}
	}

	function exitFullscreen() {
		// Reset image scales when exiting fullscreen
		const newCards = cards.map((card) => ({ ...card, scale: 1 }));

		dispatch('update', {
			isFullscreen: false,
			cards: newCards
		});

		if (document.exitFullscreen) {
			document.exitFullscreen();
		}
		// @ts-ignore - Legacy browser support
		else if (document.webkitExitFullscreen) {
			// @ts-ignore
			document.webkitExitFullscreen();
		}
		// @ts-ignore - Legacy browser support
		else if (document.msExitFullscreen) {
			// @ts-ignore
			document.msExitFullscreen();
		}
	}
</script>

<div class="toolbar">
	<button on:click={shuffleCards} title="Shuffle cards">
		<Fa icon={faShuffle} />
	</button>
	<button
		on:click={toggleRevealAll}
		title={areAnyCardsRevealed ? 'Hide all cards' : 'Reveal all cards'}
	>
		<Fa icon={areAnyCardsRevealed ? faEyeSlash : faEye} />
	</button>
	{#if canReset}
		<button on:click={resetCards} title="Reset card positions and scales">
			<Fa icon={faRotateBack} />
		</button>
	{/if}
	{#if !isFullscreen}
		<button on:click={toggleGrid} title={isGrid ? 'Switch to list view' : 'Switch to grid view'}>
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
