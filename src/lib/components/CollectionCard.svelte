<script>
	import { formatTimestamp } from '$lib/api/utils.js';
	import { goto } from '$app/navigation';
	import { fetchUser } from '$lib/api/user';
	import { addToast } from '$store/toast';
	import { createEventDispatcher } from 'svelte';
	import LazyLoadImage from '$lib/LazyLoadImage.svelte';
	import {
		faEye,
		faEyeSlash,
		faChartSimple,
		faCalendar,
		faPencil,
		faPlus,
		faCheck
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';

	export let collection = null;
	export let selected = false;
	export let onNavigate = null;
	export let showTags = false;
	export let showAuthor = false;
	export let showIsVisible = false;
	export let showDate = true;
	export let showAdd = false;
	export let compact = false;

	const dispatch = createEventDispatcher();
	let isNavigating = false;

	$: tagCount = collection?.tags ? collection.tags.split(',').length : 0;

	async function defaultGotoPageWithState(author_id, slug) {
		let author_slug;
		try {
			const user = await fetchUser(author_id);
			author_slug = user.username_slug || user.username || 'unknown-author';
		} catch (error) {
			console.error('Error fetching user for navigation:', error);
			author_slug = 'unknown-author';
		}
		await goto(`/quiz/${author_slug}/${slug}`, { state: { collectionId: collection.id } });
	}

	async function handleNavigation() {
		if (isNavigating) return;
		isNavigating = true;
		try {
			if (onNavigate) {
				await onNavigate(collection);
			} else {
				await defaultGotoPageWithState(collection.author_public_id, collection.slug);
			}
		} catch (error) {
			console.error('Error opening quiz:', error);
			addToast({ type: 'error', message: 'Unable to open quiz. Please try again.' });
		} finally {
			isNavigating = false;
		}
	}

	function handleSelectionToggle() {
		dispatch('toggleSelect', { id: collection.id, selected: !selected });
	}

	function fitTitle(node) {
		const header = node.closest('.card-header');
		let frame;

		function fit() {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (!header.clientWidth) return;

				let min = 12;
				let max = 49 / 1.2;
				node.style.setProperty('--collection-title-size', `${min}px`);
				while (max - min > 0.25) {
					const size = (min + max) / 2;
					node.style.setProperty('--collection-title-size', `${size}px`);
					if (node.scrollHeight <= header.clientHeight) min = size;
					else max = size;
				}
				node.style.setProperty('--collection-title-size', `${min}px`);
			});
		}

		const observer = new ResizeObserver(fit);
		observer.observe(header);
		document.fonts?.addEventListener('loadingdone', fit);
		fit();

		return {
			update: fit,
			destroy() {
				cancelAnimationFrame(frame);
				observer.disconnect();
				document.fonts?.removeEventListener('loadingdone', fit);
			}
		};
	}
</script>

<li class="col-12 col-sm-6 col-md-6 col-lg-4 col-xl-3 mb-md-4 w-100" class:compact>
	{#if collection}
		<article class="collection-card card border-0 shadow-sm w-100" class:is-navigating={isNavigating}>
			{#if showAdd}
				<label class="card-select" aria-label={selected ? 'Deselect collection' : 'Select collection'}>
					<input type="checkbox" checked={selected} on:change={handleSelectionToggle} />
					<Fa icon={selected ? faCheck : faPlus} size="sm" />
				</label>
			{/if}
			<div class="card-image">
				<LazyLoadImage
					src={collection.items_length > 0 && collection.thumbnail_url
						? collection.thumbnail_url
						: '/placeholder.jpg'}
					alt="Thumbnail"
					width={288}
					height={288}
					placeholder="blur"
					objectFit="cover"
				/>
			</div>
			<div class="card-main">
				<div class="card-header">
					<a class="collection-title-link stretched-link" href="#" aria-disabled={isNavigating} on:click|preventDefault={handleNavigation}>
						<h2 class="collection-title" title={collection.category} use:fitTitle={collection.category}>{collection.category}</h2>
					</a>
				</div>
				<div class="card-meta">
					{#if showTags}
						<span>{tagCount} {tagCount === 1 ? 'tag' : 'tags'}</span>
					{/if}
					<span>
						<Fa icon={faPencil} size="xs" />
						{collection.items_length || 0}
					</span>
					{#if showDate}
						<span>
							<Fa icon={faCalendar} size="xs" />
							{formatTimestamp(collection.created_at)}
						</span>
					{/if}
					{#if collection.times_played}
						<span>
							<Fa icon={faChartSimple} size="xs" />
							{collection.times_played > 999 ? Math.floor(collection.times_played / 1000) + 'k' : collection.times_played}
						</span>
					{/if}
					{#if showIsVisible}
						<span>
							<Fa icon={collection.private ? faEyeSlash : faEye} size="xs" />
						</span>
					{/if}
					{#if showAuthor && collection.profiles}
						<span class="card-author">by {collection.profiles.username || collection.profiles.public_id}</span>
					{/if}
				</div>
				{#if isNavigating}
					<div class="navigation-status" role="status">
						<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
						Loading quiz...
					</div>
				{/if}
			</div>
		</article>
	{:else}
		<article class="collection-card card border-0 shadow-sm placeholder w-100">
			<div class="card-image shimmer"></div>
			<div class="card-main">
				<div class="title-placeholder shimmer"></div>
			</div>
		</article>
	{/if}
</li>

<style>
	li {
		align-self: start;
	}
	:global(.list.grid) li {
		height: auto;
	}
	.collection-card {
		transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1);
		will-change: transform;
		color: inherit;
		display: flex;
		flex-direction: column;
		height: auto;
		overflow: visible;
	}
	.collection-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
	}
	.collection-card.is-navigating {
		box-shadow: 0 0 0 2px #0d6efd, 0 4px 16px rgba(0, 0, 0, 0.12) !important;
		cursor: progress;
	}
	.navigation-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: #0a58ca;
		font-weight: 600;
	}
	li.compact {
		margin-bottom: 0 !important;
	}
	.compact .collection-card {
		flex-direction: row;
		align-items: stretch;
		text-align: left;
	}
	.compact .card-image {
		width: 90px;
		min-width: 90px;
		min-height: 90px;
		aspect-ratio: unset;
	}
	.compact .card-main {
		padding: 0.75rem;
		justify-content: center;
	}
	.compact .card-meta {
		justify-content: flex-start;
	}
	.card-image {
		width: 100%;
		aspect-ratio: 5 / 4;
		min-height: 120px;
		background: #f8f9fa;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.card-main {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 0.5rem;
		padding: 0.5rem 1rem 1rem 1rem;
		color: #626262;
		flex: 1;
		min-width: 0;
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0;
		border-bottom: 0px;
		height: 49px;
		flex: 0 0 49px;
		min-width: 0;
	}
	.card-select {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 9999px;
		background: #32c345;
		color: #14551c;
		border: 1px solid #14551c;
		cursor: pointer;
		position: absolute;
		top: -2px;
		right:-4px;
		padding: 0.25rem;
		z-index: 2;
	}
	.card-select:hover {
		background: #8ed497;
	}
	.card-select input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
		margin: 0;
		padding: 0;
	}
	.card-select :global(svg) {
		width: 1rem;
		height: 1rem;
	}
	.collection-title-link {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		height: 100%;
		min-width: 0;
		text-decoration: none;
		color: inherit;
	}
	:global(.list) :global(ul) :global(li) .card-header .collection-title-link {
		flex-direction: row;
	}
	.collection-title {
		margin: 0;
		width: 100%;
		max-height: 49px;
		overflow: hidden;
		overflow-wrap: anywhere;
		font-size: var(--collection-title-size, 1.25rem);
		line-height: 1.2;
	}
	.card-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: #6c757d;
		align-items: center;
	}
	.card-meta span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.card-author {
		white-space: nowrap;
	}
	.title-placeholder {
		height: 1.4rem;
		width: 100%;
		background: #dee2e6;
		border-radius: 0.25rem;
	}
	.placeholder .card-image,
	.placeholder .title-placeholder {
		background-color: #e9ecef;
	}
	.shimmer {
		animation: shimmer 1.5s infinite;
	}
	@keyframes shimmer {
		0% { opacity: 1; }
		50% { opacity: 0.5; }
		100% { opacity: 1; }
	}
	@media (max-width: 575.98px) {
		.collection-card {
			flex-direction: row;
			align-items: stretch;
		}
		.card-image {
			width: 90px;
			min-width: 90px;
			height: auto;
			max-height: none;
			aspect-ratio: unset;
		}
		.card-main {
			padding: 0.75rem;
			justify-content: center;
		}
	}
</style>
