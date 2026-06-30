<script>
    import QuizPage from '$lib/components/quiz/QuizPage.svelte';
    import { page } from '$app/stores';

    $: ids = ($page.url.searchParams.get('ids') ?? '')
        .split(',')
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));

    $: data = {
        ids,
        category: 'Mixed Quiz',
        author: '',
        collectionId: null,
        thumbnail: null,
        meta: {
            title: 'Mixed Quiz',
            description: 'Quiz made from multiple collections.'
        }
    };

    export function load({ url }) {
        const ids = (url.searchParams.get('ids') ?? '')
            .split(',')
            .map((x) => Number(x))
            .filter(Number.isFinite);

        return {
            ids
        };
    }
</script>

<QuizPage {data} collectionIds={ids}/>