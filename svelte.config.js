import adapter from '@sveltejs/adapter-cloudflare';

const config = {
	kit: {
		adapter: adapter(),
		prerender: {
			entries: [],
			handleMissingId: 'ignore'
		}
		// prerender: {
		// 	entries: ['*']
		// }
	}
};

export default config;
