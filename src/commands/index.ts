import {
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
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

type Handler<I extends APIInteraction, R> = (interaction: I, env: Env, ctx: ExecutionContext) => MaybePromise<R>;
export interface SlashCommand {
	data: SlashCommandData;
	execute: Handler<APIChatInputApplicationCommandInteraction, SlashCommandResponse>;
	handleComponent?: Handler<APIMessageComponentInteraction, SlashCommandResponse | undefined>;
	handleModal?: Handler<APIModalSubmitInteraction, SlashCommandResponse | undefined>;
}

export const slashCommands: SlashCommand[] = [advent, mzpl, cat, leaderboard, admin];
