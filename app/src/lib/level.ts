import type { Stamp, StampId } from '../types';

export const STAMPS: Stamp[] = [
  { id: 'first_discovery', name: '문제 발견가', icon: '🔎', description: '첫 문제 상황을 발견했어요' },
  { id: 'discovery_5', name: '불편 사냥꾼', icon: '🏹', description: '문제를 5개 발견했어요' },
  { id: 'first_idea', name: '아이디어 새싹', icon: '🌱', description: '첫 발명 아이디어를 만들었어요' },
  { id: 'idea_5', name: '아이디어 폭발', icon: '💥', description: '아이디어를 5개 만들었어요' },
  { id: 'fiveW1H_complete', name: '5W1H 탐정', icon: '🕵️', description: '5W1H를 모두 채웠어요' },
  { id: 'scamper_used', name: 'SCAMPER 마법사', icon: '🧙', description: 'SCAMPER 카드로 사고를 확장했어요' },
  { id: 'sdgs_explored', name: '지구 지킴이', icon: '🌏', description: 'SDGs 목표를 탐구했어요' },
  { id: 'awards_10', name: '수상작 탐험가', icon: '🏆', description: '수상작 10개를 자세히 봤어요' },
  { id: 'awards_50', name: '수상작 박사', icon: '🎓', description: '수상작 50개를 자세히 봤어요' },
  { id: 'patent_searched', name: '특허 조사관', icon: '📜', description: '특허 검색을 해봤어요' },
  { id: 'note_created', name: '노트 필기꾼', icon: '📓', description: '발명 노트를 만들었어요' },
  { id: 'plan_pdf', name: '계획서 완성!', icon: '📄', description: '발명계획서 PDF를 만들었어요' },
  { id: 'game_first', name: '카드게임 입문', icon: '🃏', description: '발명 카드게임을 플레이했어요' },
  { id: 'game_master', name: '카드게임 달인', icon: '👑', description: '카드게임에서 만점을 냈어요' },
  { id: 'inventor_first', name: '발명가 사냥꾼', icon: '🧑‍🔬', description: '발명가 퀴즈에서 첫 정답을 맞혔어요' },
  { id: 'inventor_perfect', name: '발명가 박사', icon: '🎓', description: '발명가 퀴즈에서 한 판을 전부 정답으로 클리어했어요' },
];

export interface LevelInfo {
  level: number;
  title: string;
  icon: string;
  minXp: number;
  maxXp: number;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: '발명 견습생', icon: '🌱', minXp: 0, maxXp: 49 },
  { level: 2, title: '발명 조수', icon: '🔧', minXp: 50, maxXp: 149 },
  { level: 3, title: '발명 연구원', icon: '🔬', minXp: 150, maxXp: 299 },
  { level: 4, title: '발명가', icon: '💡', minXp: 300, maxXp: 499 },
  { level: 5, title: '마스터 발명가', icon: '👑', minXp: 500, maxXp: Number.MAX_SAFE_INTEGER },
];

export function levelInfo(xp: number): LevelInfo {
  return LEVELS.find((l) => xp >= l.minXp && xp < l.maxXp) ?? LEVELS[0];
}

/** 다음 레벨까지 진행률 0~1 */
export function levelProgress(xp: number): number {
  const info = levelInfo(xp);
  if (info.maxXp === Number.MAX_SAFE_INTEGER) return 1;
  return Math.min(1, (xp - info.minXp) / (info.maxXp - info.minXp));
}

export function stampById(id: StampId): Stamp {
  return STAMPS.find((s) => s.id === id) ?? STAMPS[0];
}
