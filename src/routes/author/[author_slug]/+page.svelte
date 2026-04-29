<script>
	import ProfilePicture from '$lib/ProfilePicture.svelte';
	import { fetchUser, fetchUserBySlug, fetchUserCollections } from '$lib/api/user';
	import { page } from '$app/stores';
	import CollectionCard from '$lib/components/CollectionCard.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import { goto } from '$app/navigation';

	export let data;

	let collections = [];
	let author = null;
	let bio = null;
	let userData = null;

	function handleCollectionNavigate(collection) {
		// Custom navigation logic can be added here if needed
		// For now, we'll just log the collection
		console.log('Navigating to collection:', collection);

		//use goto navigation
		goto(
			`/quiz/${collection.profiles.username_slug || collection.profiles.username || collection.profiles.public_id}/${collection.slug}`,
			{ state: { collectionId: collection.id } }
		);
	}

	// Use server-loaded data if available, otherwise fetch client-side
	$: if (data?.userData) {
		userData = data.userData;
		author = userData.username;
		bio = userData.bio;
		// Still need to fetch collections client-side since they might be dynamic
		if (userData.id) {
			fetchUserCollections(userData.id).then((result) => {
				collections = result || [];
			});
		}
	} else if ($page.params.author_slug) {
		init($page.params.author_slug);
	}
	async function init(authorSlug) {
		try {
			// First, get the user data using the slug to find the author_id
			userData = await fetchUserBySlug(authorSlug);

			if (!userData) {
				console.error('User not found:', authorSlug);
				author = null;
				collections = [];
				bio = null;
				return;
			}

			// Now fetch collections using the author_id from userData
			collections = await fetchUserCollections(userData.public_id);
			bio = userData?.bio || null;
			author = userData?.username || null;
		} catch (error) {
			console.error('Error fetching author data:', error);
			author = null;
			collections = [];
			bio = null;
		}
	}
</script>

<svelte:head>
	<title>{data?.title || `Author: ${$page.params.author_slug}`}</title>
	<meta
		name="description"
		content={data?.description || `Author profile for ${$page.params.author_slug}`}
	/>

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={data?.og?.type || 'profile'} />
	<meta
		property="og:title"
		content={data?.og?.title || data?.title || `Author: ${$page.params.author_slug}`}
	/>
	<meta
		property="og:description"
		content={data?.og?.description ||
			data?.description ||
			`Author profile for ${$page.params.author_slug}`}
	/>
	<meta
		property="og:image"
		content={data?.og?.image || data?.image || `/images/authors/${$page.params.author_slug}.jpg`}
	/>
	<meta
		property="og:url"
		content={data?.og?.url || data?.url || `/author/${$page.params.author_slug}`}
	/>
	<meta property="og:site_name" content={data?.og?.siteName || 'Flash Cards'} />

	{#if data?.og?.profile}
		<meta property="profile:first_name" content={data.og.profile.firstName} />
		<meta property="profile:last_name" content={data.og.profile.lastName} />
		<meta property="profile:username" content={data.og.profile.username} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content={data?.twitter?.card || 'summary'} />
	<meta
		name="twitter:title"
		content={data?.twitter?.title || data?.title || `Author: ${$page.params.author_slug}`}
	/>
	<meta
		name="twitter:description"
		content={data?.twitter?.description ||
			data?.description ||
			`Author profile for ${$page.params.author_slug}`}
	/>
	<meta
		name="twitter:image"
		content={data?.twitter?.image ||
			data?.image ||
			`/images/authors/${$page.params.author_slug}.jpg`}
	/>
	{#if data?.twitter?.creator}
		<meta name="twitter:creator" content={data.twitter.creator} />
	{/if}
	{#if data?.twitter?.site}
		<meta name="twitter:site" content={data.twitter.site} />
	{/if}

	<!-- Additional SEO -->
	{#if data?.meta?.author}
		<meta name="author" content={data.meta.author} />
	{/if}
	{#if data?.meta?.keywords}
		<meta name="keywords" content={data.meta.keywords} />
	{/if}
	{#if data?.meta?.robots}
		<meta name="robots" content={data.meta.robots} />
	{/if}
	{#if data?.meta?.canonical}
		<link rel="canonical" href={data.meta.canonical} />
	{/if}
</svelte:head>

{#if author}
	<div class="container mb-4">
		<div class="row align-items-center align-items-md-center white p-4">
			<div class="col-12 col-md-auto text-center text-md-start mb-3 mb-md-0">
				<ProfilePicture userId={userData.id} size={150} isRound={true} />
			</div>
			<div class="col-12 col-md text-center text-md-start">
				<h2 class="mb-1">{author}</h2>
				<p class="mb-2">{collections.length} quizzes published</p>
				{#if bio && bio.length > 0}
					<p class="mb-0" style="border: 1px solid #ddd; padding: 0.75rem; border-radius: 0.5rem;">
						{bio}
					</p>
				{/if}
			</div>
		</div>
	</div>
	<div class="container list grid pt-3">
		<ul>
			{#each collections as data}
				<CollectionCard collection={data} onNavigate={handleCollectionNavigate} />
			{/each}
		</ul>
	</div>
{:else}
	<Loading invert={true} />
{/if}
