<script>
	import { user } from '$store/user';
	import ProfilePicture from './ProfilePicture.svelte';
	import { onMount } from 'svelte';

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

{#if $user}
	<li class="user-tab">
		<a href="/dashboard" class="user-link">
			<ProfilePicture userId={$user.id} size={profileSize} isRound={true} />
		</a>
	</li>
{/if}
