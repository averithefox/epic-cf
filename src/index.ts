import {
	APIChatInputApplicationCommandInteraction,
	type APIInteraction,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
} from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { SlashCommandResponse, slashCommands } from './commands';
import { message } from './commands/utils';
import { log } from './utils';

async function handleInteraction(interaction: APIInteraction, env: Env, ctx: ExecutionContext): Promise<SlashCommandResponse | undefined> {
	const start = performance.now();

	const user = interaction.user ?? interaction.member?.user;
	if (user) {
		ctx.waitUntil(env.EpicKV.put(`APIUser@${user.id}`, JSON.stringify(user), { expirationTtl: 60 * 60 * 24 }));
	}

	let res: SlashCommandResponse | undefined = undefined;
	switch (interaction.type) {
		case InteractionType.Ping: {
			return {
				type: InteractionResponseType.Pong,
			};
		}

		case InteractionType.ApplicationCommand: {
			if (interaction.data.type !== ApplicationCommandType.ChatInput) break;
			try {
				res = await slashCommands
					.find((c) => c.data.name === interaction.data.name)
					?.execute(interaction as APIChatInputApplicationCommandInteraction, env, ctx);
			} catch (e) {
				if (e instanceof Error) console.error(`(${e.name}) ${e.message} at ${e.stack}`);
				else console.error(e);
				res = message({ content: 'exception caught during execution', flags: MessageFlags.Ephemeral });
			}
			log`${user}: /${interaction.data.name} [@@${start}]`;
			return res;
		}

		case InteractionType.MessageComponent: {
			const id = interaction.data.custom_id.split(/[^A-Za-z]/, 1)[0];
			try {
				res = await slashCommands.find((c) => c.data.name === id)?.handleComponent?.(interaction, env, ctx);
			} catch (e) {
				if (e instanceof Error) console.error(`(${e.name}) ${e.message} at ${e.stack}`);
				else console.error(e);
				res = message({ content: 'exception caught during execution', flags: MessageFlags.Ephemeral });
			}
			log`${user}: ${interaction.data.custom_id} (${interaction.message.id}) [@@${start}]`;
			return res;
		}

		case InteractionType.ModalSubmit: {
			const id = interaction.data.custom_id.split(/[^A-Za-z]/, 1)[0];
			return await slashCommands.find((c) => c.data.name === id)?.handleModal?.(interaction, env, ctx);
		}
	}
	return res;
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

		const res = await handleInteraction(interaction, env, ctx);
		if (!res) return new Response('', { status: 404 });

		return res instanceof FormData ? new Response(res) : Response.json(res);
	},
} satisfies ExportedHandler<Env>;

export { EpicDb } from './db';
