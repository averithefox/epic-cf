import { verifyKey } from 'discord-interactions';
import { type APIInteraction, APIInteractionResponse, InteractionResponseType, InteractionType, MessageFlags } from 'discord-api-types/v10';

export default {
	async fetch(req, env, ctx) {
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
				return json({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: 'rawr x3',
						flags: MessageFlags.Ephemeral,
					},
				});
			}
		}

		return res(404);
	},
} satisfies ExportedHandler<Env>;
