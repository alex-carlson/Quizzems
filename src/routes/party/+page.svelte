<script>
	import { onDestroy, onMount } from 'svelte';
	import { supabase } from '$lib/api/supabaseClient';
	import { socket, initSocket } from '$store/socket.js';
	import { user } from '$store/user.js';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { addToast } from '../../store/toast';

	let userId = null;

	const unsubscribeUser = user.subscribe((u) => {
		userId = u?.id ?? null;
	});

	onMount(() => {
		document.title = 'Host a Match';
	});

	async function createRoom() {
		const currentUser = get(user);
		const token = currentUser?.token;

		if (!token) {
			console.error('No auth token available.');
			addToast({
				type: 'error',
				message: 'You must be logged in to create a room.'
			});
			return;
		}

		// Initialize socket with token (assuming this sets the socket store)
		initSocket(token);

		let unsubscribe; // <-- move this up

		const socketInstance = await new Promise((resolve, reject) => {
			unsubscribe = socket.subscribe((instance) => {
				if (instance) {
					unsubscribe();
					resolve(instance);
				}
			});

			// Optional: timeout after 5 seconds to avoid hanging indefinitely
			setTimeout(() => {
				if (unsubscribe) unsubscribe(); // now safe to call
				reject(new Error('Socket initialization timeout'));
			}, 5000);
		}).catch((err) => {
			console.error('Failed to get socket instance:', err.message);
			return null;
		});

		if (!socketInstance) return; // Exit if no socket
		socketInstance.off('connect');
		socketInstance.off('connect_error');
		socketInstance.off('room-created');

		// Attach connection event handlers immediately
		socketInstance.on('connect', () => {
			console.log('Socket connected:', socketInstance.id);
		});
		socketInstance.on('connect_error', (err) => {
			console.error('Socket connection error:', err.message);
		});

		// Ensure userId is loaded
		if (!userId) {
			try {
				const { data, error } = await supabase.auth.getSession();
				if (error || !data?.session) {
					console.error('[Host Page] Session error:', error?.message || 'No session found');
					return;
				}
				userId = data.session.user.id;
			} catch (err) {
				console.error('Failed to get session:', err);
				return;
			}
		}

		// Emit create-room event with payload
		socketInstance.auth = { token };
		socketInstance.emit('create-room');

		// Listen once for room-created event and handle navigation
		socketInstance.once('room-created', ({ code, room }) => {
			console.log('Room created:', code, room);
			try {
				goto(`/party/${code}`, { replaceState: true });
			} catch (err) {
				console.error('Failed during room creation navigation:', err);
			}
		});
	}
</script>

<div class="white container padding">
	<h1>Let's Party!</h1>
	<p>In party mode you can face off against your friends in the QuizzBoxx</p>
	<p>Create a room or punch in a room code to start!</p>
	<div class="party-container padding">
		<div class="party-buttons" style="display: flex; gap: 1em;">
			<button
				type="button"
				class="button"
				tabindex="0"
				style="flex: 1; padding: 0.5em 1.5em; background: #007bff; color: #fff; border: none; border-radius: 4px; text-decoration: none; font-size: 1rem; cursor: pointer; text-align: center;"
				on:click={createRoom}
			>
				Host
			</button>
			<button
				on:click={() => goto('/party/join')}
				class="button"
				role="button"
				tabindex="0"
				style="flex: 1; padding: 0.5em 1.5em; background: #28a745; color: #fff; border: none; border-radius: 4px; text-decoration: none; font-size: 1rem; cursor: pointer; text-align: center;"
			>
				Join
			</button>
		</div>
	</div>
</div>
