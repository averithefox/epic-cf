#!/usr/bin/env bun

import { RESTGetAPIApplicationCommandsResult, RESTPatchAPIApplicationCommandJSONBody } from 'discord-api-types/v10';
import { slashCommands } from '../src/commands';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;

const reqInit: RequestInit = {
	headers: {
		Authorization: `Bot ${token}`,
	},
};

const registeredArray: RESTGetAPIApplicationCommandsResult = await fetch(
	`https://discord.com/api/v10/applications/${applicationId}/commands`,
	reqInit,
).then((res) => res.json());

const defined = new Map(slashCommands.map((v) => [v.data.name, v.data]));
const registered = new Map(registeredArray.map((v) => [v.name, v]));

const toRegister = slashCommands.map((v) => v.data).filter((v) => !registered.has(v.name));
const toRemove = registeredArray.filter((v) => !defined.has(v.name));
const toUpdate = Array.from(defined.keys())
	.filter((name) => registered.has(name))
	.map((name): [string, RESTPatchAPIApplicationCommandJSONBody] | null => {
		const our = defined.get(name)!;
		const theirs = registered.get(name)!;

		const KEYS: (keyof RESTPatchAPIApplicationCommandJSONBody)[] = [
			'name_localizations',
			'description' as any, // missing type
			'description_localizations',
			'options',
			'default_member_permissions',
			'dm_permission',
			'default_permission',
			'integration_types',
			'contexts',
			'nsfw',
			'handler',
		];
		const keys = KEYS.filter((key) => !equals(our[key], theirs[key]));
		return keys.length ? [theirs.id, Object.fromEntries(keys.map((key) => [key, our[key]]))] : null;
	})
	.filter((v) => v !== null);

await Promise.allSettled(
	[
		toRegister.map(async (cmd) => {
			await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
				...reqInit,
				method: 'POST',
				body: JSON.stringify(cmd),
			});
		}),
		toRemove.map(async (cmd) => {
			await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands/${cmd.id}`, {
				...reqInit,
				method: 'DELETE',
			});
		}),
		toUpdate.map(async ([id, cmd]) => {
			await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands/${id}`, {
				...reqInit,
				method: 'PATCH',
				body: JSON.stringify(cmd),
			});
		}),
	].flat(),
);

function equals(a: unknown, b: unknown): boolean {
	if (typeof a !== typeof b) return false;

	// primitives (boolean, bigint, symbol, undefined)
	if (a === null || typeof a !== 'object') {
		return a === b;
	}

	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false;
		return a.every((v, i) => equals(v, b[i]));
	}
	if (Array.isArray(b)) return false;

	const keysA = Object.keys(a);
	const keysB = Object.keys(b as object);
	if (keysA.length !== keysB.length) return false;

	return keysA.every((k) => equals((a as any)[k], (b as any)[k]));
}

export {};
