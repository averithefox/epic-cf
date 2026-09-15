import { ApplicationIntegrationType, InteractionContextType } from 'discord-api-types/v10';
import { SlashCommand } from '.';
import { random } from '../utils';
import { message } from './utils';

const MEOW = [
	'meow', // english
	'miau', // polish
	'miaou', // french
	'miauw', // dutch
	'miao', // italian
	'miyav', // turkish
	'мяу', // russian
	'میاو', // persian
	'ニャー', // japanese
	'喵', // chinese (mandarin)
	'야옹', // korean
	'meo', // vietnamese
	'mňau', // czech
	'mijau', // croatian
	'мјау', // serbian
	'miau', // spanish
	'miau', // german
	'مياو', // arabic
	'เหมียว', // thai
	'meong', // indonesian
	'νιάου', // greek
	'מיאו', // hebrew
	'ᒲᒷ𝙹∴', // SGA
];

export default {
	data: {
		name: 'mzpl',
		description: 'meow',
		description_localizations: { pl: 'miau' },

		scope: 'global',
		integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
		contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
	},

	async execute(interaction, env, ctx) {
		const user = interaction.user ?? interaction.member?.user;
		const stub = env.EpicDb.getByName('main');
		if (user) ctx.waitUntil(stub.updateStatistic(user.id, 'mzpl_uses', +1));

		return message(random(MEOW));
	},
} satisfies SlashCommand;
