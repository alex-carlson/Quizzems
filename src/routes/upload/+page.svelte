<script>
	import { user } from '$store/user';
	import Collections from '$lib/Collections.svelte';
	import CollectionItem from '$lib/Upload/CollectionItem.svelte';
	import CollectionInfo from '$lib/Upload/CollectionInfo.svelte';
	import { createEventDispatcher } from 'svelte';
	import { fetchUserCollections, fetchCollectionById } from '$lib/api/collections';
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
	import { fetchCollectionItems } from '$lib/api/items';
	import QuestionTypeForm from '$lib/components/QuestionTypeForm.svelte';
	import { page } from '$app/stores';
	import { Fa } from 'svelte-fa';
	import { faSort, faCheck, faDownload, faTrashCan } from '@fortawesome/free-solid-svg-icons';
	let collection = null;
	let questionType = 'Image';
	let isPublic = false;
	let editableItemId = null;
	let isReordering = false;
	let collections = [];
	let showCropper = false;
	let item = {};
	let items = [];
	let tempCategory = '';
	let tempDescription = '';
	let tempTags = '';
	let isShuffle = false;
	let suggestedTags = [];
	let channel;
	let skipNextCollectionSync = false;
	let autoOpenedCollectionId = null;

	let tagDebounceTimeout;
	const dispatch = createEventDispatcher();

	import { onMount } from 'svelte';

	onMount(() => {
		if ($user?.public_id) {
			loadCollections();
		}

		channel = supabase
			.channel('collections-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'collections'
				},
				(payload) => {
					// If we're viewing a specific collection
					if (collection?.id) {
						// If THIS collection changed → refresh it
						if (payload.new?.id === collection.id || payload.old?.id === collection.id) {
							// Skip sync if we just updated an item locally
							if (!skipNextCollectionSync) {
								setCollection(collection.id);
							} else {
								skipNextCollectionSync = false;
							}
						}
					}

					// Always refresh collections list (sidebar)
					loadCollections();
				}
			)
			.subscribe();

		return () => {
			if (channel) supabase.removeChannel(channel);
		};
	});

	let lastUserId;

	$: if ($user?.public_id && $user.public_id !== lastUserId) {
		lastUserId = $user.public_id;
		loadCollections();
	}

	$: {
		const requestedCollectionId = $page.url.searchParams.get('collectionId');
		if (
			requestedCollectionId &&
			$user?.public_id &&
			autoOpenedCollectionId !== requestedCollectionId
		) {
			autoOpenedCollectionId = requestedCollectionId;
			setCollection(requestedCollectionId);
		}
	}

	async function loadCollections() {
		try {
			const result = await fetchUserCollections($user.public_id);
			collections = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		} catch (error) {
			console.error('Error fetching user collections:', error);
			addToast({
				type: 'error',
				message: 'Failed to load collections. Please try again later.'
			});
		}
	}

	// Handle events from CollectionInfo component
	function handleCollectionUpdated() {
		loadCollections();
	}

	function handleThumbnailUpdated() {
		// Refresh collection data to get updated thumbnail
		if (collection?.id) {
			setCollection(collection.id);
		}
	}

	function handleToggleCropper() {
		showCropper = !showCropper;
	}

	function handleCropperToggled(event) {
		showCropper = event.detail;
	}
	async function setCollection(collectionId) {
		try {
			const newCollection = await fetchCollectionById(collectionId, true);

			if (newCollection) {
				// Set the collection with all its data
				collection = newCollection;

				// Set form values
				item.category = collection.category || '';
				tempCategory = collection.category || '';
				tempDescription = collection.description || '';
				if (collection.tags) {
					tempTags = Array.isArray(collection.tags)
						? collection.tags.join(', ')
						: typeof collection.tags === 'string'
							? collection.tags.includes('[')
								? JSON.parse(collection.tags).join(', ')
								: collection.tags
							: '';
				} else {
					tempTags = '';
				}
				isPublic = !collection.private || false;
				isShuffle = collection.shuffle || false;

				// Initialize items array if it doesn't exist
				if (!collection.items) {
					collection.items = [];
				}

				// Set items length
				if (collection.items) {
					collection.itemsLength = collection.items.length;
				} else {
					collection.itemsLength = 0;
				}

				collection.items = await fetchCollectionItems(collection.id, true);
			} else {
				console.error('No collection data received');
				addToast({
					type: 'error',
					message: 'Failed to load collection data. Please try again.'
				});
			}
		} catch (error) {
			console.error('Error fetching collection:', error);
			addToast({
				type: 'error',
				message: 'Failed to load collection. Please try again.'
			});
		}
	}

	function handleCollectionDeleted(newCollection) {
		collection = null;
		addToast({
			type: 'success',
			message: 'Collection deleted successfully!'
		});
	}

	async function fetchRecommendedTags(data) {
		try {
			const response = await apiFetch('/collections/tags/recommended', 'POST', { query: data });
			if (response && Array.isArray(response)) {
				// Map to just tag strings if response is array of objects
				return response.map((t) => (typeof t === 'string' ? t : t.tag));
			}
			return [];
		} catch (error) {
			console.error('Error fetching recommended tags:', error);
			return [];
		}
	}

	$: if (tempCategory || tempDescription) {
		const query = [tempCategory, tempDescription].filter(Boolean).join(' ');
		if (query.length > 3) {
			clearTimeout(tagDebounceTimeout);
			tagDebounceTimeout = setTimeout(() => {
				fetchRecommendedTags(query).then((tags) => {
					// Convert all tags to lowercase
					tags = tags.map((t) => t.toLowerCase());
					// Get current tags as lowercase array
					const currentTags = tempTags
						.split(',')
						.map((t) => t.trim().toLowerCase())
						.filter(Boolean);
					// Filter out tags already present
					suggestedTags = tags.filter((t) => !currentTags.includes(t));
				});
			}, 400); // 400ms debounce
		} else {
			clearTimeout(tagDebounceTimeout);
			suggestedTags = [];
		}
	}
</script>

<svelte:head>
	<title>Manage Collections</title>
</svelte:head>

<div class="form white uploader py-4 col-12 col-md-10 col-lg-8 mx-auto">
	{#if !$user}
		<div class="text-center py-5">
			<p class="mb-3">
				<a href="/login" class="btn btn-primary">Log in</a> to manage your collections.
			</p>
		</div>
	{:else}
		<div class="select-quiz mb-5">
			<h2 class="mb-4">Select a Quiz</h2>
			<Collections
				{collections}
				condensed
				grid
				list
				limit={-1}
				onSelectCollection={(e) => {
					setCollection(e.id);
				}}
			/>
		</div>

		{#if collection === null}
			<div class="create-section mb-5">
				<div class="card p-4">
					<h2 class="mb-4">Create a new Quiz</h2>
					<div class="mb-3">
						<input
							type="text"
							class="form-control"
							bind:value={tempCategory}
							placeholder="Category Name"
						/>
					</div>
					<button
						class="btn btn-primary"
						on:click={async () => {
							const result = await createCollection(tempCategory);
							if (result) {
								await loadCollections();
								// Handle both array and single object responses
								const newCol = Array.isArray(result) ? result[0] : result;
								if (newCol && newCol.id) {
									// Find the collection in the loaded collections or use the returned data
									collection = collections.find((c) => c.id === newCol.id) || newCol;
									setCollection(newCol.id);
								} else {
									console.error('Invalid collection response:', result);
									addToast({
										type: 'error',
										message: 'Collection created but failed to load. Please refresh the page.'
									});
								}
							}
						}}
					>
						Create
					</button>
				</div>
			</div>
		{:else}
			<CollectionInfo
				{collection}
				bind:tempCategory
				bind:tempDescription
				bind:tempTags
				bind:isPublic
				bind:isShuffle
				bind:showCropper
				{suggestedTags}
				on:collectionUpdated={handleCollectionUpdated}
				on:thumbnailUpdated={handleThumbnailUpdated}
				on:toggleCropper={handleToggleCropper}
				on:cropperToggled={handleCropperToggled}
			/>
			<div class="questions-section mb-5">
				<div class="card">
					<div class="card-header">
						<h5 class="mb-0">
							Questions ({collection.items
								? collection.items.length
									? collection.items.length
									: 0
								: 0})
						</h5>
					</div>
					<div class="card-body p-0">
						<ul class="items-list list-group list-group-flush">
							{#if collection.items && collection.items.length > 0}
								{#each collection.items as item, index (item.id)}
									<CollectionItem
										{item}
										{index}
										{collection}
										bind:editableItemId
										on:removeItem={async () => {
											const updatedItems = await removeItem(item.id, collection.category);
											if (updatedItems) {
												collection.items = updatedItems.items;
												collection.itemsLength = updatedItems.items.length;
											}
										}}
										on:saveEdit={async (e) => {
											const d = {
												collection: collection.category,
												author_id: $user.public_id,
												...e.detail
											};
											const result = await saveEdit(d);
											if (result) {
												collections = result;
												editableItemId = null;
											}
										}}
										on:updateItem={(e) => {
											const itemIndex = collection.items.findIndex((i) => i.id === e.detail.id);
											if (itemIndex !== -1) {
												const updatedItem = {
													...collection.items[itemIndex],
													...e.detail
												};

												collection.items[itemIndex] = updatedItem;
												collection.items = [...collection.items]; // Trigger reactivity

												// Prevent realtime sync from immediately reloading and overwriting our update
												skipNextCollectionSync = true;
											}
										}}
										on:reorderItem={async (e) => {
											const result = await reorderItems(
												e.detail.prevIndex,
												e.detail.newIndex,
												collection
											);
											if (result) {
												console.log('Reordered items:', result);
												collection.items = result[0].items;
												collection.itemsLength = result[0].items.length;
											}
										}}
										{isReordering}
									/>
								{/each}
							{:else}
								<li class="list-group-item text-muted text-center py-4">
									No questions yet. Add some below!
								</li>
							{/if}
						</ul>
					</div>
				</div>
			</div>

			<div class="add-question-section mb-5">
				<div class="card">
					<div class="card-header">
						<h5 class="mb-0">Add New Question</h5>
					</div>
					<div class="card-body">
						<QuestionTypeForm
							bind:item
							{collection}
							{questionType}
							on:itemAdded={(e) => {
								// Update the collection with new items
								collection.items = e.detail.items;
								collection.itemsLength = e.detail.itemsLength;
								// Trigger reactivity by reassigning the collection
								collection = { ...collection };
							}}
						/>
					</div>
				</div>
			</div>

			<div class="actions-section">
				<div class="card">
					<div class="card-body">
						<div class="d-flex gap-2 justify-content-start align-items-center">
							<div class="action-buttons d-flex gap-2">
								{#if collection.itemsLength && collection.itemsLength > 1}
									{#if !isReordering}
										<button
											class="btn btn-secondary"
											on:click={() => {
												isReordering = true;
												// Scroll to the last list item
												setTimeout(() => {
													const itemsList = document.querySelector('.items-list');
													const lastItem = itemsList?.lastElementChild;
													if (lastItem) {
														lastItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
													}
												}, 100);
											}}
											title="Reorder Questions"
										>
											<Fa icon={faSort} />
										</button>
									{:else}
										<button
											class="btn btn-success"
											on:click={() => (isReordering = false)}
											title="Done Reordering"
										>
											<Fa icon={faCheck} />
										</button>
									{/if}
									<button
										class="btn btn-primary"
										title="Download JSON"
										on:click={() => {
											try {
												const blob = new Blob([JSON.stringify(collection)], {
													type: 'application/json'
												});
												const url = URL.createObjectURL(blob);
												const a = document.createElement('a');
												a.href = url;
												a.download = `${collection.category}.json`;
												document.body.appendChild(a);
												a.click();
												document.body.removeChild(a);
												URL.revokeObjectURL(url);
											} catch (error) {
												console.error('Error downloading collection:', error);
												addToast({
													type: 'error',
													message: 'Failed to download collection. Please try again.'
												});
											}
										}}
									>
										<Fa icon={faDownload} />
									</button>
								{/if}
								<button
									class="btn btn-danger"
									title="Delete Collection"
									on:click={() => confirmDelete(collection.id, handleCollectionDeleted)}
								>
									<Fa icon={faTrashCan} />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
<div class="container" style="display: none;">
	<form action="" on:submit|preventDefault>
		<input type="file" name="file" id="file" />
		<input type="text" name="answer" id="answer" />
		<button type="submit">Upload</button>
	</form>
</div>

<style>
	.action-buttons {
		flex-grow: 1;
	}

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

	.list-group-item {
		border-left: none;
		border-right: none;
		padding: 1rem 1.5rem;
	}

	.list-group-item:first-child {
		border-top: none;
	}

	.list-group-item:last-child {
		border-bottom: none;
	}

	@media (max-width: 768px) {
		.uploader {
			padding: 1rem 0.5rem;
		}

		.d-flex.justify-content-between {
			flex-direction: column;
			gap: 1rem;
		}

		.action-buttons {
			order: 2;
		}
	}
</style>
