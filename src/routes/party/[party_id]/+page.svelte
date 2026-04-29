<script>
	import { onMount, onDestroy } from 'svelte';
	import { socket, disconnectSocket } from '$store/socket.js';
	import { user } from '$store/user.js';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import FlashCards from '$lib/FlashCards.svelte';
	import Search from '$lib/Search.svelte';
	import RandomItems from '$lib/RandomItems.svelte';
	import ProfilePicture from '$lib/ProfilePicture.svelte';
	import { faFlag } from '@fortawesome/free-solid-svg-icons';
	import { addToast } from '$store/toast.js';
	import Fa from 'svelte-fa';
	import Beer from '$lib/components/Beer.svelte';
	import { fetchCollectionById } from '$lib/api/collections';

	let party_id = null;
	let partyData = null;
	let authorName = null; // Assuming you might want to display the author's name
	let collectionName = null; // Assuming you might want to display the collection name
	let flashCardsRef;
	let isHost = false;
	let collection = null;
	let socketInstance = null;

	// Subscribe to socket store
	const unsubscribeSocket = socket.subscribe((instance) => {
		socketInstance = instance;
	});

	// Subscribe to user store (if you need user info here)
	let currentUser;
	const unsubscribeUser = user.subscribe((u) => {
		currentUser = u;
	});

	function startGame() {
		if (!partyData || !isHost) return;

		console.log('Host starting game for party:', party_id);
		addToast({
			type: 'info',
			message: 'Starting game...'
		});

		// Don't update local state until server confirms
		// partyData.isStarted = true;

		// Generate shuffle seed for synchronized card order across all clients

		socketInstance.emit('start-game', {
			code: party_id
		});
	}

	// Setup socket event listeners when socket is ready
	function setupSocketListeners() {
		if (!socketInstance) return;

		// Remove any previous listeners to avoid duplicates
		socketInstance.off('room-update');
		socketInstance.off('game-started');
		socketInstance.off('game-state-response');
		socketInstance.off('score-updated');
		socketInstance.off('player-gave-up');
		socketInstance.off('game-finished');
		socketInstance.off('room-closed');
		socketInstance.off('room-reset');
		socketInstance.off('collection-changed');

		socketInstance.on('room-update', (room) => {
			console.log('Room updated:', room);
			// if room.collectionId changed, fetch collection info
			if (room.collectionId && room.collectionId !== partyData?.collectionId) {
				// getCollectionInformation(room.collectionId);
			}

			// Handle late join: if game is in progress, sync revealed cards
			const wasGameStarted = partyData?.isStarted;
			const isGameStartedNow = room.isStarted;

			partyData = {
				...partyData,
				...room
			};

			// If joining a game that's already in progress, sync the revealed cards
			if (!wasGameStarted && isGameStartedNow && room.cards && room.cards.length > 0) {
				console.log('Syncing revealed cards for late join:', room.cards);
				// Wait for FlashCards component to be ready, then sync revealed state
				setTimeout(() => {
					if (flashCardsRef && room.cards) {
						room.cards.forEach((cardIndex, arrayIndex) => {
							console.log('Setting card revealed for late join:', cardIndex, arrayIndex);
							flashCardsRef.setRevealed(cardIndex, true, arrayIndex);
						});
					}
				}, 100);
			}

			updatePre();
		});

		socketInstance.on('game-started', (data) => {
			console.log('Game started:', data);
			addToast({
				type: 'success',
				message: 'Game started!'
			});
			partyData = { ...partyData, isStarted: true, ...data };

			// Apply shuffle seed for synchronized card order
			if (data.shuffleSeed) {
				console.log('Applying shuffle seed for synchronized order:', data.shuffleSeed);
				// Wait longer for FlashCards component to render and initialize
				setTimeout(() => {
					if (flashCardsRef) {
						// Access the quiz store from FlashCards and set shuffle seed
						flashCardsRef.setShuffleSeed(data.shuffleSeed);
						// Trigger shuffle with the seed
						flashCardsRef.shuffleCards(data.shuffleSeed);
					} else {
						console.warn('FlashCards not ready yet, retrying shuffle...');
						// Retry after another delay
						setTimeout(() => {
							if (flashCardsRef) {
								flashCardsRef.setShuffleSeed(data.shuffleSeed);
								flashCardsRef.shuffleCards(data.shuffleSeed);
							} else {
								console.error('FlashCards still not ready for shuffle');
							}
						}, 200);
					}
				}, 200);
			}

			// If there are already revealed cards (late join scenario), sync them
			if (data.cards && data.cards.length > 0) {
				console.log('Syncing revealed cards from game-started event:', data.cards);
				setTimeout(() => {
					if (flashCardsRef && data.cards) {
						data.cards.forEach((cardIndex, arrayIndex) => {
							console.log('Setting card revealed from game-started:', cardIndex, arrayIndex);
							flashCardsRef.setRevealed(cardIndex, true, arrayIndex);
						});
					}
				}, 100);
			}

			updatePre();
		});
		socketInstance.on('score-updated', (data) => {
			const { scores: newScores, cardIndex, playerId: pID, cards } = data;

			// Merge new scores
			partyData = {
				...partyData,
				scores: {
					...(partyData.scores || {}),
					...newScores
				},
				cards: cards || partyData.cards || []
			};

			// Sort players by score descending
			if (partyData.scores && partyData.players) {
				partyData.players = [...partyData.players].sort(
					(a, b) => (partyData.scores[b] || 0) - (partyData.scores[a] || 0)
				);
			}

			// loop through partyData.cards
			if (partyData.cards && partyData.cards.length > 0) {
				// for each card, call flashCardsRef.setRevealed(key, true, val)
				partyData.cards.forEach((key, index) => {
					console.log('Setting card revealed:', key, index);
					flashCardsRef.setRevealed(key, true, index);
				});
			}

			updatePre();

			if (flashCardsRef) {
				flashCardsRef.setRevealed(cardIndex, true, pID);
			} else {
				// try to set the ref
				console.warn('FlashCards reference not ready yet');
			}
		});

		socketInstance.on('player-gave-up', (data) => {
			const { playerId, finishedPlayers } = data;
			console.log('Player gave up:', playerId);
			// set partyData.finishedPlayers to the new array
			partyData = {
				...partyData,
				finishedPlayers: finishedPlayers || []
			};

			updatePre();
		});

		socketInstance.on('game-finished', () => {
			console.log('Game finished');
			// Handle game finish logic here, e.g., show results or reset state
			partyData = {
				...partyData,
				isStarted: false,
				isFinished: true,
				finishedPlayers: []
			};
			updatePre();
		});

		socketInstance.on('room-closed', () => {
			console.log('Room closed');
			// Handle room closed logic here, e.g., redirect or show message
			partyData = null;
			document.title = 'Party Closed';
			updatePre();
			window.location.hash = '/party';
		});

		socketInstance.on('room-reset', (data) => {
			console.log('Room reset:', data);
			// Reset partyData to initial state
			partyData = {
				...partyData,
				isStarted: false,
				isFinished: false,
				scores: {},
				finishedPlayers: [],
				collectionId: data.collectionId || null
			};
			updatePre();
		});
		socketInstance.on('collection-changed', async (data) => {
			console.log('Collection changed:', data);
			// updated partydata with data
			partyData = {
				...partyData,
				...data
			};
			try {
				const d = await fetchCollectionById(data.collectionId);
				if (d) {
					collection = d;
					collectionName = d.category;
					authorName = d.author; // Assuming you have authorName in the collection data
					console.log('new collection data:', d);
				} else {
					collectionName = null;
					authorName = null;
				}
			} catch (error) {
				console.error('Error fetching collection data:', error);
				collectionName = null;
				authorName = null;
			}
			updatePre();
		});

		// Handler for game state response when joining a game in progress
		socketInstance.on('game-state-response', (gameState) => {
			console.log('Received current game state:', gameState);

			if (gameState && gameState.isStarted) {
				// Update party data with current game state
				partyData = {
					...partyData,
					...gameState
				};

				// Apply shuffle seed first if available
				if (gameState.shuffleSeed && flashCardsRef) {
					console.log('Applying shuffle seed for late joiner:', gameState.shuffleSeed);
					setTimeout(() => {
						if (flashCardsRef) {
							flashCardsRef.setShuffleSeed(gameState.shuffleSeed);
							flashCardsRef.shuffleCards(gameState.shuffleSeed);
						}
					}, 100);
				}

				// Sync revealed cards if any
				if (gameState.cards && gameState.cards.length > 0) {
					console.log('Syncing revealed cards from game state:', gameState.cards);
					setTimeout(() => {
						if (flashCardsRef && gameState.cards) {
							gameState.cards.forEach((cardIndex, arrayIndex) => {
								console.log('Game state sync - setting card revealed:', cardIndex, arrayIndex);
								flashCardsRef.setRevealed(cardIndex, true, arrayIndex);
							});
						}
					}, 200);
				}

				updatePre();
			}
		});
	}

	function updatePre() {
		// This function is not used in the current code, but can be used to update the pre element
		// if needed in the future.
		const preElement = document.getElementById('party-data');
		if (preElement) {
			preElement.textContent = JSON.stringify(partyData, null, 2);
		}
	}

	onMount(() => {
		async function init() {
			const params = get(page).params;

			if (params && params.party_id) {
				party_id = params.party_id;
				await getPartyData(party_id);
			}

			// Wait for socket instance to be ready, then setup listeners & join room
			const waitForSocket = setInterval(() => {
				if (socketInstance) {
					setupSocketListeners();
					// Join the room when socket is ready
					if (party_id) {
						socketInstance.emit('join-room', { code: party_id });
						// Request current game state in case we're joining a game in progress
						socketInstance.emit('request-game-state', { code: party_id });
					}
					clearInterval(waitForSocket);
				}
			}, 100);
		}

		init();
	});

	onDestroy(() => {
		if (socketInstance) {
			disconnectSocket();
		}

		unsubscribeSocket();
		unsubscribeUser();
	});

	async function getPartyData(party_id) {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/party/${party_id}`);
			const data = await response.json();
			document.title = `Party - ${data.name || 'Unknown Party'}`;
			partyData = data;
			updatePre();

			partyData.hostId = data.hostId;
			partyData.collectionId = data.collectionId;

			// Load collection if collectionId exists
			if (data.collectionId) {
				try {
					console.log('Loading collection for party:', data.collectionId);
					const collectionData = await fetchCollectionById(data.collectionId);
					if (collectionData) {
						collection = collectionData;
						collectionName = collectionData.category;
						authorName = collectionData.author;
						console.log('Collection loaded:', collectionData);
					} else {
						console.warn('Collection not found:', data.collectionId);
						collectionName = null;
						authorName = null;
						collection = null;
					}
				} catch (collectionError) {
					console.error('Error loading collection:', collectionError);
					collectionName = null;
					authorName = null;
					collection = null;
				}
			}

			// If joining a game that's already in progress, sync revealed cards
			if (partyData.isStarted && partyData.cards && partyData.cards.length > 0) {
				console.log('Joining game in progress - syncing revealed cards:', partyData.cards);

				// Apply shuffle seed if available
				if (partyData.shuffleSeed && flashCardsRef) {
					console.log('Applying initial shuffle seed:', partyData.shuffleSeed);
					setTimeout(() => {
						if (flashCardsRef) {
							flashCardsRef.setShuffleSeed(partyData.shuffleSeed);
							flashCardsRef.shuffleCards(partyData.shuffleSeed);
						}
					}, 300);
				}

				// Use a longer timeout since we're just initializing
				setTimeout(() => {
					if (flashCardsRef && partyData.cards) {
						partyData.cards.forEach((cardIndex, arrayIndex) => {
							console.log('Initial sync - setting card revealed:', cardIndex, arrayIndex);
							flashCardsRef.setRevealed(cardIndex, true, arrayIndex);
						});
					}
				}, 500);
			}
		} catch (error) {
			console.error('Error fetching party data:', error);
			addToast({
				type: 'error',
				message: 'Failed to fetch party data. Please try again later.'
			});
		}
	}

	function scorePoint(cardIndex) {
		// If cardIndex is an object with an 'index' property, extract it
		const idx =
			typeof cardIndex === 'object' && cardIndex !== null && 'index' in cardIndex
				? cardIndex.index
				: cardIndex;
		socketInstance.emit('score-point', {
			code: party_id,
			playerId: currentUser?.id || localStorage.getItem('playerId'),
			cardIndex: idx
		});
	}

	function giveUp() {
		socketInstance.emit('give-up', {
			code: party_id,
			playerId: currentUser?.id || localStorage.getItem('playerId')
		});
	}

	// Reactive update if route param changes
	$: {
		const params = get(page).params;

		if (params?.party_id && params.party_id !== party_id) {
			party_id = params.party_id;
			getPartyData(party_id);

			// Rejoin the new room if socket is connected
			if (socketInstance) {
				socketInstance.emit('join-room', { code: party_id });
				// Request current game state in case we're joining a game in progress
				socketInstance.emit('request-game-state', { code: party_id });
			}
		}
	}

	$: isHost = currentUser?.id && partyData?.hostId && currentUser.id === partyData.hostId;
</script>

<div class="container white partymode">
	<div class="padding">
		<pre class="debug-box padding" id="party-data" style="display: none"></pre>
		<h1 class="room-label">{party_id}</h1>

		<!-- Connected players -->
		{#if partyData?.players?.length > 0 && !partyData.isStarted}
			<p>Connected players:</p>
			<ul class="players-list py-3">
				{#each partyData.players as player}
					<li><ProfilePicture userId={player} size={32} /></li>
				{/each}
			</ul>
		{/if}

		<!-- Category Picker -->
		{#if partyData && !partyData.isStarted && !partyData.isFinished}
			<div class="categoryPicker padding py-5">
				{#if isHost}
					{#if collection}
						<div class="preview">
							<div class="thumbnail">
								<img src={collection.thumbnail_url} alt={collection.category} />
							</div>
							<div class="details">
								<h3>Category: {collection.category}</h3>
								<p>Author: {collection.author}</p>
							</div>
						</div>
					{/if}
					<Search
						on:SearchItemClicked={(e) => {
							socketInstance.emit('set-collection', {
								code: party_id,
								collectionId: e.detail.id
							});
						}}
					/>
					<h3>Not sure what to pick?</h3>
					<p>How about one of these?</p>
					<RandomItems
						onCollectionClick={(e) => {
							socketInstance.emit('set-collection', {
								code: party_id,
								collectionId: e.id
							});
						}}
					/>
				{:else if collectionName}
					<div class="preview">
						<div class="thumbnail">
							<img src={collection.thumbnail_url} alt={collection.category} />
						</div>
						<div class="details">
							<h3>Category: {collection.category}</h3>
							<p>Author: {collection.author}</p>
						</div>
					</div>
				{:else}
					<p>No category selected yet.</p>
				{/if}
			</div>
		{/if}

		<!-- Start Game Button -->
		{#if isHost && partyData && !partyData.isStarted && !partyData.isFinished && partyData.collectionId}
			<button class="button" on:click={startGame}>Start Game</button>
		{/if}

		<!-- Game Finished -->
		{#if partyData?.isFinished}
			<h2>That's a wrap!</h2>
			<Beer width={100} height={160} />
			<ul class="final-scores-list padding">
				{#each partyData.players as playerId}
					<li>
						<ProfilePicture userId={playerId} size={32} />
						<span>{partyData.scores[playerId] || 0}</span>
					</li>
				{/each}
			</ul>

			{#if isHost}
				<div class="button-group">
					<button class="button" on:click={() => socketInstance.emit('close-room', party_id)}>
						Close Lobby
					</button>
					<button class="button" on:click={() => socketInstance.emit('reset-room', party_id)}>
						New Category
					</button>
				</div>
			{/if}
		{/if}

		<!-- Game In Progress -->
		{#if partyData?.isStarted && !partyData.isFinished}
			<ul class="scores-list padding">
				{#each Object.entries(partyData.scores) as [playerId, score]}
					<li class:finishedPlayer={partyData.finishedPlayers?.includes(playerId)}>
						<ProfilePicture userId={playerId} size={32} />
						<span>{score}</span>
					</li>
				{/each}
			</ul>

			<FlashCards
				collectionId={partyData.collectionId}
				isPartyMode={true}
				bind:this={flashCardsRef}
				on:correctAnswer={(e) => scorePoint(e.detail)}
			/>

			<button class="button" on:click={giveUp}>
				Give Up <Fa icon={faFlag} style="margin-left: 0.5rem" />
			</button>
		{/if}

		<!-- Waiting State -->
		{#if partyData && !partyData.isStarted && !partyData.isFinished}
			{#if isHost && !partyData.collectionId}
				<p>Select a category to start the match</p>
			{:else if !isHost}
				<p>The game has not started yet. Waiting for the host to start...</p>
			{/if}
		{/if}
	</div>
</div>
