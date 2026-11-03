import adapter from '@sveltejs/adapter-auto';

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
