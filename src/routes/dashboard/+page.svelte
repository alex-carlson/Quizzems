<script lang="ts">
	import AccountSettings from '$lib/AccountSettings.svelte';
	import UserScores from '$lib/components/UserScores.svelte';
	import ProfilePicture from '$lib/ProfilePicture.svelte';
	import { user, logOutUser } from '../../store/user';
	import { deleteQuiz, getAllQuizzes } from '$lib/api/db';
	import { addToast } from '../../store/toast';

	let activeTab: string = 'settings';
	let savedQuizzes: Array<{id: string; metadata: {category?: string; title?: string; description?: string; meta?: {title?: string}}; savedAt: number}> = [];
	let loadingSavedQuizzes = false;

	$: if ($user) {
		document.title = 'User Dashboard';
	}

	async function logout() {
		await logOutUser();
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
											<h5 class="mb-1">{quiz.metadata?.category || quiz.metadata?.meta?.title || quiz.metadata?.title || 'Untitled Quiz'}</h5>
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
				{/if}
			</div>
			<button class="btn btn-danger" on:click={logout}>Log Out</button>
		</div>
	{:else}
		<p>Loading user data...</p>
	{/if}
</div>