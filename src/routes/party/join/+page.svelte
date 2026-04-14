<script>
	import { onDestroy } from 'svelte';
	import { socket, initSocket } from '$store/socket.js';
	import { user } from '$store/user.js';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';

	let roomCode = '';

	async function joinRoom() {
		if (!roomCode) {
			alert('Please enter a room code.');
			return;
		}

		const currentUser = get(user);
		const token = currentUser?.token;

		// Initialize socket with token only if it exists
		if (token) {
			initSocket(token);
		} else {
			initSocket();
		}

		// Wait for socket instance from the store
		const socketInstance = await new Promise((resolve) => {
			const unsubscribe = socket.subscribe((instance) => {
				if (instance) {
					unsubscribe();
					resolve(instance);
				}
			});
		});

		socketInstance.on('connect', () => {
			console.log('Socket connected:', socketInstance.id);
		});

		socketInstance.on('connect_error', (err) => {
			console.error('Socket connection error:', err.message);
		});

		// Emit join-room event
		socketInstance.emit('join-room', { code: roomCode });

		// Listen once for room-update event to confirm join
		socketInstance.once('room-update', (room) => {
			console.log('Joined room:', room);

			goto(`/party/${room.roomCode}`, {
				state: { room },
				replaceState: true
			});
		});
	}

	onDestroy(() => {
		// Optional: clean up socket event listener
		const socketInstance = get(socket);
		if (socketInstance) {
			socketInstance.off('room-update');
		}
	});
</script>

<div class="container white">
	<h1>Join a Quizzboxx</h1>

	<div class="join-container padding">
		<div class="padding">
			<input type="text" placeholder="Enter room code" bind:value={roomCode} class="join-input" />
		</div>

		<div class="padding">
			<button on:click={joinRoom} class="button">Join Room</button>
		</div>
	</div>
</div>
