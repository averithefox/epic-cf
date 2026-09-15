import { ApplicationIntegrationType, InteractionContextType } from 'discord-api-types/v10';
import { SlashCommand } from '.';
import { panic } from '../utils';
import { message } from './utils';

export default {
	data: {
		name: 'cat',
		description: 'spread peace and love (or not) thanks to cats',

		scope: 'global',
		integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
		contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
	},

	async execute() {
		const file = await fetch('https://cataas.com/cat');
		if (!file.ok) panic('Failed to fetch CatAAS');

		const blob = await file.blob();

		const payload = message({
			attachments: [
				{
					id: 0,
					filename: 'cat.png',
				},
			],
		});

		const form = new FormData();
		form.append('payload_json', JSON.stringify(payload));
		form.append('files[0]', blob, 'cat.png');

		return form;
	},
} satisfies SlashCommand;
