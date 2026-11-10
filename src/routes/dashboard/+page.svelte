<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AccountSettings from '$lib/AccountSettings.svelte';
	import UserScores from '$lib/components/UserScores.svelte';
	import ProfilePicture from '$lib/ProfilePicture.svelte';
	import { user, logOutUser } from '../../store/user';
	import { deleteQuiz, getAllQuizzes } from '$lib/api/db';
	import {
		fetchQuizOfTheDayCollections,
		searchPublicCollections,
		updateQuizOfTheDayIds,
		type PublicQuizSearchResult
	} from '$lib/api/collections';
	import { supabase } from '$lib/api/supabaseClient';
	import { addToast } from '../../store/toast';

	let activeTab: string = 'settings';
	let savedQuizzes: Array<{
		id: string;
		metadata: {
			category?: string;
			title?: string;
			description?: string;
			meta?: { title?: string };
		};
		savedAt: number;
	}> = [];
	let loadingSavedQuizzes = false;
	let adminStatusLoading = true;
	let isAdmin = false;
	let adminStatusError = '';
	let featuredQuizzes: PublicQuizSearchResult[] = [];
	let featuredQuizIds: string[] = [];
	let featuredQuizzesLoaded = false;
	let loadingFeaturedQuizzes = false;
	let savingFeaturedQuizzes = false;
	let featuredQuizzesError = '';
	let publicQuizSearchTerm = '';
	let publicQuizSearchResults: PublicQuizSearchResult[] = [];
	let searchingPublicQuizzes = false;
	let publicQuizSearchError = '';
	let searchedPublicQuizzes = false;
	let publicQuizPage = 1;
	let publicQuizTotalPages = 0;
	let publicQuizTotalCount = 0;
	let searchRequestId = 0;
	let searchTimeout: ReturnType<typeof setTimeout>;

	$: if ($user) {
		document.title = 'User Dashboard';
	}

	onMount(verifyAdminStatus);
	onDestroy(() => {
		clearTimeout(searchTimeout);
		searchRequestId++;
	});

	async function verifyAdminStatus() {
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session) return;

			const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me/admin-status`, {
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (!response.ok) throw new Error('Could not verify admin status');

			const { isAdmin: admin } = await response.json();
			isAdmin = admin === true;
		} catch (error) {
			console.error('Failed to verify admin status:', error);
			adminStatusError = 'Could not verify admin status. Admin controls are unavailable.';
		} finally {
			adminStatusLoading = false;
		}
	}

	async function logout() {
		await logOutUser();
	}

	async function loadFeaturedQuizzes() {
		if (featuredQuizzesLoaded || loadingFeaturedQuizzes) return;

		try {
			loadingFeaturedQuizzes = true;
			featuredQuizzesError = '';
			const configuredQuizzes = await fetchQuizOfTheDayCollections();
			featuredQuizzes = configuredQuizzes.map((quiz) => ({
				id: String(quiz.id),
				category: quiz.category
			}));
			featuredQuizIds = featuredQuizzes.map((quiz) => quiz.id);
			featuredQuizzesLoaded = true;
			void searchPublicQuizzes(1);
		} catch (error) {
			console.error('Failed to load featured quizzes:', error);
			featuredQuizzesError = 'Failed to load featured quizzes. Please try again.';
		} finally {
			loadingFeaturedQuizzes = false;
		}
	}

	function addFeaturedQuiz(quiz: PublicQuizSearchResult) {
		if (featuredQuizIds.length >= 6 || featuredQuizIds.includes(quiz.id)) return;
		featuredQuizzes = [...featuredQuizzes.filter((entry) => entry.id !== quiz.id), quiz];
		featuredQuizIds = [...featuredQuizIds, quiz.id];
	}

	function schedulePublicQuizSearch() {
		clearTimeout(searchTimeout);
		searchRequestId++;
		searchingPublicQuizzes = true;
		publicQuizSearchResults = [];
		publicQuizSearchError = '';
		searchedPublicQuizzes = false;
		searchTimeout = setTimeout(() => void searchPublicQuizzes(1), 400);
	}

	async function searchPublicQuizzes(page: number) {
		const requestId = ++searchRequestId;
		try {
			searchingPublicQuizzes = true;
			publicQuizSearchError = '';
			searchedPublicQuizzes = false;
			const result = await searchPublicCollections(publicQuizSearchTerm.trim(), page);
			if (requestId !== searchRequestId) return;
			publicQuizSearchResults = result.collections;
			publicQuizPage = page;
			publicQuizTotalPages = result.totalPages;
			publicQuizTotalCount = result.totalCount;
			searchedPublicQuizzes = true;
		} catch (error) {
			if (requestId !== searchRequestId) return;
			console.error('Failed to search public quizzes:', error);
			publicQuizSearchError =
				error instanceof Error
					? `Failed to search public quizzes: ${error.message}`
					: 'Failed to search public quizzes. Please try again.';
			publicQuizSearchResults = [];
		} finally {
			if (requestId === searchRequestId) searchingPublicQuizzes = false;
		}
	}

	function removeFeaturedQuiz(id: string) {
		featuredQuizIds = featuredQuizIds.filter((featuredId) => featuredId !== id);
	}

	function moveFeaturedQuiz(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= featuredQuizIds.length) return;

		const reorderedIds = [...featuredQuizIds];
		[reorderedIds[index], reorderedIds[targetIndex]] = [
			reorderedIds[targetIndex],
			reorderedIds[index]
		];
		featuredQuizIds = reorderedIds;
	}

	async function saveFeaturedQuizzes() {
		try {
			savingFeaturedQuizzes = true;
			featuredQuizzesError = '';
			await updateQuizOfTheDayIds(featuredQuizIds);
			addToast({ message: 'Daily featured quizzes updated', type: 'success' });
		} catch (error) {
			console.error('Failed to save featured quizzes:', error);
			featuredQuizzesError =
				error instanceof Error ? error.message : 'Failed to save featured quizzes. Please try again.';
			addToast({ message: 'Failed to update daily featured quizzes', type: 'error' });
		} finally {
			savingFeaturedQuizzes = false;
		}
	}

	async function loadSavedQuizzes() {
		try {
			loadingSavedQuizzes = true;
			const quizzes = await getAllQuizzes();
			savedQuizzes = quizzes || [];
		} catch (error) {
			console.error('Failed to load saved quizzes:', error);
			savedQuizzes = [];
		} finally {
			loadingSavedQuizzes = false;
		}
	}

	async function handleDeleteQuiz(quizId) {
		try {
			await deleteQuiz(quizId);
			addToast({ message: 'Quiz deleted successfully', type: 'success' });
			await loadSavedQuizzes();
		} catch (error) {
			console.error('Failed to delete quiz:', error);
			addToast({ message: 'Failed to delete quiz', type: 'error' });
		}
	}
</script>

<div class="container pt-5">
	{#if $user}
		<ProfilePicture userId={$user.id} size={150} />
		<h2 class="my-3">{$user.username || $user.email}</h2>
		<div class="mt-4">
			<ul class="nav nav-tabs mb-0">
				<li class="nav-item">
					<a
						class="nav-link {activeTab === 'settings' ? 'active' : ''}"
						on:click={() => {
							activeTab = 'settings';
						}}
					>
						Account Settings
					</a>
				</li>
				<li class="nav-item">
					<a
						class="nav-link {activeTab === 'scores' ? 'active' : ''}"
						on:click={() => {
							activeTab = 'scores';
						}}
					>
						Scores
					</a>
				</li>
				<li class="nav-item">
					<a
						class="nav-link {activeTab === 'offline' ? 'active' : ''}"
						on:click={async () => {
							activeTab = 'offline';
							await loadSavedQuizzes();
						}}
					>
						Downloaded Quizzes
					</a>
				</li>
				<li class="nav-item">
					<a class="nav-link" href="/upload"> Your Quizzems </a>
				</li>
				{#if isAdmin}
					<li class="nav-item">
						<button
							type="button"
							class="nav-link {activeTab === 'featured' ? 'active' : ''}"
							on:click={async () => {
								activeTab = 'featured';
								await loadFeaturedQuizzes();
							}}
						>
							Daily Featured
						</button>
					</li>
				{/if}
			</ul>

			<div class="white tab-content p-3 border border-top-0 rounded-bottom mb-3">
				{#if activeTab === 'settings'}
					<AccountSettings />
				{:else if activeTab === 'scores'}
					<UserScores />
				{:else if activeTab === 'offline'}
					<div>
						{#if loadingSavedQuizzes}
							<p>Loading downloaded quizzes...</p>
						{:else if savedQuizzes.length === 0}
							<p>No quizzes downloaded yet.</p>
						{:else}
							<div class="list-group">
								{#each savedQuizzes as quiz (quiz.id)}
									<div class="list-group-item d-flex justify-content-between align-items-center">
										<div>
											<h5 class="mb-1">
												<a href={quiz.metadata?.meta?.url || '#'}
													>{quiz.metadata?.category ||
														quiz.metadata?.meta?.title ||
														quiz.metadata?.title ||
														'Untitled Quiz'}</a
												>
											</h5>
											<small class="text-muted">
												{quiz.metadata?.description || ''}
												<br />
												Saved: {new Date(quiz.savedAt).toLocaleDateString()}
											</small>
										</div>
										<button
											class="btn btn-sm btn-danger"
											on:click={() => handleDeleteQuiz(quiz.id)}
										>
											Delete
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'featured' && isAdmin}
					<section aria-labelledby="featured-quizzes-heading">
						<h3 id="featured-quizzes-heading">Daily featured quizzes</h3>
						<p>Select and order 1–6 public quizzes to feature on the homepage.</p>
						{#if loadingFeaturedQuizzes}
							<p>Loading quizzes...</p>
						{:else if featuredQuizzesError && !featuredQuizzesLoaded}
							<p class="text-danger" role="alert">{featuredQuizzesError}</p>
							<button class="btn btn-outline-primary" on:click={loadFeaturedQuizzes}>Retry</button>
						{:else}
							<div class="mb-3">
								<label for="featured-quiz-search" class="form-label">Filter public quizzes</label>
								<input
									id="featured-quiz-search"
									class="form-control"
									type="search"
									bind:value={publicQuizSearchTerm}
									on:input={schedulePublicQuizSearch}
									placeholder="Type to filter..."
								/>
							</div>
							{#if publicQuizSearchError}
								<p class="text-danger" role="alert">{publicQuizSearchError}</p>
							{:else if searchingPublicQuizzes}
								<p>Loading quizzes...</p>
							{:else if publicQuizSearchResults.length > 0}
								<p>Showing {publicQuizSearchResults.length} of {publicQuizTotalCount} quizzes</p>
								<ul class="list-group mb-3" aria-label="Public quiz search results">
									{#each publicQuizSearchResults as quiz (quiz.id)}
										<li class="list-group-item d-flex justify-content-between align-items-center gap-2">
											<span>{quiz.category} {#if quiz.author}by {quiz.author}{/if}</span>
											<button
												class="btn btn-sm btn-outline-primary"
												on:click={() => addFeaturedQuiz(quiz)}
												disabled={featuredQuizIds.includes(quiz.id) || featuredQuizIds.length >= 6}
											>
												{featuredQuizIds.includes(quiz.id) ? 'Added' : 'Add'}
											</button>
										</li>
									{/each}
								</ul>
								{#if publicQuizTotalPages > 1}
									<div class="mb-3">
										<button type="button" class="btn btn-sm btn-outline-secondary" disabled={publicQuizPage <= 1} on:click={() => searchPublicQuizzes(publicQuizPage - 1)}>Previous</button>
										<span class="mx-2">Page {publicQuizPage} of {publicQuizTotalPages}</span>
										<button type="button" class="btn btn-sm btn-outline-secondary" disabled={publicQuizPage >= publicQuizTotalPages} on:click={() => searchPublicQuizzes(publicQuizPage + 1)}>Next</button>
									</div>
								{/if}
							{:else if searchedPublicQuizzes && !searchingPublicQuizzes}
								<p>No public quizzes found. Try another search.</p>
							{/if}
							<p>{featuredQuizIds.length} of 6 selected</p>
							{#if featuredQuizIds.length === 0}
								<p>No featured quizzes configured. The homepage will show a random quiz.</p>
							{:else}
								<ol class="list-group list-group-numbered mb-3">
									{#each featuredQuizIds as id, index (id)}
										{@const quiz = featuredQuizzes.find((entry) => entry.id === id)}
										<li
											class="list-group-item d-flex justify-content-between align-items-center gap-2"
										>
											<span>{quiz?.category || `Unavailable quiz (${id})`}</span>
											<div class="btn-group">
												<button
													class="btn btn-sm btn-outline-secondary"
													aria-label="Move {quiz?.category || id} up"
													on:click={() => moveFeaturedQuiz(index, -1)}
													disabled={index === 0}>↑</button
												>
												<button
													class="btn btn-sm btn-outline-secondary"
													aria-label="Move {quiz?.category || id} down"
													on:click={() => moveFeaturedQuiz(index, 1)}
													disabled={index === featuredQuizIds.length - 1}>↓</button
												>
												<button
													class="btn btn-sm btn-outline-danger"
													aria-label="Remove {quiz?.category || id}"
													on:click={() => removeFeaturedQuiz(id)}>Remove</button
												>
											</div>
										</li>
									{/each}
								</ol>
							{/if}
							{#if featuredQuizzesError}
								<p class="text-danger" role="alert">{featuredQuizzesError}</p>
							{/if}
							<button
								class="btn btn-primary"
								on:click={saveFeaturedQuizzes}
								disabled={savingFeaturedQuizzes ||
									featuredQuizIds.length < 1 ||
									featuredQuizIds.length > 6}
							>
								{savingFeaturedQuizzes ? 'Saving...' : 'Save featured quizzes'}
							</button>
						{/if}
					</section>
				{/if}
			</div>
			{#if adminStatusError}
				<p class="text-danger" role="alert">{adminStatusError}</p>
			{:else if adminStatusLoading}
				<span class="visually-hidden">Checking admin access...</span>
			{/if}
			<button class="btn btn-danger" on:click={logout}>Log Out</button>
		</div>
	{:else}
		<p>Loading user data...</p>
	{/if}
</div>
