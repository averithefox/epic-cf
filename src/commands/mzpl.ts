import { ApplicationIntegrationType, InteractionContextType, InteractionResponseType } from 'discord-api-types/v10';
import { SlashCommand } from '../types';
import { random } from '../utils';

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
		integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
		contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
	},

	execute: (interaction, env) =>
		new Promise(async (resolve) => {
			const user = interaction.user;
			if (!user) throw new Error('interaction.user == null');

			resolve({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: random(MEOW),
				},
			});

			const stub = env.EpicDb.getByName('main');
			await stub.updateStatistic(user.id, 'mzpl_uses', +1);
		}),
} satisfies SlashCommand;
