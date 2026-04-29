<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$store/user';
	import {
		signInWithEmail,
		signUpWithEmail,
		createProfileIfMissing,
		signInWithGoogle
	} from '$lib/api/auth';
	import { supabase } from '$lib/api/supabaseClient';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let errorMsg = '';
	let isLogin = true;

	// 🔁 Check for existing session on mount
	onMount(async () => {
		document.title = isLogin ? 'Login' : 'Sign Up';
		const { data, error } = await supabase.auth.getSession();
		if (data.session) {
			goto('/dashboard');
		}
	});

	async function handleSubmit() {
		errorMsg = '';

		if (!email || !password) {
			errorMsg = 'Please fill out all required fields.';
			return;
		}

		try {
			if (isLogin) {
				console.log('Logging in...');
				const { session, user: loggedInUser } = await signInWithEmail(email, password);

				if (loggedInUser) {
					// Ensure session token is persisted
					await new Promise((resolve) => setTimeout(resolve, 100));

					// Try to fetch a fresh session just in case
					const { data: refreshedSession } = await supabase.auth.getSession();
					if (!refreshedSession.session) {
						throw new Error('Session not yet available after login');
					}

					// Create profile only if missing
					const displayNameFinal = loggedInUser.email?.split('@')[0];
					await createProfileIfMissing(loggedInUser.id, displayNameFinal);

					// go to dashboard
					goto('/dashboard');
				}
			} else {
				const { user: newUser } = await signUpWithEmail(email, password);
				if (newUser) {
					alert('Please check your email to confirm your account.');
				}
			}
		} catch (error) {
			errorMsg = error.message ?? 'An error occurred. Please try again.';
		}
	}
</script>

<div class="container white py-3">
	{#if !$user}
		<h1>
			{isLogin ? 'Log In' : 'Sign Up'} or
			<a
				style="text-decoration: underline; cursor: pointer;"
				on:click|preventDefault={() => (isLogin = !isLogin)}>{isLogin ? 'Sign Up' : 'Log In'}</a
			>
		</h1>
		<form class="form white" on:submit|preventDefault={handleSubmit}>
			<div class="group padding">
				<label>
					Email
					<input type="email" placeholder="Email" bind:value={email} required />
				</label>
				<label>
					Password
					<input type="password" placeholder="Password" bind:value={password} required />
				</label>

				<button type="submit">{isLogin ? 'Log In' : 'Sign Up'}</button>
			</div>
			or
			<div class="padding">
				<button class="google-button" on:click={signInWithGoogle}>
					<img
						src="/google.svg"
						alt="Google Icon"
						width="25"
						height="25"
						style="margin-right: 0.5rem;"
					/>
					Sign in with Google
				</button>
				{#if errorMsg}
					<p style="color: red">{errorMsg}</p>
				{/if}
			</div>
		</form>
	{/if}
</div>
