import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const randomColor = (() => {
	const randomInt = (min: number, max: number) => {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

	return () => {
		var h = randomInt(0, 360);
		var s = randomInt(42, 98);
		var l = randomInt(40, 90);
		return `hsl(${h},${s}%,${l}%)`;
	};
})();
