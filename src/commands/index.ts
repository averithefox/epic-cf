import {
	APIChatInputApplicationCommandInteraction,
	APIInteractionResponse,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { MaybePromise } from '../utils';
import admin from './admin';
import advent from './advent';
import cat from './cat';
import leaderboard from './leaderboard';
import mzpl from './mzpl';

export type GlobalSlashCommand = { scope: 'global' } & RESTPostAPIChatInputApplicationCommandsJSONBody;
export type GuildSlashCommand = { scope: `guild:${number}` } & Omit<
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	'contexts' | 'dm_permission' | 'integration_types'
>;

export type SlashCommandData = GlobalSlashCommand | GuildSlashCommand;

export type SlashCommandResponse = APIInteractionResponse | FormData;

export interface SlashCommand {
	data: SlashCommandData;
	execute(interaction: APIChatInputApplicationCommandInteraction, env: Env): MaybePromise<SlashCommandResponse>;
	handleComponent?: (interaction: APIMessageComponentInteraction, env: Env) => MaybePromise<SlashCommandResponse | undefined>;
	handleModal?: (interaction: APIModalSubmitInteraction, env: Env) => MaybePromise<SlashCommandResponse | undefined>;
}

export const slashCommands: SlashCommand[] = [advent, mzpl, cat, leaderboard, admin];
