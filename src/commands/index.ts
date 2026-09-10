import { SlashCommand } from '../types';
import advent from './advent';
import cat from './cat';
import leaderboard from './leaderboard';
import mzpl from './mzpl';

export const slashCommands: SlashCommand[] = [advent, mzpl, cat, leaderboard];
