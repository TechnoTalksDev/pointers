<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { AuthSession } from '@supabase/supabase-js';
	import Login from '$lib/login.svelte';
	import Pointers from '$lib/pointers.svelte';

	let session: AuthSession | null;

	onMount(() => {
		supabase.auth.getSession().then(({ data }) => {
			session = data.session;
		});

		supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
		});
	});
</script>

<div class="flex flex-col items-center justify-center w-full h-full overflow-hidden cursor-default">
	{#if !session}
		<Login />
	{:else}
		<Pointers {session} />
	{/if}
</div>
