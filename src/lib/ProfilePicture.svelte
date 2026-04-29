<script>
	import { user, updateProfilePictureUrl } from '../store/user';

	export let userId;
	export let isRound = true;
	export let size = 100;

	const baseUrl = import.meta.env.VITE_SUPABASE_URL;
	const bucketName = 'profilepictures';

	// Get image URL from store if available, otherwise generate it
	$: imageUrl =
		$user?.id === userId && $user?.profilePictureUrl
			? $user.profilePictureUrl
			: userId
				? `${baseUrl}/storage/v1/object/public/${bucketName}/${userId}/avatar.jpg`
				: '/avatar.png';

	// export a function to refresh the image
	export const refreshImage = () => {
		if (userId) {
			// Update the store with new timestamp to force reload
			const newUrl = `${baseUrl}/storage/v1/object/public/${bucketName}/${userId}/avatar.jpg?t=${Date.now()}`;
			console.log('Refreshing profile picture URL:', newUrl);
			updateProfilePictureUrl(userId);
			// Also update the DOM directly for immediate feedback
			const img = document.querySelector('.profile-picture img');
			if (img && img instanceof HTMLImageElement) {
				img.src = newUrl;
			}
		}
	};

	// fallback if image fails to load
	function handleError(event) {
		console.log('Error loading profile picture:', event);
		event.target.src = '/avatar.png';
	}
</script>

<div class="profile-picture">
	<img
		src={imageUrl}
		alt="Profile"
		class={isRound ? 'rounded' : ''}
		style="width: {size}px; height: {size}px; object-fit: cover;"
		on:error={handleError}
	/>
</div>
