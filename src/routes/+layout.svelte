<script>
	import '../scss/custom.scss';
	import Header from '$lib/Header.svelte';
	import Footer from '$lib/Footer.svelte';
	import Toasts from '$lib/components/Toasts.svelte';
	import { onDestroy } from 'svelte';
	import { cleanupAuthSubscriptions } from '$store/user';

	export let data;

	const meta = {
		title: data.meta?.title ?? 'Quizzems - Bar Trivia with Attitude',
		description:
			data.meta?.description ??
			'Make your brain bigger and smarter, fight your friends! Waste an afternoon.',
		image: data.meta?.image ?? '/ogimage.jpg',
		url: data.meta?.url ?? 'https://quizzems.com',
		siteName: 'Quizzems',
		themeColor: '#6F1D1B'
	};

	// Cleanup auth subscriptions on app unmount
	onDestroy(() => {
		cleanupAuthSubscriptions();
	});
</script>

<Header />
<main>
	<slot />
	<Toasts position="top-right" />
</main>
<Footer />
