<script lang="ts">
	import '../app.css';
	let { children } = $props();
	import { Toaster } from '$lib/components/ui/sonner';
</script>

<Toaster theme="dark" />

<div class="w-screen h-screen bg-black text-white overflow-hidden">
	{@render children()}
</div>

<style global>
	:global(body) {
		overflow: hidden;
		position: relative;
		margin: 0;
		padding: 0;
	}

	/* Position Sonner Toaster fixed in viewport and above other content */
	:global(.toaster) {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 9999;
	}

	/* Allow Sonner toasts to be visible despite global overflow hidden */
	:global(.toaster),
	:global(.toaster *) {
		overflow: visible;
	}
</style>
