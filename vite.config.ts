import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit()
	],
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler',
				quietDeps: true,
				// Remove additionalData to avoid conflicts with @use statements
				// Global imports should be handled in the main SCSS file instead
				loadPaths: ['node_modules', 'src/scss'],
			}
		},
		// Enable CSS code splitting
		devSourcemap: true,
	},
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			$components: path.resolve('./src/lib/components'),
			$stores: path.resolve('./src/stores'),
			$scss: path.resolve('./src/scss'),
		}
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./src/setupTests.ts'] // optional, create this if needed
	},
	build: {
		cssMinify: 'lightningcss',
		// Optimize CSS chunking
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					if (assetInfo.name?.endsWith('.css')) {
						return 'assets/css/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				}
			}
		}
	},
	// Optimize dev server
	server: {
		hmr: {
			overlay: false // Disable overlay for CSS errors in dev
		}
	}
});
