<script>
	import QuizPage from '$lib/components/quiz/QuizPage.svelte';

	export let data;
</script>

<QuizPage {data} collectionIds=data.collectionId />