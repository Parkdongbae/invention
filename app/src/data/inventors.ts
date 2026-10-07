import raw from './inventors.json';
import statsRaw from './inventorStats.json';
import type { Inventor } from '../types';

export const INVENTORS = raw as Inventor[];

export interface InventorStats {
  total: number;
  korean: number;
  withStory: number;
  byNation: Record<string, number>;
  byField: Record<string, number>;
}

export const INVENTOR_STATS = statsRaw as InventorStats;

export function inventorName(inv: Inventor): string {
  // 외국인은 "이름(한글)", 한국인은 한글 이름만
  if (inv.isKorean || !inv.nameKo) return inv.nameKo || inv.name;
  return `${inv.name}(${inv.nameKo})`;
}

export function inventorSubName(inv: Inventor): string {
  // 보조 표기: 한국인은 영문명, 외국인은 이미 본문에 한글이 있으므로 생략
  return inv.isKorean ? inv.name : '';
}

export function wikiUrl(inv: Inventor): string | null {
  if (!inv.wiki) return null;
  return `https://ko.wikipedia.org/wiki/${encodeURIComponent(inv.wiki.replace(/ /g, '_'))}`;
}

export const QUIZ_NATIONS = ['🇰🇷 대한민국', '🇺🇸 미국', '🇬🇧 영국', '🇩🇪 독일', '🇯🇵 일본'];

/** 한 사람의 표시용 발명품 목록 (쉼표 분리) */
export function inventionList(inv: Inventor): string[] {
  return inv.inventions
    .split(/[,·]/)
    .map((s) => s.replace(/\(.*?\)/g, '').trim())
    .filter((s) => s.length >= 2);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 정답 주변에서 오답 선택지 3개 뽑기 (같은 국가 우선, 부족하면 전체에서) */
export function pickDistractors(answer: Inventor, pool: Inventor[]): Inventor[] {
  const others = pool.filter((i) => i.id !== answer.id);
  const sameNation = shuffle(others.filter((i) => i.nation === answer.nation));
  const chosen: Inventor[] = [];
  for (const cand of sameNation) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(cand)) chosen.push(cand);
  }
  if (chosen.length < 3) {
    const rest = shuffle(others.filter((i) => !chosen.includes(i)));
    for (const cand of rest) {
      if (chosen.length >= 3) break;
      chosen.push(cand);
    }
  }
  return chosen;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
