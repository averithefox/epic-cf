import {
	type APIInteraction,
	APIInteractionResponse,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
} from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { slashCommands } from './commands';
import { ApplicationCommand } from './types';

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const res = (status: number) => new Response('', { status });
		const json = (body: APIInteractionResponse) =>
			new Response(JSON.stringify(body), {
				headers: { 'content-type': 'application/json;charset=UTF-8' },
			});

		if (req.method !== 'POST') return res(404);
		const sig = req.headers.get('x-signature-ed25519');
		const timestamp = req.headers.get('x-signature-timestamp');
		const body = await req.text();
		if (!sig || !timestamp || !body) return res(404);
		if (!(await verifyKey(body, sig, timestamp, env.DISCORD_PUBLIC_KEY))) return res(404);
		const interaction: APIInteraction = JSON.parse(body);

		switch (interaction.type) {
			case InteractionType.Ping: {
				return json({
					type: InteractionResponseType.Pong,
				});
			}

			case InteractionType.ApplicationCommand: {
				const commands: ApplicationCommand[] | null = {
					[ApplicationCommandType.ChatInput]: slashCommands,
					[ApplicationCommandType.User]: null,
					[ApplicationCommandType.Message]: null,
					[ApplicationCommandType.PrimaryEntryPoint]: null,
				}[interaction.data.type];
				const res = await commands?.find((c) => c.data.name === interaction.data.name)?.execute(interaction, env);
				if (res) return res instanceof FormData ? new Response(res) : json(res);
			}
		}

		return res(404);
	},
} satisfies ExportedHandler<Env>;

export { EpicDb } from './db';
