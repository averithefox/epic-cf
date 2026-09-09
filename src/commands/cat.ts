import { APIInteractionResponse, ApplicationIntegrationType, InteractionContextType, InteractionResponseType } from 'discord-api-types/v10';
import { SlashCommand } from '../types';

export default {
	data: {
		name: 'cat',
		description: 'spread peace and love (or not) thanks to cats',
		integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
		contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
	},

	async execute(interaction) {
		const user = interaction.user;
		if (!user) throw new Error('interaction.user == null');

		const file = await fetch('https://cataas.com/cat');
		if (!file.ok) throw new Error('Failed to fetch CatAAS');

		const blob = await file.blob();
		const form = new FormData();

		form.append(
			'payload_json',
			JSON.stringify({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					attachments: [
						{
							id: 0,
							filename: 'cat.png',
						},
					],
				},
			} satisfies APIInteractionResponse),
		);

		form.append('files[0]', blob, 'cat.png');

		return form;
	},
} satisfies SlashCommand;
