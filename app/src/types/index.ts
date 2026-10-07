// ===== SSI 수상작 데이터 =====
export interface SsiCommandment {
  no: number;
  title: string;
  interpretation: string;
}

export interface SsiFiveW1H {
  who: string;
  when: string;
  where: string;
  what: string;
  why: string;
  how: string;
}

export interface SsiAward {
  id: string;
  year: number;
  award: string;
  title: string;
  /** 원본 데이터에서 제목이 유실되어 학교명으로 대체된 경우 true */
  titleMissing?: boolean;
  school: string;
  student: string;
  /** 2019년 데이터: 지도교사명 (학교 정보 없음) */
  teacher?: string;
  commandments: SsiCommandment[];
  fiveW1H: SsiFiveW1H;
  tags: {
    who: string[];
    where: string[];
    what: string[];
  };
}

// ===== 카테고리 =====
export type WhoId = 'student' | 'disabled' | 'teacher' | 'child' | 'pedestrian' | 'others';
export type WhereId = 'school_classroom' | 'home' | 'street_infra' | 'lab_science' | 'others';
export type WhatId =
  | 'safety'
  | 'door_access'
  | 'environment_waste'
  | 'daily_goods'
  | 'health_sense'
  | 'others';

export interface Category {
  id: string;
  label: string;
  icon: string;
  description: string;
}

// ===== 문제 발견 (네비게이터 결과) =====
export interface DiscoveryEntry {
  id: string;
  createdAt: number;
  who: WhoId;
  whoCustom: string;
  where: WhereId;
  whereCustom: string;
  what: WhatId;
  whatCustom: string;
  /** 불편/감정 정도 1~5 */
  emotion: number;
  problemStatement: string;
  sdgCode?: string;
  linkedIdeaIds: string[];
}

// ===== 발명 아이디어 =====
export interface ScamperNote {
  key: string;
  note: string;
}

export interface IdeaEntry {
  id: string;
  createdAt: number;
  discoveryId?: string;
  title: string;
  summary: string;
  fiveW1H: Partial<SsiFiveW1H>;
  scamper: ScamperNote[];
  keywords: string[];
  inspiredByAwardId?: string;
}

// ===== 발명 노트 =====
export interface NoteEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  content: string;
}

// ===== 발명계획서 =====
export interface PlanEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  studentId: string;
  studentName: string;
  className: string;
  inventionTitle: string;
  purpose: string;
  who: string;
  where: string;
  problemSituation: string;
  why: string;
  ideaSummary: string;
  mechanismDescription: string;
  materialsTools: string;
  usageScenario: string;
  planSteps: string[];
  expectedSchedule: string;
  expectedEffects: string;
  evaluationPlan: string;
  studentReflection: string;
  submittedToTeacher: boolean;
  submittedAt?: number;
}

// ===== 카드게임 =====
export interface GameScore {
  id: string;
  playedAt: number;
  mode: string;
  score: number;
  total: number;
}

export interface HistoryCard {
  id: string;
  name: string;
  year: string;
  inventor: string;
  story: string;
  commandmentNos: number[];
  hint: string;
}

// ===== 교사용 =====
export interface FeedbackScores {
  creativity: number; // 창의성
  functionality: number; // 기능성
  practicality: number; // 실용성
  economy: number; // 경제성
  aesthetics: number; // 심미성
}

export interface FeedbackRecord {
  id: string;
  createdAt: number;
  presenterName: string;
  inventionTitle: string;
  scores: FeedbackScores;
  comment: string;
}

export interface PresentationOrder {
  id: string;
  createdAt: number;
  className: string;
  order: string[];
}

export interface TeacherConfig {
  gasUrl: string;
  classCode: string;
  className: string;
}

// ===== 발명가 =====
export interface InventorStorySection {
  title: string;
  text: string;
}

export interface InventorStory {
  nation: string;
  flag: string;
  life: string;
  inventions: string;
  sections: InventorStorySection[];
}

export interface Inventor {
  id: string;
  name: string;
  nameKo: string;
  field: string;
  fieldKo: string;
  flag: string;
  nation: string;
  education: string;
  life: string;
  birthYear: number | null;
  inventions: string;
  summary: string;
  isKorean: boolean;
  /** 한국어 위키백과 문서 제목 (검증된 인물만) */
  wiki?: string;
  story?: InventorStory;
}

// ===== 도장/레벨 =====
export type StampId =
  | 'first_discovery'
  | 'discovery_5'
  | 'first_idea'
  | 'idea_5'
  | 'fiveW1H_complete'
  | 'scamper_used'
  | 'sdgs_explored'
  | 'awards_10'
  | 'awards_50'
  | 'patent_searched'
  | 'note_created'
  | 'plan_pdf'
  | 'game_first'
  | 'game_master'
  | 'inventor_first'
  | 'inventor_perfect';

export interface Stamp {
  id: StampId;
  name: string;
  icon: string;
  description: string;
}

// ===== 제출 대기열 (GAS 전송용) =====
export interface PendingSubmission {
  id: string;
  createdAt: number;
  type: 'plan' | 'discovery' | 'idea' | 'report';
  classCode: string;
  studentId: string;
  studentName: string;
  className: string;
  title: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: number;
  error?: string;
}

// ===== 저장된 학급 프로필 (교사용 반 전환) =====
export interface TeacherClassProfile {
  classCode: string;
  className: string;
  gasUrl: string;
  savedAt: number;
}
