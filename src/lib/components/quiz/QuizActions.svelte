<script>
	import Fa from 'svelte-fa';
	import { faFlag, faArrowUp } from '@fortawesome/free-solid-svg-icons';
	import { createEventDispatcher } from 'svelte';

	export let currentMode;
	export let isComplete;
	export let onCompleteQuiz;
	export let isPartyMode = false;

	const dispatch = createEventDispatcher();
</script>

{#if !isPartyMode && !isComplete}
	<div class="py-3" style="display: flex; gap: 4px; flex-direction: column;">
		<button
			class="give-up"
			on:click={() => {
				console.log('Give up clicked');
				onCompleteQuiz();
				dispatch('giveup');
			}}
		>
			<span>Give Up <Fa icon={faFlag} style="margin-left: 0.5rem" /></span>
		</button>
		<button class="scroll-to-top" on:click={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
			<span>Scroll to Top <Fa icon={faArrowUp} style="margin-left: 0.5rem" /></span>
		</button>
	</div>
{/if}
