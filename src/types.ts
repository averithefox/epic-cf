import type {
	APIApplicationCommandInteraction,
	APIChatInputApplicationCommandInteraction,
	APIInteractionResponse,
	RESTPostAPIApplicationCommandsJSONBody,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

export type Nullish<T> = T | null | undefined;

export interface ApplicationCommand<
	Data extends RESTPostAPIApplicationCommandsJSONBody = RESTPostAPIApplicationCommandsJSONBody,
	Interaction extends APIApplicationCommandInteraction = APIApplicationCommandInteraction,
	Response extends APIInteractionResponse = APIInteractionResponse,
> {
	data: Data;
	execute(interaction: Interaction, env: Env): Response | Promise<Response>;
}

export type SlashCommand = ApplicationCommand<
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	APIChatInputApplicationCommandInteraction,
	APIInteractionResponse
>;
