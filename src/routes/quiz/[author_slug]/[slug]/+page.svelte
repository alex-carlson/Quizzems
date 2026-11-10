<script>
	import QuizPage from '$lib/components/quiz/QuizPage.svelte';
	import RelatedQuizzes from '$lib/components/quiz/RelatedQuizzes.svelte';

	export let data;
</script>

<QuizPage {data} collectionIds=data.collectionId />
{#if data.collectionId && data.category}
	<RelatedQuizzes keyword={data.category} excludeId={data.collectionId} />
{/if}