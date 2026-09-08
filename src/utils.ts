import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { Nullish } from './types';

dayjs.extend(duration);

export function formatDuration(ms: Nullish<number>) {
	if (ms == null) {
		return 'N/A';
	}

	const dur = dayjs.duration(ms);

	const hours = Math.floor(dur.asHours());
	const minutes = Math.floor(dur.minutes());
	const seconds = Math.floor(dur.seconds());
	const milliseconds = dur.milliseconds();

	const parts: string[] = [];

	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0) parts.push(`${seconds}s`);
	if (milliseconds > 0) parts.push(`${milliseconds}ms`);

	return parts.join(' ') || '0ms';
}

export function random(min: number, max: number): number;
export function random<T>(array: T[]): T;
export function random<T>(minOrArray: number | T[], max?: number): number | T {
	if (Array.isArray(minOrArray)) {
		return minOrArray[Math.floor(Math.random() * minOrArray.length)];
	}
	if (!max) {
		throw new Error('max is required when min is provided');
	}
	return Math.floor(Math.random() * (max - minOrArray + 1)) + minOrArray;
}

export function formatOrdinal(num: number) {
	const lastDigit = num % 10;
	const lastTwoDigits = num % 100;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
		return num.toLocaleString('en-US') + 'th';
	}

	switch (lastDigit) {
		case 1:
			return num.toLocaleString('en-US') + 'st';
		case 2:
			return num.toLocaleString('en-US') + 'nd';
		case 3:
			return num.toLocaleString('en-US') + 'rd';
		default:
			return num.toLocaleString('en-US') + 'th';
	}
}

export const run = <T>(fn: () => T) => fn();
