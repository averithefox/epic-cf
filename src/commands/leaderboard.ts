import { regex } from 'arkregex';
import dayjs from 'dayjs';
import {
	APIActionRowComponent,
	APIButtonComponent,
	APIEmbed,
	APIInteractionResponseCallbackData,
	APIMessage,
	APISelectMenuComponent,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	ButtonStyle,
	ComponentType,
	InteractionContextType,
	InteractionResponseType,
	RESTGetAPIUserResult,
} from 'discord-api-types/v10';
import { EpicDb } from '../db';
import { SlashCommand } from '../types';
import { avatarURL, clamp, formatDuration } from '../utils';
import { getAdventYear, getDaysSinceAdvent } from './advent';

interface Entry {
	id: string;
	value: string;
}

interface LeaderboardObject {
	id: string;
	name: string;
	getEntries(stub: DurableObjectStub<EpicDb>): Entry[] | Promise<Entry[]>;
}

const LEADERBOARDS = [
	{
		id: 'advent-on-cooldown-claim-attempts',
		name: '/advent on cooldown claim attempts',
		async getEntries(stub) {
			const data = await stub.getStatistics();
			return data
				.sort((a, b) => b.advent_on_cooldown - a.advent_on_cooldown)
				.map((row) => ({
					id: row.user_id,
					value: row.advent_on_cooldown.toLocaleString('en-US'),
				}));
		},
	},
	{
		id: 'mzpl-uses',
		name: '/mzpl uses',
		async getEntries(stub) {
			const data = await stub.getStatistics();
			return data
				.sort((a, b) => b.mzpl_uses - a.mzpl_uses)
				.map((row) => ({
					id: row.user_id,
					value: row.mzpl_uses.toLocaleString('en-US'),
				}));
		},
	},
	{
		id: 'advent-fastest-claim',
		name: '/advent fastest claim',
		async getEntries(stub) {
			const times = await getClaimTimes(stub);
			return times
				.map(({ id, times }) => ({ id, time: Math.min(...times) }))
				.sort((a, b) => a.time - b.time)
				.map(({ id, time }) => ({
					id,
					value: Number.isFinite(time) ? formatDuration(time) : 'N/A',
				}));
		},
	},
	{
		id: 'advent-longest-streak',
		name: '/advent longest claim streak',
		async getEntries(stub) {
			const streaks = await getStreaks(stub);
			return streaks
				.sort((a, b) => b.longestStreak - a.longestStreak)
				.map(({ id, longestStreak, currentStreak }) => ({
					id,
					value: `${longestStreak === currentStreak ? ':fire: ' : ''}${longestStreak.toLocaleString('en-US')}`,
				}));
		},
	},
	{
		id: 'advent-current-streak',
		name: '/advent current claim streak',
		async getEntries(stub) {
			const streaks = await getStreaks(stub);
			return streaks
				.sort((a, b) => b.currentStreak - a.currentStreak)
				.map(({ id, currentStreak, longestStreak }) => ({
					id,
					value: `${currentStreak === longestStreak ? ':fire: ' : ''}${currentStreak.toLocaleString('en-US')}`,
				}));
		},
	},
	{
		id: 'advent-days-claimed',
		name: '/advent days claimed',
		async getEntries(stub) {
			const entries = new Map<string, number[]>();
			const year = getAdventYear();

			for (const row of await stub.getAdventEntriesForYear(year)) {
				const arr = entries.get(row.user_id) ?? [];
				arr.push(row.day);
				entries.set(row.user_id, arr);
			}

			const firstDay = Array.from(entries.values()).reduce((acc, val) => Math.min(acc, ...val), Number.POSITIVE_INFINITY);

			const current = getDaysSinceAdvent();

			return Array.from(entries.entries())
				.map(([id, days]) => ({
					id,
					value: days.length,
					all: days.length === current - firstDay + 1,
				}))
				.sort((a, b) => b.value - a.value)
				.map(({ id, value, all }) => ({
					id,
					value: `${all ? ':fire: ' : ''}${value.toLocaleString('en-US')}`,
				}));
		},
	},
	{
		id: 'average-advent-claim-time',
		name: '/advent average claim time',
		async getEntries(stub) {
			const times = await getClaimTimes(stub);
			return times
				.map(({ id, times }) => ({
					id,
					time: times.length ? times.reduce((a, b) => a + b, 0) / times.length : Number.POSITIVE_INFINITY,
				}))
				.sort((a, b) => a.time - b.time)
				.map(({ id, time }) => ({
					id,
					value: Number.isFinite(time) ? formatDuration(Math.floor(time)) : 'N/A',
				}));
		},
	},
] satisfies LeaderboardObject[];

async function getClaimTimes(stub: DurableObjectStub<EpicDb>) {
	const entries = new Map<string, number[]>();
	const year = getAdventYear();

	for (const row of await stub.getAdventEntriesForYear(year)) {
		const claimedAt = dayjs(row.claimed_at);
		const claimedIn = claimedAt.diff(claimedAt.startOf('day'));

		const arr = entries.get(row.user_id) ?? [];
		arr.push(claimedIn);
		entries.set(row.user_id, arr);
	}

	return Array.from(entries.entries()).map(([id, times]) => ({ id, times }));
}

async function getStreaks(stub: DurableObjectStub<EpicDb>) {
	const entries = new Map<string, number[]>();
	const year = getAdventYear();

	for (const row of await stub.getAdventEntriesForYear(year)) {
		const arr = entries.get(row.user_id) ?? [];
		arr.push(row.day);
		entries.set(row.user_id, arr);
	}

	const currentDay = getDaysSinceAdvent();

	return Array.from(entries.entries()).map(([id, days]) => {
		const streakInfo = days
			.sort((a, b) => a - b)
			.reduce(
				(acc, day) => {
					if (day === acc.current + 1) {
						acc.current = day;
						acc.streak++;
					} else {
						acc.current = day;
						acc.streak = 1;
					}

					if (acc.streak > acc.longest) {
						acc.longest = acc.streak;
					}

					return acc;
				},
				{ current: 0, streak: 0, longest: 0 },
			);

		const currentStreak = days.some((v) => v === currentDay || v === currentDay - 1) ? streakInfo.streak : 0;

		return {
			id,
			longestStreak: streakInfo.longest,
			currentStreak,
		};
	});
}

function getState(msg: APIMessage) {
	const topLevelComponent = msg.components?.[0];
	if (topLevelComponent?.type !== ComponentType.ActionRow) {
		return null;
	}

	const menu = topLevelComponent.components[0];
	if (menu?.type !== ComponentType.StringSelect) {
		return null;
	}

	const match = regex('Page (?<current>\\d+)').exec(msg.embeds[0].footer?.text ?? '');
	const currentPage = parseInt(match?.groups.current ?? '1') - 1;

	const selected = (menu.options.find((option) => option.default) ?? menu.options[0]).value;

	return {
		currentPage,
		selected,
	};
}

async function fetchUserById(id: string, env: Env): Promise<RESTGetAPIUserResult | null> {
	for (let attempt = 0; attempt < 5; ++attempt) {
		const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
			headers: {
				'User-Agent': 'DiscordBot (epic-cf, 0.0.0)',
				Authorization: `Bot ${env.DISCORD_TOKEN}`,
			},
		});

		if (res.status === 429) {
			const retryAfter = parseInt(res.headers.get('X-RateLimit-Reset-After') ?? '0');
			await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
			continue;
		}
		if (!res.ok) return null;

		return await res.json();
	}

	return null;
}

async function getUserById(id: string, env: Env, ttl: number = 60 * 60 * 24): Promise<APIUser | null> {
	const key = `APIUser@${id}`;
	const cached = await env.EpicKV.get(key);
	if (cached) return JSON.parse(cached);
	const value = await fetchUserById(id, env);
	if (!value) return null;
	await env.EpicKV.put(key, JSON.stringify(value), { expirationTtl: ttl });
	return value;
}

async function getLeaderboardReplyContent(env: Env, id: LeaderboardObject['id'], page = 0): Promise<APIInteractionResponseCallbackData> {
	const lb = LEADERBOARDS.find((lb) => lb.id === id);

	if (!lb)
		return {
			content: 'invalid leaderboard',
		};

	const stub = env.EpicDb.getByName('main');
	const entries = await lb.getEntries(stub);

	const perPage = 9;
	const groups = Array.from({ length: Math.ceil(entries.length / perPage) }, (_, i) => entries.slice(i * perPage, (i + 1) * perPage));

	const maxPage = Math.max(groups.length - 1, 0);
	page = clamp(page, 0, maxPage);

	const averi = await getUserById('719890634294427669', env, 7 * 60 * 60 * 24);
	const embed: APIEmbed = {
		color: 0xcf646c,
		title: `${lb.name} leaderboard`,
		footer: {
			text: `by @${averi?.username ?? 'averithefox'}`,
		},
	};
	if (averi) embed.footer!.icon_url = avatarURL(averi);
	if (groups.length) embed.footer!.text += ` | Page ${page + 1} / ${groups.length}`;

	const buttonRow: APIActionRowComponent<APIButtonComponent> = {
		type: ComponentType.ActionRow,
		components: [
			{
				type: ComponentType.Button,
				custom_id: 'leaderboard-prev',
				label: 'Previous',
				style: ButtonStyle.Primary,
				disabled: page <= 0,
			},
			{
				type: ComponentType.Button,
				custom_id: 'leaderboard-next',
				label: 'Next',
				style: ButtonStyle.Primary,
				disabled: page >= maxPage,
			},
			{
				type: ComponentType.Button,
				custom_id: 'leaderboard-refresh',
				label: 'Refresh',
				style: ButtonStyle.Secondary,
			},
		],
	};

	const menuRow: APIActionRowComponent<APISelectMenuComponent> = {
		type: ComponentType.ActionRow,
		components: [
			{
				type: ComponentType.StringSelect,
				custom_id: 'leaderboard',
				placeholder: 'Select a leaderboard',
				options: LEADERBOARDS.map(({ id, name }) => ({ label: name, value: id, default: id === lb.id })),
			},
		],
	};

	const group = groups[page];
	if (!group) {
		embed.description = 'No data :(';
		return { embeds: [embed], components: [menuRow, buttonRow] };
	}

	embed.fields = await Promise.all(
		group.map(async ({ id, value }, i) => {
			const user = await getUserById(id, env);

			const place = page * perPage + i + 1;
			return {
				inline: true,
				name: `#${place} ${user?.username ?? id}`,
				value,
			};
		}),
	);

	return { embeds: [embed], components: [menuRow, buttonRow] };
}

export default {
	data: {
		name: 'leaderboard',
		description: 'View a leaderboard',
		integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
		contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: 'leaderboard',
				description: 'Leaderboard to view',
				choices: LEADERBOARDS.map(({ id, name }) => ({ name, value: id })),
			},
		],
	},

	execute: (interaction, env) =>
		new Promise(async (resolve) => {
			const option = interaction.data.options?.[0];
			const leaderboard = (option?.type === ApplicationCommandOptionType.String && option.value) || LEADERBOARDS[0].id;
			const reply = await getLeaderboardReplyContent(env, leaderboard);
			resolve({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: reply,
			});
		}),

	async handleComponent(interaction, env) {
		const component = interaction.data;
		if (!component.custom_id.startsWith('leaderboard')) return;

		if (component.custom_id === 'leaderboard' && component.component_type === ComponentType.StringSelect) {
			return {
				type: InteractionResponseType.UpdateMessage,
				data: await getLeaderboardReplyContent(env, component.values[0]),
			};
		}

		if (component.component_type === ComponentType.Button) {
			const state = getState(interaction.message);
			const step = { 'leaderboard-prev': -1, 'leaderboard-next': +1, 'leaderboard-refresh': 0 }[component.custom_id];
			if (!state || step === undefined) return;
			const data = await getLeaderboardReplyContent(env, state.selected, state.currentPage + step);
			return { type: InteractionResponseType.UpdateMessage, data };
		}
	},
} satisfies SlashCommand;
