<script lang="ts">
	import { browser } from '$app/environment';
	import { backOut, cubicIn, cubicOut } from 'svelte/easing';
	import { Tween, tweened } from 'svelte/motion';
	import { supabase } from '$lib/supabaseClient';
	import { MousePointer2 } from '@lucide/svelte';
	import { randomColor } from './utils';
	import { on } from 'svelte/events';
	import { onMount, onDestroy } from 'svelte';
	import type { AuthSession } from '@supabase/supabase-js';
	import Button from './components/ui/button/button.svelte';

	interface Props {}
	let { session }: { session: AuthSession | null } = $props();

	// Define cursor type
	type Cursor = {
		id: string;
		x: number;
		y: number;
		color: string;
		tween?: {
			x: Tween<number>;
			y: Tween<number>;
		};
	};

	// Store other cursors with tweened positions
	let cursors: Record<string, Cursor> = $state({});

	// Latency tracking
	let latency = $state(0);
	let lastPingSent = $state(0);
	let pingIntervalId: number | undefined;

	let x = new Tween(0, {
		duration: 250,
		easing: cubicOut
	});

	let y = new Tween(0, {
		duration: 250,
		easing: cubicOut
	});

	function mouseMove(event: { clientX: number; clientY: number }) {
		x.set(event.clientX);
		y.set(event.clientY);

		// Broadcast cursor position when it changes
		if (session?.user.id) {
			broadcastCursorPosition(session.user.id);
		}
	}

	let color = randomColor();
	const BROADCAST_CHANNEL = 'cursors';
	const PING_CHANNEL = 'latency-ping';

	// Throttle function to limit the rate of broadcasts
	let lastBroadcast = 0;
	const THROTTLE_MS = 50; // Only send updates every 50ms

	async function broadcastCursorPosition(userId: string) {
		const now = Date.now();
		if (now - lastBroadcast < THROTTLE_MS) return;

		lastBroadcast = now;
		await supabase.channel(BROADCAST_CHANNEL).send({
			type: 'broadcast',
			event: 'cursor-position',
			payload: {
				id: userId,
				x: x.current,
				y: y.current,
				color: color
			}
		});
	}

	// Function to measure latency
	async function measureLatency() {
		lastPingSent = Date.now();
		await supabase.channel(PING_CHANNEL).send({
			type: 'broadcast',
			event: 'ping',
			payload: {
				timestamp: lastPingSent,
				userId: session?.user.id
			}
		});
	}

	let channel: any;
	let pingChannel: any;

	function setupRealtime() {
		if (!browser || !session?.user.id) return;

		// Create and subscribe to the cursor channel
		channel = supabase.channel(BROADCAST_CHANNEL, {
			config: {
				broadcast: {
					self: false // Don't receive your own broadcasts
				}
			}
		});

		channel
			.on('broadcast', { event: 'cursor-position' }, (payload: any) => {
				const receivedCursor = payload.payload as Cursor;

				// Make sure we're not displaying our own cursor (double-check)
				if (receivedCursor.id !== session?.user.id) {
					// If cursor already exists, update its position
					if (cursors[receivedCursor.id]) {
						updateCursorPosition(cursors[receivedCursor.id], receivedCursor.x, receivedCursor.y);
					} else {
						// Create a new tweened cursor
						cursors[receivedCursor.id] = createTweenedCursor(receivedCursor);
					}
				}
			})
			.on('presence', { event: 'sync' }, () => {
				// Handle presence changes if needed
			})
			.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
				// Handle user join if needed
			})
			.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
				// Remove cursors when users leave
				for (const presence of leftPresences) {
					if (presence.user_id) {
						delete cursors[presence.user_id];
					}
				}
			})
			.subscribe(async (status: string) => {
				if (status === 'SUBSCRIBED') {
					await channel.track({
						user_id: session?.user.id,
						online_at: new Date().toISOString()
					});
				}
				// Setup ping channel for latency measurement
				pingChannel = supabase.channel(PING_CHANNEL, {
					config: {
						broadcast: {
							self: true // We need to receive our own pings
						}
					}
				});

				pingChannel
					.on('broadcast', { event: 'ping' }, (payload: any) => {
						const data = payload.payload;

						// Only process our own pings
						if (data.userId === session?.user.id) {
							// Calculate latency (round-trip time)
							latency = Math.round((Date.now() - data.timestamp) / 2); // Divide by 2 for one-way latency
							console.log('Latency:', latency, 'ms');
						}
					})
					.subscribe();

				// Start measuring latency
				pingIntervalId = window.setInterval(measureLatency, 2000);
			});
	}

	// Create a tweened cursor position
	function createTweenedCursor(cursor: Cursor): Cursor {
		return {
			...cursor,
			tween: {
				x: new Tween(cursor.x, {
					duration: 250,
					easing: cubicOut
				}),
				y: new Tween(cursor.y, {
					duration: 250,
					easing: cubicOut
				})
			}
		};
	}

	// Update a cursor's tweened position
	function updateCursorPosition(cursor: Cursor, newX: number, newY: number) {
		if (!cursor.tween) {
			cursor.tween = {
				x: new Tween(newX, {
					duration: 250,
					easing: cubicOut
				}),
				y: new Tween(newY, {
					duration: 250,
					easing: cubicOut
				})
			};
		} else {
			cursor.tween.x.set(newX);
			cursor.tween.y.set(newY);
		}
	}

	$effect(() => {
		if (browser) {
			document.addEventListener('mousemove', mouseMove);
		}
	});

	onMount(() => {
		setupRealtime();
	});

	onDestroy(() => {
		// Clean up Realtime subscription
		if (channel) {
			channel.unsubscribe();
		}
		if (pingChannel) {
			pingChannel.unsubscribe();
		}
		if (browser) {
			document.removeEventListener('mousemove', mouseMove);
			if (pingIntervalId) {
				clearInterval(pingIntervalId);
			}
		}
	});
</script>

<div
	class="w-fit h-fit absolute pointer-events-none current-user-cursor"
	style="top: {y.current - 15}px; left: {x.current - 15}px; --cursor-color: {color};"
>
	<MousePointer2 class="w-[30px] h-[30px]" fill={color} {color} />
</div>

<img
	alt="avatar"
	src="https://avatar.vercel.sh/{session?.user.id}"
	class="w-[30x] h-[30px] scale-75 absolute pointer-events-none overflow-hidden rounded-full outline-white outline-2 outline-dashed"
	style="top: {y.current - 15}px; left: {x.current + 25}px;"
/>

<!-- Render all other users' cursors with tweened positions -->
{#each Object.values(cursors).filter((cursor) => cursor.id !== session?.user.id) as cursor (cursor.id)}
	<div
		class="w-fit h-fit absolute pointer-events-none overflow-hidden"
		style="top: {cursor.tween ? cursor.tween.y.current - 15 : cursor.y - 15}px; left: {cursor.tween
			? cursor.tween.x.current - 15
			: cursor.x - 15}px;"
	>
		<MousePointer2 class="w-[30px] h-[30px]" fill={cursor.color} color={cursor.color} />
	</div>

	<img
		alt="avatar"
		src="https://avatar.vercel.sh/{cursor.id}"
		class="w-[30x] h-[30px] scale-75 absolute pointer-events-none overflow-hidden rounded-full outline-white outline-2 outline-dashed"
		style="top: {cursor.tween ? cursor.tween.y.current - 15 : cursor.y - 15}px; left: {cursor.tween
			? cursor.tween.x.current + 25
			: cursor.x + 25}px;"
	/>
{/each}

<!-- Latency indicator in bottom left corner -->
<div class="fixed bottom-2 left-2 bg-black bg-opacity-70 px-3 py-1 rounded text-sm z-50">
	<span class="text-white"
		>Latency: <span
			class={latency < 100 ? 'text-green-400' : latency < 200 ? 'text-yellow-400' : 'text-red-400'}
			>{latency}ms</span
		></span
	>
</div>

<h1
	class="text-3xl font-semibold bg-gradient-to-b from-white to-neutral-700 text-transparent bg-clip-text"
>
	X: {x.current.toFixed(0)} Y: {y.current.toFixed(0)} | Connected users: {Object.keys(cursors)
		.length}
</h1>

<Button onclick={async () => await supabase.auth.signOut()} variant="outline" class="my-4"
	>Quit</Button
>

<style>
	:root {
		cursor: none;
	}

	.current-user-cursor {
		position: absolute;
		filter: drop-shadow(0 0 6px var(--cursor-color));
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% {
			filter: drop-shadow(0 0 12px var(--cursor-color));
		}
		50% {
			filter: drop-shadow(0 0 16px var(--cursor-color));
		}
		100% {
			filter: drop-shadow(0 0 12px var(--cursor-color));
		}
	}
</style>
