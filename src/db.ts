import { DurableObject } from 'cloudflare:workers';

export type Advent = {
	user_id: string;
	day: number;
	year: number;
	claimed_at: number;
};

export type Stats = {
	user_id: string;
	advent_on_cooldown: number;
	mzpl_uses: number;
};
export type Statistic = Exclude<keyof Stats, 'user_id'>;

export type BreadGame = {
	user_id: string;
	burgers: number;
	bread: number;
	slices: number;
	mold: number;
	cows_capable: number;
	cows_milked: number;
	milk: number;
	whipped_milk: number;
	raw_steak: number;
	cheese: number;
	cooked_steak: number;
	knife: number;
};

export interface Dump {
	advent: Advent[];
	stats: Stats[];
	breadGame: BreadGame[];
}

export class EpicDb extends DurableObject<Env> {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		this.sql = ctx.storage.sql;
		this.sql.exec(/*sql*/ `
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
		const res = this.sql.exec('insert or ignore into advent(user_id, day, year, claimed_at) values(?, ?, ?, ?);', userId, day, year, at);
		return res.rowsWritten > 0;
	}

	async updateStatistic(userId: string, stat: Statistic, diff: number) {
		if (!/^[a-z_]+$/.test(stat)) throw new Error(`"${stat}" isn't a valid statistic. possible SQL injection attempt?`);

		this.sql.exec(
			/*sql*/
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
		const result = this.sql.exec<Omit<Advent, 'year'>>(
			'select user_id, day, claimed_at from advent where year = ? and claimed_at is not null;',
			year,
		);
		return result.toArray();
	}

	async getStatistics() {
		const result = this.sql.exec<Stats>('select * from stats;');
		return result.toArray();
	}

	async import({ advent, stats, breadGame }: Dump) {
		return this.ctx.storage.transactionSync(() => {
			let rowsWritten = 0;

			for (const { user_id, day, year, claimed_at } of advent) {
				rowsWritten += this.sql.exec(
					/*sql*/
					`insert into advent(user_id, day, year, claimed_at)
					values(?, ?, ?, ?)
					on conflict do update set claimed_at = excluded.claimed_at;`,
					user_id,
					day,
					year,
					claimed_at,
				).rowsWritten;
			}
			for (const { user_id, advent_on_cooldown, mzpl_uses } of stats) {
				rowsWritten += this.sql.exec(
					/*sql*/
					`insert into stats(user_id, advent_on_cooldown, mzpl_uses)
					values(?, ?, ?)
					on conflict do update set
						advent_on_cooldown = excluded.advent_on_cooldown,
						mzpl_uses = excluded.mzpl_uses;`,
					user_id,
					advent_on_cooldown,
					mzpl_uses,
				).rowsWritten;
			}
			for (const row of breadGame) {
				rowsWritten += this.sql.exec(
					/*sql*/
					`insert into bread_game(
						user_id, burgers, bread, slices, mold, cows_capable, cows_milked,
						milk, whipped_milk, raw_steak, cheese, cooked_steak, knife
					) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					on conflict do update set
						burgers = excluded.burgers,
	          bread = excluded.bread,
	          slices = excluded.slices,
	          mold = excluded.mold,
	          cows_capable = excluded.cows_capable,
	          cows_milked = excluded.cows_milked,
	          milk = excluded.milk,
	          whipped_milk = excluded.whipped_milk,
	          raw_steak = excluded.raw_steak,
	          cheese = excluded.cheese,
	          cooked_steak = excluded.cooked_steak,
	          knife = excluded.knife`,
					row.user_id,
					row.burgers,
					row.bread,
					row.slices,
					row.mold,
					row.cows_capable,
					row.cows_milked,
					row.milk,
					row.whipped_milk,
					row.raw_steak,
					row.cheese,
					row.cooked_steak,
					row.knife,
				).rowsWritten;
			}

			return rowsWritten;
		});
	}
}
