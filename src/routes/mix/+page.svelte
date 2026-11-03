<script>
    import QuizPage from '$lib/components/quiz/QuizPage.svelte';
    import { fetchCollelctionNamesById, fetchCollectionById } from '$lib/api/collections';
    import { page } from '$app/stores';

    let collectionNames = [];
    let loading = false;
    let error = '';

    $: ids = ($page.url.searchParams.get('ids') ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .map(Number)
        .filter(Number.isFinite);

    // Fetch collection names whenever the IDs change
    $: if (ids.length) {
        loadCollectionNames(ids);
    } else {
        collectionNames = [];
    }

    async function loadCollectionNames(ids) {
        loading = true;
        error = '';

        try {
            collectionNames = await fetchCollelctionNamesById(
                ids.map(String)
            );
        } catch (err) {
            console.error('Failed to fetch collection names:', err);
            error = 'Failed to load collection names';
            collectionNames = [];
        } finally {
            loading = false;
        }
    }

    let thumbnails = [];
    let authors = [];

    $: if (ids.length) {
        loadThumbnails(ids);
    } else {
        thumbnails = [];
        authors = [];
    }

    async function loadThumbnails(ids) {
        const results = await Promise.all(ids.map((id) => fetchCollectionById(String(id))));
        thumbnails = results.map((c) => c?.thumbnail_url).filter(Boolean);
        const seen = new Map();
        for (const c of results) {
            const p = c?.profiles;
            const name = p?.username || p?.public_id;
            if (name && !seen.has(name)) {
                seen.set(name, p.username_slug || name);
            }
        }
        authors = [...seen].map(([name, slug]) => ({ name, slug }));
    }

    $: data = {
        ids,
        category: collectionNames.join(', '),
        author: '',
        authors,
        collectionId: null,
        thumbnail: null,
        thumbnails,
        meta: {
            title: 'Mixed Quiz',
            description: 'Quiz made from multiple collections.'
        }
    };
</script>

<QuizPage {data} collectionIds={ids} />