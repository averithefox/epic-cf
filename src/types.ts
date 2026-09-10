import type {
	APIChatInputApplicationCommandInteraction,
	APIInteractionResponse,
	APIMessageComponentInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

export type Nullish<T> = T | null | undefined;
export type MaybePromise<T> = T | Promise<T>;

export interface SlashCommand {
	data: RESTPostAPIChatInputApplicationCommandsJSONBody;
	execute(interaction: APIChatInputApplicationCommandInteraction, env: Env): MaybePromise<APIInteractionResponse | FormData>;
	handleComponent?: (interaction: APIMessageComponentInteraction, env: Env) => MaybePromise<APIInteractionResponse | FormData | undefined>;
}
