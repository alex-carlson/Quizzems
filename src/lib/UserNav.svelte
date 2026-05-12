<script>
	import { user } from '$stores/user';
	import ProfilePicture from './ProfilePicture.svelte';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';
	import { faSignInAlt } from '@fortawesome/free-solid-svg-icons';

	let profileSize = 48;

	function updateProfileSize() {
		profileSize = window.innerWidth < 600 ? 28 : 48;
	}

	onMount(() => {
		updateProfileSize();
		window.addEventListener('resize', updateProfileSize);
		return () => window.removeEventListener('resize', updateProfileSize);
	});
</script>
{#if !$user}
	<li>
		<a href="/login" aria-label="Login" title="Login" class="nav-link-vertical">
			<Fa icon={faSignInAlt} class="fa-icon-large" />
			<span class="nav-label-small">Login</span>
		</a>
	</li>
{:else}
	<li class="user-tab">
		<a href="/dashboard" class="user-link">
			<ProfilePicture userId={$user.id} size={profileSize} isRound={true} />
		</a>
	</li>
{/if}
