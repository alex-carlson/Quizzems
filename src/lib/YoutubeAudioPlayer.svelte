<script>
	import { onMount, onDestroy } from 'svelte';
	import Fa from 'svelte-fa';
	import { faPlayCircle, faPauseCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
	import { youtubePlayerService } from './api/youtubePlayerService.js';
	import { addToast } from '../store/toast.js';

	export let id;
	export let videoId;

	let playerEl;

	let isPlaying = false;
	let playerReady = false;
	let isLoading = false;
	let duration = 0;
	let currentTime = 0;
	let progress = 0;
	let isCurrentVideo = false;
	let unsubscribe;
	let error = null;

	const isFirefox =
		typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');

	export async function play() {
		try {
			await youtubePlayerService.togglePlay(videoId, playerEl, id);
		} catch (err) {
			addToast({
				type: 'error',
				message: `Failed to play video: ${err.message || 'Unknown error'}`
			});
		}
	}

	export async function stop() {
		try {
			await youtubePlayerService.pause();
		} catch (err) {
			addToast({
				type: 'error',
				message: `Failed to play video: ${err.message || 'Unknown error'}`
			});
		}
	}

	async function handleButtonClick() {
		try {
			if (!isCurrentVideo || error) {
				if (error) {
					youtubePlayerService.clearError?.();
				}

				await youtubePlayerService.togglePlay(videoId, playerEl, id);
			} else {
				await youtubePlayerService.togglePlay(videoId, playerEl, id);
			}
		} catch (error) {
			addToast({
				type: 'error',
				message: `Failed to play video: ${error.message || 'Unknown error'}`
			});
		}
	}

	function seek(e) {
		if (!isCurrentVideo || !playerReady) return;

		let progressBar = e.target;
		if (!progressBar.classList.contains('progress-bar-container')) {
			progressBar = progressBar.closest('.progress-bar-container');
		}

		if (!progressBar) return;

		const rect = progressBar.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));

		youtubePlayerService.seek(percent);
	}

	function handleProgressKeydown(e) {
		if (!isCurrentVideo || !playerReady) return;

		let newPercent = isCurrentVideo ? progress : 0;

		switch (e.key) {
			case 'ArrowLeft':
				newPercent = Math.max(0, newPercent - 5);
				break;
			case 'ArrowRight':
				newPercent = Math.min(100, newPercent + 5);
				break;
			case 'Home':
				newPercent = 0;
				break;
			case 'End':
				newPercent = 100;
				break;
			case 'Enter':
			case ' ':
				seek(e);
				return;
			default:
				return;
		}
		e.preventDefault();
		youtubePlayerService.seek(newPercent);
	}

	function formatTime(sec) {
		if (!sec || isNaN(sec)) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60)
			.toString()
			.padStart(2, '0');
		return `${m}:${s}`;
	}

	onMount(async () => {
		unsubscribe = youtubePlayerService.subscribe((state) => {
			playerReady = state.playerReady;
			isLoading = state.isLoading;
			isPlaying = state.isPlaying;
			isCurrentVideo = state.currentVideoId === videoId && state.currentInstanceId === id;
			error = state.error;

			if (isCurrentVideo) {
				currentTime = state.currentTime;
				progress = state.progress;
				duration = state.duration;
			}
		});

		if (typeof window !== 'undefined') {
			await youtubePlayerService.initializeAPI();
		}
	});

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

<div bind:this={playerEl} style="display: none;"></div>

<div class="player-container p-3">
	{#if !playerReady}
		<span>Loading...</span>
	{:else}
		<div class="controls">
			<button
				on:click={handleButtonClick}
				on:touchstart|preventDefault={handleButtonClick}
				on:touchend|preventDefault
				on:mousedown|preventDefault={isFirefox ? handleButtonClick : undefined}
				disabled={!playerReady || (error && isCurrentVideo)}
				style="touch-action: manipulation;"
			>
				{#if error && isCurrentVideo}
					<Fa icon={faPlayCircle} style="color: #dc3545;" />
				{:else if isLoading && isCurrentVideo}
					<Fa icon={faSpinner} spin />
				{:else if !isCurrentVideo}
					<Fa icon={faPlayCircle} />
				{:else if isCurrentVideo && isPlaying}
					<Fa icon={faPauseCircle} />
				{:else}
					<Fa icon={faPlayCircle} />
				{/if}
			</button>

			<div
				class="progress-bar-container"
				on:click={seek}
				on:keydown={handleProgressKeydown}
				role="slider"
				tabindex="0"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={isCurrentVideo ? Math.round(progress) : 0}
				aria-label="Video progress"
			>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill" style="width: {isCurrentVideo ? progress : 0}%"></div>
				</div>
			</div>
		</div>

		{#if error && isCurrentVideo}
			<div class="error-message" style="color: #dc3545; font-size: 0.875rem; margin-top: 0.5rem;">
				{error}
			</div>
		{/if}

		<span class="progress-time">
			{formatTime(isCurrentVideo ? currentTime : 0)} /
			{formatTime(isCurrentVideo ? duration : 0)}
		</span>
	{/if}
</div>
