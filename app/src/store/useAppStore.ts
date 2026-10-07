import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DiscoveryEntry,
  FeedbackRecord,
  GameScore,
  IdeaEntry,
  NoteEntry,
  PendingSubmission,
  PlanEntry,
  PresentationOrder,
  StampId,
  TeacherClassProfile,
  TeacherConfig,
} from '../types';
import { STAMPS, levelInfo } from '../lib/level';
import { playSfx, setSoundEnabled } from '../lib/sound';

export interface Profile {
  nickname: string;
  avatar: string;
  xp: number;
}

export const AVATARS = ['🧑‍🔬', '👩‍🔬', '🦸', '🧙', '👷', '🕵️', '🤖', '🐱', '🦊', '🐼'];

export const XP_TABLE = {
  discovery: 10,
  idea: 15,
  note: 5,
  planSave: 20,
  planPdf: 30,
  gameCorrect: 5,
  awardExplore: 1,
  patentSearch: 5,
} as const;

export interface AppState {
  profile: Profile;
  sfx: boolean;
  stamps: StampId[];
  discoveries: DiscoveryEntry[];
  ideas: IdeaEntry[];
  notes: NoteEntry[];
  plans: PlanEntry[];
  gameScores: GameScore[];
  pending: PendingSubmission[];
  teacher: TeacherConfig & {
    feedback: FeedbackRecord[];
    presentationOrders: PresentationOrder[];
  };
  teacherClasses: TeacherClassProfile[];
  exploredAwardIds: string[];
  sdgsExplored: boolean;

  setProfile: (patch: Partial<Profile>) => void;
  toggleSfx: () => void;
  addXp: (amount: number) => void;
  earnStamp: (id: StampId) => boolean;

  addDiscovery: (entry: DiscoveryEntry) => void;
  removeDiscovery: (id: string) => void;
  linkIdea: (discoveryId: string, ideaId: string) => void;

  addIdea: (entry: IdeaEntry) => void;
  updateIdea: (id: string, patch: Partial<IdeaEntry>) => void;
  removeIdea: (id: string) => void;

  addNote: (entry: NoteEntry) => void;
  updateNote: (id: string, patch: Partial<NoteEntry>) => void;
  removeNote: (id: string) => void;

  addPlan: (entry: PlanEntry) => void;
  updatePlan: (id: string, patch: Partial<PlanEntry>) => void;
  removePlan: (id: string) => void;

  addGameScore: (score: GameScore) => void;
  markAwardExplored: (id: string) => void;
  markSdgsExplored: () => void;

  enqueue: (sub: PendingSubmission) => void;
  markSubmissionStatus: (id: string, status: PendingSubmission['status'], error?: string) => void;

  setTeacherConfig: (patch: Partial<TeacherConfig>) => void;
  saveTeacherClass: (profile: Omit<TeacherClassProfile, 'savedAt'>) => void;
  removeTeacherClass: (classCode: string) => void;
  addFeedback: (record: FeedbackRecord) => void;
  removeFeedback: (id: string) => void;
  addPresentationOrder: (order: PresentationOrder) => void;
  removePresentationOrder: (id: string) => void;
}

const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: { nickname: '', avatar: AVATARS[0], xp: 0 },
      sfx: true,
      stamps: [],
      discoveries: [],
      ideas: [],
      notes: [],
      plans: [],
      gameScores: [],
      pending: [],
      teacher: { gasUrl: '', classCode: '', className: '', publicBaseUrl: '', feedback: [], presentationOrders: [] },
      teacherClasses: [],
      exploredAwardIds: [],
      sdgsExplored: false,
      setProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      toggleSfx: () => {
        const next = !get().sfx;
        set({ sfx: next });
        setSoundEnabled(next);
        if (next) playSfx('click');
      },

      addXp: (amount) => {
        const beforeLevel = levelInfo(get().profile.xp).level;
        set((s) => ({ profile: { ...s.profile, xp: s.profile.xp + amount } }));
        if (levelInfo(get().profile.xp).level > beforeLevel) playSfx('levelup');
      },

      earnStamp: (id) => {
        if (get().stamps.includes(id)) return false;
        set((s) => ({ stamps: [...s.stamps, id] }));
        playSfx('stamp');
        return true;
      },

      addDiscovery: (entry) =>
        set((s) => ({
          discoveries: [entry, ...s.discoveries],
        })),
      removeDiscovery: (id) =>
        set((s) => ({ discoveries: s.discoveries.filter((d) => d.id !== id) })),
      linkIdea: (discoveryId, ideaId) =>
        set((s) => ({
          discoveries: s.discoveries.map((d) =>
            d.id === discoveryId ? { ...d, linkedIdeaIds: [...d.linkedIdeaIds, ideaId] } : d,
          ),
        })),

      addIdea: (entry) => set((s) => ({ ideas: [entry, ...s.ideas] })),
      updateIdea: (id, patch) =>
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),

      addNote: (entry) => set((s) => ({ notes: [entry, ...s.notes] })),
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
          ),
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      addPlan: (entry) => set((s) => ({ plans: [entry, ...s.plans] })),
      updatePlan: (id, patch) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
        })),
      removePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

      addGameScore: (score) => set((s) => ({ gameScores: [score, ...s.gameScores].slice(0, 50) })),

      markAwardExplored: (id) =>
        set((s) => {
          if (s.exploredAwardIds.includes(id)) return s;
          return { exploredAwardIds: [...s.exploredAwardIds, id] };
        }),

      markSdgsExplored: () => set({ sdgsExplored: true }),

      enqueue: (sub) => set((s) => ({ pending: [sub, ...s.pending] })),
      markSubmissionStatus: (id, status, error) =>
        set((s) => ({
          pending: s.pending.map((p) =>
            p.id === id
              ? { ...p, status, error, sentAt: status === 'sent' ? Date.now() : p.sentAt }
              : p,
          ),
        })),

      setTeacherConfig: (patch) => set((s) => ({ teacher: { ...s.teacher, ...patch } })),
      saveTeacherClass: (profile) =>
        set((s) => {
          const rest = s.teacherClasses.filter((c) => c.classCode !== profile.classCode);
          return { teacherClasses: [{ ...profile, savedAt: Date.now() }, ...rest].slice(0, 20) };
        }),
      removeTeacherClass: (classCode) =>
        set((s) => ({
          teacherClasses: s.teacherClasses.filter((c) => c.classCode !== classCode),
        })),
      addFeedback: (record) =>
        set((s) => ({ teacher: { ...s.teacher, feedback: [record, ...s.teacher.feedback] } })),
      removeFeedback: (id) =>
        set((s) => ({
          teacher: { ...s.teacher, feedback: s.teacher.feedback.filter((f) => f.id !== id) },
        })),
      addPresentationOrder: (order) =>
        set((s) => ({
          teacher: { ...s.teacher, presentationOrders: [order, ...s.teacher.presentationOrders] },
        })),
      removePresentationOrder: (id) =>
        set((s) => ({
          teacher: {
            ...s.teacher,
            presentationOrders: s.teacher.presentationOrders.filter((o) => o.id !== id),
          },
        })),
    }),
    {
      name: 'invention-helper-v1',
      version: 1,
      onRehydrateStorage: () => (state) => {
        setSoundEnabled(state?.sfx ?? true);
      },
    },
  ),
);

export { STAMPS, uid };
