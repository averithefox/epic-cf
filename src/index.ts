import {
	APIChatInputApplicationCommandInteraction,
	type APIInteraction,
	type APIInteractionResponse,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
} from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { slashCommands } from './commands';

async function handleInteraction(interaction: APIInteraction, env: Env): Promise<APIInteractionResponse | FormData | undefined> {
	const user = interaction.user;
	if (user) {
		await env.EpicKV.put(`APIUser@${user.id}`, JSON.stringify(user), { expirationTtl: 60 * 60 * 24 });
	}

	switch (interaction.type) {
		case InteractionType.Ping: {
			return {
				type: InteractionResponseType.Pong,
			};
		}

		case InteractionType.ApplicationCommand: {
			if (interaction.data.type !== ApplicationCommandType.ChatInput) break;
			return await slashCommands
				.find((c) => c.data.name === interaction.data.name)
				?.execute(interaction as APIChatInputApplicationCommandInteraction, env);
		}

		case InteractionType.MessageComponent: {
			for (const cmd of slashCommands) {
				const res = await cmd.handleComponent?.(interaction, env);
				if (res) return res;
			}
			break;
		}
	}
}

async function verifyRequest(req: Request, env: Env): Promise<APIInteraction | null> {
	if (req.method !== 'POST') return null;

	const sig = req.headers.get('x-signature-ed25519');
	const timestamp = req.headers.get('x-signature-timestamp');
	const body = await req.text();
	if (!sig || !timestamp || !body) return null;

	if (!(await verifyKey(body, sig, timestamp, env.DISCORD_PUBLIC_KEY))) return null;
	return JSON.parse(body);
}

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const interaction = await verifyRequest(req, env);
		if (!interaction) return new Response('', { status: 400 });

		const res = await handleInteraction(interaction, env);
		if (!res) return new Response('', { status: 404 });

		return res instanceof FormData
			? new Response(res)
			: new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json;charset=UTF-8' } });
	},
} satisfies ExportedHandler<Env>;

export { EpicDb } from './db';
