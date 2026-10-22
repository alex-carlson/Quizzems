<script>
    import QuizPage from '$lib/components/quiz/QuizPage.svelte';
    import { fetchCollelctionNamesById } from '$lib/api/collections';
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

    $: data = {
        ids,
        category: collectionNames.join(', '),
        author: '',
        collectionId: null,
        thumbnail: null,
        meta: {
            title: 'Mixed Quiz',
            description: 'Quiz made from multiple collections.'
        }
    };
</script>

<QuizPage {data} collectionIds={ids} />