// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { ComponentType } from 'svelte';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Enhanced images support
declare module '*.jpg?enhanced' {
	const value: ComponentType;
	export default value;
}

declare module '*.jpeg?enhanced' {
	const value: ComponentType;
	export default value;
}

declare module '*.png?enhanced' {
	const value: ComponentType;
	export default value;
}

declare module '*.webp?enhanced' {
	const value: ComponentType;
	export default value;
}

export { };
