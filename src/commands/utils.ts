import {
	APIInteractionResponseCallbackData,
	APIInteractionResponseChannelMessageWithSource,
	InteractionResponseType,
} from 'discord-api-types/v10';

export function message(data: string | APIInteractionResponseCallbackData): APIInteractionResponseChannelMessageWithSource {
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: typeof data === 'string' ? { content: data } : data,
	};
}
