<script>
	import Collections from '../Collections.svelte';
	import { user } from '../store/user';
	import { getSession } from '../supabaseClient';

	let collections = [];
	let loading = false;
	let errorMessage = '';
	let hasFetched = false;

	// Safe fetch logic
	async function fetchCollections(userId) {
		loading = true;
		errorMessage = '';
		collections = [];

		try {
			const { data: sessionData, error: sessionError } = await getSession();
			if (sessionError || !sessionData.session) {
				throw new Error('User session not found');
			}

			const token = sessionData.session.access_token;
			const url = `${import.meta.env.VITE_API_URL}/collections/user/${userId}`;

			const res = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`Server responded with ${res.status}: ${errorText}`);
			}

			const data = await res.json();
			collections = data;
		} catch (err) {
			console.error('Error fetching collections:', err);
			errorMessage = err.message || 'Unexpected error occurred.';
		} finally {
			loading = false;
			hasFetched = true;
		}
	}

	// Run fetch once when $user becomes available
	$: if ($user && !hasFetched) {
		console.log('Fetching collections for user:', $user.id);
		fetchCollections($user.id);
	}
</script>

<div class="recents">
	{#if !$user}
		<h2>Please log in to see your collections.</h2>
	{:else}
		<h2>Your Collections</h2>
		<p>Click on a collection to view its details.</p>

		{#if loading}
			<p>Loading collections...</p>
		{:else if errorMessage}
			<p style="color: red;">{errorMessage}</p>
		{:else if collections.length === 0}
			<p>No collections found.</p>
		{:else}
			<Collections {collections} />
		{/if}
		<p>
			<a href="/upload">Create or Edit Quizzems</a>
		</p>
	{/if}
</div>
