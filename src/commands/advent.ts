import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ComponentType, InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { SlashCommand } from '../types';
import { formatDuration, formatOrdinal, random, run } from '../utils';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Gets the "advent year" - the year when the current advent season started.
 * Advent runs from Dec 1 of year N until Nov 30 of year N+1.
 * e.g., Dec 2025 → 2025, Jan 2026 → 2025, Dec 2026 → 2026
 */
export function getAdventYear(today: dayjs.Dayjs = dayjs()) {
	const currentYear = today.year();
	const adventStart = dayjs(`${currentYear}-12-01`).startOf('day');

	if (today.isBefore(adventStart)) {
		return currentYear - 1;
	}

	return currentYear;
}

export function getDaysSinceAdvent(today: dayjs.Dayjs = dayjs()) {
	const adventYear = getAdventYear(today);
	const adventStart = dayjs(`${adventYear}-12-01`).startOf('day');
	const daysDiff = today.diff(adventStart, 'day');

	return daysDiff;
}

const getTimeUntilMidnight = (date: dayjs.Dayjs) => date.endOf('day').diff(date, 'ms');
const getTimePastMidnight = (date: dayjs.Dayjs) => date.diff(date.startOf('day'), 'ms');

export default {
	data: {
		name: 'advent',
		name_localizations: {
			pl: 'adwent',
		},
		description: 'mom, can we have /advent? no. we have /advent at home. /advent at home:',
		description_localizations: {
			pl: 'mom, can we have /adwent? no. we have /adwent at home. /adwent at home:',
		},
	},

	execute: (interaction, env) =>
		new Promise(async (resolve) => {
			const now = dayjs();

			const user = interaction.user;
			if (!user) throw new Error('interaction.user == null');

			const day = getDaysSinceAdvent(now);
			const year = getAdventYear(now);

			console.time(`/advent for ${user.id}`);

			const stub = env.EpicDb.getByName('main');
			const succeeded = await stub.tryClaimAdvent(user.id, day, year, now.valueOf());

			console.timeEnd(`/advent for ${user.id}`);

			if (!succeeded) {
				const timeUntilReset = getTimeUntilMidnight(now);
				const formattedTime = formatDuration(timeUntilReset);

				const replies = [
					interaction.locale === 'pl'
						? `:hand_splayed: Dzisiejszy dzień został już odebrany! Wpisz tę komendę ponownie za **${formattedTime}**!`
						: `:hand_splayed: Today's day has already been claimed! Type this command again in **${formattedTime}**!`,
					'Nuh uh',
					'<:caramelbite:1338217015562735687>',
					"Ain't happening",
				];

				resolve({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: random(replies),
					},
				});

				await stub.updateStatistic(user.id, 'advent_on_cooldown', +1);

				return;
			}

			const claimedIn = getTimePastMidnight(now);

			const title =
				interaction.locale === 'pl'
					? `## Odebrano ${day.toLocaleString('pl-PL')} dzień adwentu!`
					: `## You claimed the ${formatOrdinal(day)} day of advent!`;
			const status =
				interaction.locale === 'pl'
					? `Odebranie adwentu zajęło Tobie ${formatDuration(claimedIn)}!`
					: `It took you ${formatDuration(claimedIn)}!`;
			const emoji = random(['OwO', 'UwU', '>.<', '-.-', 'nyaa~~', 'meow', '^^', ':3']);

			const userAvatar =
				'https://cdn.discordapp.com/' +
				run(() => {
					const member = interaction.member;
					const hash = member?.avatar ?? user.avatar;
					// https://www.reddit.com/r/discordapp/comments/14h7rtv/comment/jp9j7p3
					if (!hash) return `embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`;
					const ext = hash.startsWith('a_') ? 'webp?animated=true' : 'png';
					if (member?.avatar && interaction.guild_id) return `guilds/${interaction.guild_id}/users/${user.id}/avatars/${hash}.${ext}`;
					return `avatars/${user.id}/${hash}.${ext}`;
				});

			resolve({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.Container,
							components: [
								{
									type: ComponentType.Section,
									components: [title, status, emoji].map((content) => ({
										type: ComponentType.TextDisplay,
										content,
									})),
									accessory: {
										type: ComponentType.Thumbnail,
										media: {
											url: userAvatar,
										},
										description: user.username,
									},
								},
							],
						},
					],
				},
			});
		}),
} satisfies SlashCommand;
