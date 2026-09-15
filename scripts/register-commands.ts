#!/usr/bin/env bun

import { RESTPutAPIApplicationCommandsJSONBody, RESTPutAPIApplicationGuildCommandsJSONBody } from 'discord-api-types/v10';
import { GuildSlashCommand, slashCommands } from '../src/commands';
import { split } from '../src/utils';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;

const MAX_ATTEMPTS = 2;
let rateLimitRemaining = Number.POSITIVE_INFINITY;
let rateLimitReset = -1;
async function req<Ret = unknown, Body = unknown>(path: string, body?: Body, method?: string, attempt = 0): Promise<Ret> {
	if (attempt >= MAX_ATTEMPTS) {
		throw new Error(`max attempts (${MAX_ATTEMPTS}) exceeded for ${path}`);
	}

	const hasBody = body !== undefined;
	method = method ?? (hasBody ? 'POST' : 'GET');

	while (rateLimitRemaining <= 0 && Date.now() < rateLimitReset) {
		await new Promise((resolve) => setTimeout(resolve, rateLimitReset - Date.now()));
	}

	const res = await fetch(`https://discord.com/api/v10${path}`, {
		headers: {
			'User-Agent': 'DiscordBot (epic-cf, 0.0.0)',
			Authorization: `Bot ${token}`,
			...(hasBody && { 'Content-Type': 'application/json; charset=utf-8' }),
		},
		method,
		body: hasBody ? JSON.stringify(body) : undefined,
	});

	rateLimitRemaining = +res.headers.get('X-RateLimit-Remaining')!;
	rateLimitReset = +res.headers.get('X-RateLimit-Reset')! * 1000;

	if (res.status === 429) {
		return await req<Ret, Body>(path, body, method, attempt + 1);
	}

	const json: any = await res.json();
	if (!res.ok) {
		throw new Error(`${res.status} (${res.statusText}) for ${path}: ${json.message}`);
	}

	return json;
}

const commandData = slashCommands.map((it) => it.data);
const global = commandData.filter(({ scope }) => split(scope, ':')[0] === 'global');
const guild = commandData.reduce((acc, it) => {
	const [scope, guildId] = split(it.scope, ':');
	if (scope !== 'guild') return acc;
	const arr = acc.get(guildId) ?? [];
	arr.push(it as GuildSlashCommand);
	acc.set(guildId, arr);
	return acc;
}, new Map<`${number}`, GuildSlashCommand[]>());

await req<void, RESTPutAPIApplicationCommandsJSONBody>(`/applications/${applicationId}/commands`, global, 'PUT');

for (const guildId of guild.keys()) {
	const cmds = guild.get(guildId)!;
	await req<void, RESTPutAPIApplicationGuildCommandsJSONBody>(`/applications/${applicationId}/guilds/${guildId}/commands`, cmds, 'PUT');
}
