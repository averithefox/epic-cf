#!/usr/bin/env bun

import { RESTGetAPIApplicationCommandsResult } from 'discord-api-types/v10';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;

const existing: RESTGetAPIApplicationCommandsResult = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
	headers: {
		Authorization: `Bot ${token}`,
	},
}).then((res) => res.json());

export {};
