<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { Button } from './components/ui/button';
	import AuroraText from './AuroraText.svelte';
	import { Play } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { env } from '$env/dynamic/public';
	import { Turnstile } from 'svelte-turnstile';
  import { LoaderCircle } from '@lucide/svelte';

	let loading = $state(false);
	let token = $state('');

	function handleCaptcha(event: CustomEvent) {
		token = event.detail.token;
    handleLogin();
		console.log('Captcha solved! ');
	}

	const handleLogin = async () => {
		try {
			loading = true;
			const { data, error } = await supabase.auth.signInAnonymously({
				options: {
					captchaToken: token
				}
			});
			if (error) throw error;
			toast.success('Logged in', {
				description: 'Start playing around with your friends!',
				action: {
					label: 'Copy link',
					onClick: () => navigator.clipboard.writeText('https://pointers.technotalks.net')
				}
			});
		} catch (error) {
			if (error instanceof Error) {
				console.error(error.message);
				toast.error(error.message);
			}
		} finally {
			loading = false;
		}
	};

	// Set dark mode by default for our design
	onMount(() => {
		document.documentElement.classList.add('dark');
	});
</script>

<div class="h-screen w-full bg-black flex items-center justify-center relative overflow-hidden">
	<!-- Animated gradient background glow -->
	<div
		class="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-3xl opacity-20 animate-pulse"
	></div>
	<div
		class="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 blur-3xl opacity-20 animate-pulse"
		style="animation-delay: 1s;"
	></div>

	<!-- Glass card -->
	<div
		class="z-10 w-full max-w-md p-8 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-2xl text-center"
	>
		<div class="space-y-6">
			<h1 class="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl">
				Realtime <AuroraText>pointers</AuroraText>
			</h1>

			<form class="space-y-4" on:submit|preventDefault={handleLogin}>
				<Turnstile siteKey={env.PUBLIC_TURNSTILE_KEY} on:callback={handleCaptcha}  />
				<!--
        <Button type="submit" onclick={handleLogin}>
        
          Play <Play />
        </Button>

        -->
        <Button type="submit" class="w-32" disabled={loading}>
        
          <LoaderCircle class="animate-spin" />
        </Button>
			</form>

			<div class="space-y-1">
				<p class="text-sm text-white/60">Made with ❤️</p>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom animations for the gradient glow */
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.2;
			transform: scale(1);
		}
		50% {
			opacity: 0.3;
			transform: scale(1.1);
		}
	}

	.animate-pulse {
		animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
