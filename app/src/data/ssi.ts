import rawData from './ssiAwards.json';
import rawStats from './ssiStats.json';
import type { SsiAward } from '../types';

// JSON 임포트는 타입이 any로 넓혀지므로 진입점에서 한 번만 좁힌다
export const SSI_AWARDS = rawData as SsiAward[];

export interface SsiStats {
  total: number;
  byYear: Record<string, number>;
  byAward: Record<string, number>;
  who: Record<string, number>;
  where: Record<string, number>;
  what: Record<string, number>;
}

export const SSI_STATS = rawStats as SsiStats;

export const AWARD_ORDER = ['대통령상', '국무총리상', '최우수상', '특상', '우수상', '장려상'];
export const AWARD_COLORS: Record<string, string> = {
  대통령상: '#E11D48',
  국무총리상: '#BE123C',
  최우수상: '#D97706',
  특상: '#7C3AED',
  우수상: '#2563EB',
  장려상: '#64748B',
};

export function awardColor(award: string): string {
  return AWARD_COLORS[award] ?? '#64748B';
}

export function awardRank(award: string): number {
  const i = AWARD_ORDER.indexOf(award);
  return i === -1 ? AWARD_ORDER.length : i;
}

export interface AwardFilter {
  query: string;
  year: number | null;
  award: string | null;
  commandment: number | null;
  who: string | null;
  where: string | null;
  what: string | null;
}

export const EMPTY_FILTER: AwardFilter = {
  query: '',
  year: null,
  award: null,
  commandment: null,
  who: null,
  where: null,
  what: null,
};

export function filterAwards(filter: AwardFilter): SsiAward[] {
  const q = filter.query.trim().toLowerCase();
  return SSI_AWARDS.filter((a) => {
    if (filter.year !== null && a.year !== filter.year) return false;
    if (filter.award && a.award !== filter.award) return false;
    if (filter.commandment !== null && !a.commandments.some((c) => c.no === filter.commandment))
      return false;
    if (filter.who && !a.tags.who.includes(filter.who)) return false;
    if (filter.where && !a.tags.where.includes(filter.where)) return false;
    if (filter.what && !a.tags.what.includes(filter.what)) return false;
    if (q) {
      const hay = `${a.title} ${a.school} ${a.student} ${a.teacher ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function awardById(id: string): SsiAward | undefined {
  return SSI_AWARDS.find((a) => a.id === id);
}

/** 아이디어 문장과 비슷한 수상작 찾기 (키워드 겹침 기준) */
export function similarAwards(keywords: string[], limit = 6): SsiAward[] {
  const scored = SSI_AWARDS.map((a) => {
    const hay = `${a.title} ${a.fiveW1H.what} ${a.fiveW1H.how}`.toLowerCase();
    let score = 0;
    for (const k of keywords) if (k.length >= 2 && hay.includes(k.toLowerCase())) score += 2;
    for (const c of a.commandments) if (keywords.includes(String(c.no))) score += 1;
    return { a, score };
  })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score || awardRank(y.a.award) - awardRank(x.a.award));
  return scored.slice(0, limit).map((s) => s.a);
}
