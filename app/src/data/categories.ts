import type { Category, WhatId, WhereId, WhoId } from '../types';

export const WHO_CATEGORIES: Category[] = [
  { id: 'student', label: '학생', icon: '🎒', description: '나 또는 친구들이 겪는 불편' },
  { id: 'disabled', label: '장애가 있는 사람', icon: '♿', description: '이동·보기·듣기가 어려운 사람들' },
  { id: 'teacher', label: '교사', icon: '🧑‍🏫', description: '수업을 준비하고 가르치는 선생님' },
  { id: 'child', label: '어린이', icon: '🧒', description: '나보다 어린 동생들' },
  { id: 'pedestrian', label: '보행자', icon: '🚶', description: '길을 걷는 모든 사람' },
  { id: 'others', label: '기타', icon: '👤', description: '할머니, 부모님, 직장인 등' },
];

export const WHERE_CATEGORIES: Category[] = [
  { id: 'school_classroom', label: '학교 · 교실', icon: '🏫', description: '교실, 복도, 사물함, 운동장' },
  { id: 'home', label: '집 · 가정 · 주방', icon: '🏠', description: '주방, 욕실, 현관, 거실' },
  {
    id: 'street_infra',
    label: '길 · 도로 · 시설',
    icon: '🛣️',
    description: '도로, 배수로, 엘리베이터, 지하철, 현관',
  },
  { id: 'lab_science', label: '실험실 · 과학실', icon: '🔬', description: '실험 기구, 과학 수업' },
  { id: 'others', label: '기타 장소', icon: '📍', description: '그 외 장소' },
];

export const WHAT_CATEGORIES: Category[] = [
  { id: 'safety', label: '안전', icon: '🚨', description: '사고, 화재, 넘어짐, 미끄러짐' },
  { id: 'door_access', label: '문 · 출입구', icon: '🚪', description: '문, 엘리베이터, 잠금장치' },
  {
    id: 'environment_waste',
    label: '환경 · 쓰레기',
    icon: '♻️',
    description: '쓰레기, 홍수, 배수로, 에너지',
  },
  {
    id: 'daily_goods',
    label: '생활용품',
    icon: '🧴',
    description: '우산, 휴지, 샤워기, 국자, 컵 등',
  },
  { id: 'health_sense', label: '헬스케어 · 감각 보조', icon: '🩺', description: '건강, 약, 점자, 감각 보조' },
  { id: 'others', label: '기타 문제', icon: '❓', description: '그 외 문제' },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  [...WHO_CATEGORIES, ...WHERE_CATEGORIES, ...WHAT_CATEGORIES].map((c) => [c.id, c]),
);

export function categoryLabel(id: string): string {
  return CATEGORY_MAP[id]?.label ?? id;
}

export function categoryIcon(id: string): string {
  return CATEGORY_MAP[id]?.icon ?? '📌';
}

export function findWho(id: string): Category {
  return WHO_CATEGORIES.find((c) => c.id === id) ?? WHO_CATEGORIES[WHO_CATEGORIES.length - 1];
}
export function findWhere(id: string): Category {
  return WHERE_CATEGORIES.find((c) => c.id === id) ?? WHERE_CATEGORIES[WHERE_CATEGORIES.length - 1];
}
export function findWhat(id: string): Category {
  return WHAT_CATEGORIES.find((c) => c.id === id) ?? WHAT_CATEGORIES[WHAT_CATEGORIES.length - 1];
}

export function isWhoId(v: string): v is WhoId {
  return WHO_CATEGORIES.some((c) => c.id === v);
}
export function isWhereId(v: string): v is WhereId {
  return WHERE_CATEGORIES.some((c) => c.id === v);
}
export function isWhatId(v: string): v is WhatId {
  return WHAT_CATEGORIES.some((c) => c.id === v);
}

// 감정/불편 정도 척도
export const EMOTION_SCALE: { value: number; label: string; icon: string }[] = [
  { value: 1, label: '조금 불편해요', icon: '🙂' },
  { value: 2, label: '가끔 불편해요', icon: '😐' },
  { value: 3, label: '자주 불편해요', icon: '😕' },
  { value: 4, label: '매우 불편해요', icon: '😫' },
  { value: 5, label: '위험해요! 꼭 해결!', icon: '🚨' },
];
