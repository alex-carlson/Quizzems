<script>
	import { user } from '../stores/user';
	import Fa from 'svelte-fa';
	import {
		faHome,
		faInfoCircle,
		faUsers,
		faTrophy,
		faSignInAlt,
		faCompass
	} from '@fortawesome/free-solid-svg-icons';
	import { page } from '$app/stores';

	// Navigation links with icons and alt text
	const navLinks = [
		{ href: '/', label: 'Home', path: '/', icon: faHome, alt: 'Home' },
		{ href: '/about', label: 'About', path: '/about', icon: faInfoCircle, alt: 'About' },
		{ href: '/party', label: 'Party', path: '/party', icon: faUsers, alt: 'Party' },
		{
			href: '/leaderboard',
			label: 'Leaderboard',
			path: '/leaderboard',
			icon: faTrophy,
			alt: 'Leaderboard'
		},
		{ href: '/explore', label: 'Explore', path: '/explore', icon: faCompass, alt: 'Explore' }
	];
</script>

		{#each navLinks as { href, label, icon, alt, path } (href)}
			<li class:active={$page.url.pathname === path}>
				<a {href} aria-label={alt} title={label} class="nav-link-vertical">
					<Fa {icon} class="fa-icon-large" />
					<span class="nav-label-small">{label}</span>
				</a>
			</li>
		{/each}