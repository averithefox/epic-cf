import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ApplicationIntegrationType, ComponentType, InteractionContextType, MessageFlags } from 'discord-api-types/v10';
import { SlashCommand } from '.';
import { avatarURL, formatDuration, formatOrdinal, panic, random } from '../utils';
import { message } from './utils';

dayjs.extend(utc);
dayjs.extend(timezone);

export const ADVENT_TIMEZONE = 'Europe/Warsaw';

/**
 * Gets the "advent year" - the year when the current advent season started.
 * Advent runs from Dec 1 of year N until Nov 30 of year N+1.
 * e.g., Dec 2025 → 2025, Jan 2026 → 2025, Dec 2026 → 2026
 */
export function getAdventYear(date: dayjs.Dayjs) {
	const year = date.year();
	const start = dayjs.tz(`${year}-12-01`, ADVENT_TIMEZONE).startOf('day');
	return date.isBefore(start) ? year - 1 : year;
}

export function getAdventDay(date: dayjs.Dayjs) {
	const year = getAdventYear(date);
	const start = dayjs.tz(`${year}-12-01`, ADVENT_TIMEZONE).startOf('day');
	return date.diff(start, 'day');
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

		scope: 'global',
		integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
		contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
	},

	async execute(interaction, env, ctx) {
		const now = dayjs().tz(ADVENT_TIMEZONE);

		const user = interaction.user ?? interaction.member?.user;
		if (!user) panic('user object missing');

		const day = getAdventDay(now);
		const year = getAdventYear(now);

		const stub = env.EpicDb.getByName('main');
		const succeeded = await stub.tryClaimAdvent(user.id, day, year, now.valueOf());

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

			ctx.waitUntil(stub.updateStatistic(user.id, 'advent_on_cooldown', +1));
			return message(random(replies));
		}

		const claimedIn = getTimePastMidnight(now);

		const title =
			interaction.locale === 'pl'
				? `## Odebrano ${day.toLocaleString('pl-PL')} dzień adwentu!`
				: `## You claimed the ${formatOrdinal(day)} day of advent!`;
		const emoji = random(['OwO', 'UwU', '>.<', '-.-', 'nyaa~~', 'meow', '^^', ':3']);
		const status =
			interaction.locale === 'pl'
				? `Odebranie adwentu zajęło Tobie ${formatDuration(claimedIn)}! ${emoji}`
				: `It took you ${formatDuration(claimedIn)}! ${emoji}`;
		const userAvatar = avatarURL(user, interaction.member, interaction.guild_id);

		return message({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{
					type: ComponentType.Container,
					components: [
						{
							type: ComponentType.Section,
							components: [title, status].map((content) => ({
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
		});
	},
} satisfies SlashCommand;
