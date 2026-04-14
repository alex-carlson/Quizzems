<script lang="ts">
	import AccountSettings from '$lib/AccountSettings.svelte';
	import UserScores from '$lib/components/UserScores.svelte';
	import ProfilePicture from '$lib/ProfilePicture.svelte';
	import { user, logOutUser } from '../../store/user';

	let activeTab = 'settings';

	$: if ($user) {
		document.title = 'User Dashboard';
	}

	async function logout() {
		await logOutUser();
	}
</script>

<div class="container pt-5">
	{#if $user}
		<ProfilePicture userId={$user.id} size="150" />
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
					<a class="nav-link" href="/upload"> Your Quizzems </a>
				</li>
			</ul>

			<div class="white tab-content p-3 border border-top-0 rounded-bottom mb-3">
				{#if activeTab === 'settings'}
					<AccountSettings />
				{:else if activeTab === 'scores'}
					<UserScores />
				{/if}
			</div>
			<button class="btn btn-danger" on:click={logout}>Log Out</button>
		</div>
	{:else}
		<p>Loading user data...</p>
	{/if}
</div>
