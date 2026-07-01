<script>
	import { formatTimestamp } from '$lib/api/utils.js';
	import { goto } from '$app/navigation';
	import { fetchUser } from '$lib/api/user';
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

	const dispatch = createEventDispatcher();

	$: tagCount = collection?.tags ? collection.tags.split(',').length : 0;

	async function defaultGotoPageWithState(author_id, slug) {
		try {
			const user = await fetchUser(author_id);
			const author_slug = user.username_slug || user.username || 'unknown-author';
			const url = `/quiz/${author_slug}/${slug}`;
			const state = { collectionId: collection.id };
			goto(url, { state });
		} catch (error) {
			console.error('Error fetching user for navigation:', error);
			goto(`/quiz/unknown-author/${slug}`, { state: { collectionId: collection.id } });
		}
	}

	function handleNavigation() {
		if (onNavigate) return onNavigate(collection);
		defaultGotoPageWithState(collection.author_public_id, collection.slug);
	}

	function handleSelectionToggle() {
		dispatch('toggleSelect', { id: collection.id, selected: !selected });
	}
</script>

<li class="col-12 col-sm-6 col-md-6 col-lg-4 col-xl-3 mb-md-4 w-100">
	{#if collection}
		<article class="collection-card card border-0 shadow-sm w-100">
			{#if showAdd}
				<label class="card-select" aria-label={selected ? 'Deselect collection' : 'Select collection'}>
					<input type="checkbox" checked={selected} on:change={handleSelectionToggle} />
					<Fa icon={selected ? faCheck : faPlus} size="sm" />
				</label>
			{/if}
			<div class="card-image">
				{#if collection.items_length > 0 && collection.thumbnail_url}
					<LazyLoadImage
						src={collection.thumbnail_url}
						alt="Thumbnail"
						width={288}
						height={288}
						placeholder="blur"
						objectFit="cover"
					/>
				{/if}
			</div>
			<div class="card-main">
				<div class="card-header">
					<a class="collection-title-link" href="#" on:click|preventDefault={handleNavigation}>
						<h2 class="collection-title">{collection.category}</h2>
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
	.collection-card {
		transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1);
		will-change: transform;
		color: inherit;
		display: flex;
		flex-direction: column;
		min-height: 100%;
	}
	.collection-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
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
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem;
		color: #626262;
		flex: 1;
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		position: relative;
		border-bottom: 0px;
	}
	.card-select {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 9999px;
		background: #8a8a8a1a;
		color: #ffffff;
		border: 1px solid #8a8a8a1a;
		cursor: pointer;
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		padding: 0.25rem;
	}
	.card-select:hover {
		background: #d6d6d629;
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
		text-decoration: none;
		color: inherit;
	}
	.collection-title {
		margin: 0;
		font-size: 1.25rem;
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
		.collection-title {
			font-size: 1rem;
		}
	}
</style>
