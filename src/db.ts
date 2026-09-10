import { DurableObject } from 'cloudflare:workers';

export type Statistic = 'advent_on_cooldown' | 'mzpl_uses';

export class EpicDb extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.storage.sql.exec(`
create table if not exists advent (
  user_id text not null,
  day integer not null,
  year integer not null,
  claimed_at integer,
  primary key (user_id, day, year)
);

create table if not exists stats (
  user_id text primary key,
  advent_on_cooldown integer not null default 0,
  mzpl_uses integer not null default 0
);

create table if not exists subscriptions (
  user_id text primary key,
  advent_reminder integer not null default 0
);

create table if not exists bread_game (
  user_id text primary key,
  burgers integer not null default 0,
  bread integer not null default 0,
  slices integer not null default 0,
  mold integer not null default 0,
  cows_capable integer not null default 0,
  cows_milked integer not null default 0,
  milk integer not null default 0,
  whipped_milk integer not null default 0,
  raw_steak integer not null default 0,
  cheese integer not null default 0,
  cooked_steak integer not null default 0,
  knife integer not null default 0
);
`);
	}

	async tryClaimAdvent(userId: string, day: number, year: number, at: number): Promise<boolean> {
		const result = this.ctx.storage.sql.exec(
			'insert or ignore into advent(user_id, day, year, claimed_at) values(?, ?, ?, ?);',
			userId,
			day,
			year,
			at,
		);
		return result.rowsWritten > 0;
	}

	async updateStatistic(userId: string, stat: Statistic, diff: number) {
		if (!/^[a-z_]+$/.test(stat)) throw new Error(`"${stat}" isn't a valid statistic. possible SQL injection attempt?`);

		this.ctx.storage.sql.exec(
			`insert into stats (user_id, ${stat})
      values (?, ?)
      on conflict (user_id) do update set
        ${stat} = ${stat} + ?;`,
			userId,
			diff,
			diff,
		);
	}

	async getAdventEntriesForYear(year: number) {
		const result = this.ctx.storage.sql.exec<{ user_id: string; day: number; claimed_at: number }>(
			'select user_id, day, claimed_at from advent where year = ? and claimed_at is not null;',
			year,
		);
		return result.toArray();
	}

	async getStatistics() {
		const result = this.ctx.storage.sql.exec<Record<Statistic, number> & { user_id: string }>('select * from stats;');
		return result.toArray();
	}
}
