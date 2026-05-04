<script>
	import { user } from '$store/user';
	import { quiz } from '$store/quiz';
	import Collections from '$lib/Collections.svelte';
	import CollectionItem from '$lib/Upload/CollectionItem.svelte';
	import CollectionInfo from '$lib/Upload/CollectionInfo.svelte';
	import {
		removeItem,
		createCollection,
		confirmDelete,
		saveEdit,
		reorderItems
	} from '$lib/Upload/uploader';
	import { supabase } from '$lib/api/supabaseClient';
	import { apiFetch } from '$lib/api/fetchdata';
	import { addToast } from '../../store/toast';
	import QuestionTypeForm from '$lib/components/QuestionTypeForm.svelte';
	import { page } from '$app/stores';
	import { Fa } from 'svelte-fa';
	import { faSort, faCheck, faDownload, faTrashCan } from '@fortawesome/free-solid-svg-icons';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	let editableItemId = null;
	let isReordering = false;
	let showCropper = false;
	let item = {};
	let tempCategory = '';
	let tempDescription = '';
	let tempTags = '';
	let suggestedTags = [];
	let channel;
	let skipNextCollectionSync = false;
	let autoOpenedCollectionId = null;
	let tagDebounceTimeout;
	let lastUserId;
	let showCollections = true;
	let questionType = 'Image';

	onMount(() => {
		if ($user?.public_id) {
			quiz.loadUserCollections($user.public_id);
		}

		channel = supabase
			.channel('collections-realtime')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'collections' },
				(payload) => {
					if ($quiz.collection?.id) {
						if (
							payload.new?.id === $quiz.collection.id ||
							payload.old?.id === $quiz.collection.id
						) {
							if (!skipNextCollectionSync) {
								quiz.loadCollection($quiz.collection.id);
							} else {
								skipNextCollectionSync = false;
							}
						}
					}
					quiz.loadUserCollections($user.public_id);
				}
			)
			.subscribe();

		return () => {
			if (channel) supabase.removeChannel(channel);
		};
	});

	$: if ($user?.public_id && $user.public_id !== lastUserId) {
		lastUserId = $user.public_id;
		quiz.loadUserCollections($user.public_id);
	}

	$: {
		const requestedCollectionId = $page.url.searchParams.get('collectionId');
		if (
			requestedCollectionId &&
			$user?.public_id &&
			autoOpenedCollectionId !== requestedCollectionId
		) {
			autoOpenedCollectionId = requestedCollectionId;
			quiz.loadCollection(requestedCollectionId);
		}
	}

	function handleCollectionDeleted() {
		quiz.setCollection(null);
		quiz.setCards([]);
		addToast({ type: 'success', message: 'Collection deleted successfully!' });
	}

	function debugQuiz() {
		console.log('QUIZ STATE:', get(quiz));
	}

	debugQuiz();

	async function fetchRecommendedTags(data) {
		try {
			const res = await apiFetch('/collections/tags/recommended', 'POST', { query: data });
			return Array.isArray(res) ? res.map((t) => (typeof t === 'string' ? t : t.tag)) : [];
		} catch {
			return [];
		}
	}

	$: if (tempCategory || tempDescription) {
		const query = [tempCategory, tempDescription].join(' ');
		if (query.length > 3) {
			clearTimeout(tagDebounceTimeout);
			tagDebounceTimeout = setTimeout(async () => {
				let tags = await fetchRecommendedTags(query);
				tags = tags.map((t) => t.toLowerCase());
				const current = tempTags.split(',').map((t) => t.trim().toLowerCase());
				suggestedTags = tags.filter((t) => !current.includes(t));
			}, 400);
		} else {
			suggestedTags = [];
		}
	}
</script>

<svelte:head>
	<title>Manage Collections</title>
</svelte:head>

<div class="form white uploader py-4 px-2 col-12 col-md-10 col-lg-8 mx-auto">
	{#if !$user}
		<div class="text-center py-5">
			<a href="/login" class="btn btn-primary">Log in</a>
		</div>
	{:else}
		<div class="mb-5">
			<div class="align-items-center mb-2">
				<h2 class="mb-0">Select a Quiz</h2>

				<button
					class="btn btn-sm btn-outline-secondary"
					on:click={() => (showCollections = !showCollections)}
				>
					{showCollections ? 'Hide' : 'Show'}
				</button>
			</div>

			{#if showCollections}
				<Collections
					collections={$quiz.userCollections || []}
					grid
					onSelectCollection={(e) => quiz.loadCollection(e.id)}
				/>
			{/if}
		</div>

		{#if !$quiz.collection}
			<div>
				<h2>Create a new Quiz</h2>
				<input bind:value={tempCategory} class="form-control mb-2" />
				<button
					class="btn btn-primary"
					on:click={async () => {
						const res = await createCollection(tempCategory);
						const col = Array.isArray(res) ? res[0] : res;
						if (col?.id) await quiz.loadCollection(col.id);
					}}
				>
					Create
				</button>
			</div>
		{:else}
			<CollectionInfo
				collection={$quiz.collection}
				bind:tempCategory
				bind:tempDescription
				bind:tempTags
				bind:showCropper
				{suggestedTags}
			/>

			<div class="card mb-4">
				<div class="card-header">
					Questions ({$quiz.cards?.length || 0})
				</div>
				<ul class="list-group">
					{#each $quiz.cards as item, index (item.id)}
						<CollectionItem
							{item}
							{index}
							bind:editableItemId
							on:removeItem={async () => {
								await removeItem(item.id, $quiz.collection.category);
								await quiz.loadCards($quiz.collection.id);
							}}
							on:saveEdit={async (e) => {
								await saveEdit({
									collection: $quiz.collection.category,
									author_id: $user.public_id,
									...e.detail
								});
								await quiz.loadCards($quiz.collection.id);
							}}
							on:updateItem={(e) => {
								quiz.updateCardById(e.detail.id, e.detail);
								skipNextCollectionSync = true;
							}}
							on:reorderItem={async (e) => {
								await reorderItems(
									e.detail.prevIndex,
									e.detail.newIndex,
									$quiz.collection
								);
								await quiz.loadCards($quiz.collection.id);
							}}
							{isReordering}
						/>
					{/each}
				</ul>
			</div>

			<QuestionTypeForm
				bind:item
				{questionType}
			/>

			<div class="mt-3 d-flex gap-2">
				{#if $quiz.cards?.length > 1}
					<button class="btn btn-secondary" on:click={() => (isReordering = !isReordering)}>
						<Fa icon={isReordering ? faCheck : faSort} />
					</button>

					<button
						class="btn btn-primary"
						on:click={() => {
							const blob = new Blob(
								[
									JSON.stringify({
										...$quiz.collection,
										items: $quiz.cards
									})
								],
								{ type: 'application/json' }
							);
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `${$quiz.collection.category}.json`;
							a.click();
						}}
					>
						<Fa icon={faDownload} />
					</button>
				{/if}

				<button
					class="btn btn-danger"
					on:click={() =>
						confirmDelete($quiz.collection.id, handleCollectionDeleted)}
				>
					<Fa icon={faTrashCan} />
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>

	.card {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e9ecef;
	}

	.btn {
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		transition: all 0.2s ease;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	@media (max-width: 768px) {
		.uploader {
			padding: 1rem 0.5rem;
		}
	}
</style>
