import { ApplicationCommandOptionType, MessageFlags } from 'discord-api-types/v10';
import { SlashCommand } from '.';
import { Dump } from '../db';
import { panic } from '../utils';
import { message } from './utils';

function isValidDump(json: unknown): json is Dump {
	if (!json || typeof json !== 'object') return false;
	if (!('advent' in json && 'stats' in json && 'breadGame' in json)) return false;
	if (!(Array.isArray(json.advent) && Array.isArray(json.stats) && Array.isArray(json.breadGame))) return false;
	return true; // don't care
}

export default {
	data: {
		name: 'admin',
		description: 'debug & maintenance',
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: 'import',
				description: 'import a db dump',
				options: [
					{
						type: ApplicationCommandOptionType.Attachment,
						name: 'dump',
						description: 'database dump to import',
						required: true,
						file_types: ['.json'],
					},
				],
			},
		],

		scope: 'guild:1113478204196392993',
		default_member_permissions: '0',
	},

	async execute(interaction, env) {
		const user = interaction.user ?? interaction.member?.user;
		if (!user) panic('user object missing');

		if (user.id !== '719890634294427669')
			return message({
				content: 'unauthorized',
				flags: MessageFlags.Ephemeral,
			});

		const subcmd = interaction.data.options?.[0];
		if (subcmd?.type !== ApplicationCommandOptionType.Subcommand) panic();

		switch (subcmd.name) {
			case 'import': {
				const attachment = subcmd.options?.[0];
				if (attachment?.type !== ApplicationCommandOptionType.Attachment) panic();
				const url = interaction.data.resolved?.attachments?.[attachment.value]?.url;
				if (!url) panic();

				const res = await fetch(url);
				const json = await res.json();
				if (!isValidDump(json)) return message('invalid file format');

				const stub = env.EpicDb.getByName('main');
				const writes = await stub.import(json);

				return message(`${writes} row${!writes || writes > 1 ? 's' : ''} written`);
			}
			default: {
				return message({
					content: 'unknown subcommand',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
} satisfies SlashCommand;
