<script>
	import { user, setUserBio } from '$store/user';
	import { getSession } from '$lib/api/supabaseClient';
	import { updateUsername, updateEmail } from '$lib/api/auth';
	import { get } from 'svelte/store';

	let message = '';
	let file = null;
	let userId = null;

	// Track original values to detect changes
	let originalEmail = '';
	let originalUsername = '';
	let originalBio = '';

	$: userId = get(user)?.id ?? null;

	// Initialize original values when user data loads
	$: if ($user && !originalEmail) {
		originalEmail = $user.email || '';
		originalUsername = $user.username || '';
		originalBio = $user.bio || '';
	}

	// Check if any changes have been made
	$: hasChanges =
		$user?.email !== originalEmail ||
		$user?.username !== originalUsername ||
		$user?.bio !== originalBio ||
		(file && file.length > 0);

	async function getAuthHeaders() {
		const { data: sessionData, error: sessionError } = await getSession();
		if (sessionError || !sessionData?.session) {
			throw new Error('User session not found');
		}
		return {
			Authorization: `Bearer ${sessionData.session.access_token}`
		};
	}

	async function convertImageToJPG(file) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const reader = new FileReader();

			reader.onload = (e) => {
				img.src = e.target.result;
			};

			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;

				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);

				// Convert to JPEG Blob (quality 0.92 is default for good compression vs. quality)
				canvas.toBlob(
					(blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error('Failed to convert image to JPG'));
						}
					},
					'image/jpeg',
					0.92
				);
			};

			img.onerror = (err) => reject(err);
			reader.onerror = (err) => reject(err);

			reader.readAsDataURL(file);
		});
	}

	async function uploadProfilePicture(file) {
		const headers = await getAuthHeaders();
		if (file) {
			const jpgBlob = await convertImageToJPG(file[0]);

			const formData = new FormData();
			formData.append('file', jpgBlob, 'avatar.jpg');
			formData.append('uuid', $user.id);
			formData.append('folder', $user.id);
			formData.append('bucket', 'profilepictures');
			formData.append('fileName', `avatar.jpg`);
			const response = await fetch(`${import.meta.env.VITE_API_URL}${'/users/uploadAvatar'}`, {
				method: 'POST',
				headers,
				body: formData
			});
		}
	}
	async function updateBio() {
		const bio = $user.bio;
		if (!userId) {
			message = 'User ID not found';
			return;
		}

		const updated = await setUserBio(userId, bio);
		if (updated) {
			message = 'Bio updated successfully!';
		} else {
			message = 'Failed to update bio.';
		}
	}

	async function revertSettings() {
		$user.email = originalEmail;
		$user.username = originalUsername;
		$user.bio = originalBio;
		file = null; // Clear the file input
		message = 'Settings reverted to original values.';
	}

	async function saveSettings() {
		message = 'Saving settings...';
		let success = true;
		let errors = [];

		try {
			// Update email
			const emailResult = await updateEmail($user.email);
			if (!emailResult) {
				errors.push('Failed to update email');
				success = false;
			}
		} catch (error) {
			errors.push('Email update error');
			success = false;
		}

		try {
			// Update username
			const usernameResult = await updateUsername($user.username);
			if (!usernameResult) {
				errors.push('Failed to update username');
				success = false;
			}
		} catch (error) {
			errors.push('Username update error');
			success = false;
		}

		try {
			// Update bio
			if (!userId) {
				errors.push('User ID not found');
				success = false;
			} else {
				const bioResult = await setUserBio(userId, $user.bio);
				if (!bioResult) {
					errors.push('Failed to update bio');
					success = false;
				}
			}
		} catch (error) {
			errors.push('Bio update error');
			success = false;
		}

		// Handle profile picture upload if a file is selected
		if (file && file.length > 0) {
			try {
				await uploadProfilePicture(file);
			} catch (error) {
				errors.push('Failed to upload profile picture');
				success = false;
			}
		}

		if (success) {
			message = 'All settings saved successfully!';
			file = null; // Clear the file input after successful upload

			// Reset original values to current values
			originalEmail = $user.email || '';
			originalUsername = $user.username || '';
			originalBio = $user.bio || '';
		} else {
			message = `Some updates failed: ${errors.join(', ')}`;
		}
	}
</script>

{#if $user}
	<div class="form">
		<div class="profile-picture white padding">
			<label for="profile-picture-input"><strong>Update Profile Picture</strong></label>
			<input
				id="profile-picture-input"
				type="file"
				accept="image/*"
				bind:files={file}
				multiple={false}
			/>
		</div>
		<div class="text-field padding">
			<label>
				<strong>Email:</strong>
				<input type="email" bind:value={$user.email} />
			</label>
		</div>
		<div class="text-field padding">
			<label>
				<strong>Display Name:</strong>
				<input type="text" bind:value={$user.username} />
			</label>
		</div>
		<div class="text-field padding">
			<label>
				<strong>Bio:</strong>
				<textarea bind:value={$user.bio}></textarea>
			</label>
		</div>

		{#if hasChanges}
			<div
				class="save-section padding d-flex justify-content-center gap-3 flex-wrap flex-sm-nowrap"
			>
				<button class="btn btn-secondary" on:click={revertSettings}>Revert Changes</button>
				<button class="btn btn-success" on:click={saveSettings}>Save Changes</button>
			</div>
		{/if}

		<p>{message}</p>
	</div>
{:else}
	<p>Loading profile...</p>
{/if}

<style>
	.save-section {
		text-align: center;
		margin-top: 1rem;
	}

	.save-all-btn {
		background: #4caf50;
	}

	.save-all-btn:hover {
		background: #45a049;
	}

	.save-all-btn:active {
		transform: translateY(1px);
	}
</style>
