import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XP_TABLE, uid, useAppStore } from '../../store/useAppStore';
import type { IdeaEntry, PendingSubmission, PlanEntry } from '../../types';
import { exportPlanToPdf } from '../../lib/pdf';
import { gasPost } from '../../lib/gas';
import { EmptyState, Modal, Section, toast } from '../../components/ui';

// ===== 계획서 폼 타입 (PlanEntry에서 관리 필드만) =====
interface PlanForm {
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
}

type TextKey = Exclude<keyof PlanForm, 'planSteps'>;

/** 완성도 게이지에 세는 필수 항목 (14개 텍스트 + 제작 계획 단계 = 15) */
const TEXT_FIELDS: { key: TextKey; label: string }[] = [
  { key: 'inventionTitle', label: '발명 제목' },
  { key: 'purpose', label: '발명 목적' },
  { key: 'who', label: '누구를 위해 (WHO)' },
  { key: 'where', label: '어디서 (WHERE)' },
  { key: 'problemSituation', label: '문제 상황' },
  { key: 'why', label: '왜 필요한가 (WHY)' },
  { key: 'ideaSummary', label: '아이디어 요약' },
  { key: 'mechanismDescription', label: '작동 원리 · 구조' },
  { key: 'materialsTools', label: '재료 및 도구' },
  { key: 'usageScenario', label: '사용 시나리오' },
  { key: 'expectedSchedule', label: '예상 일정' },
  { key: 'expectedEffects', label: '기대 효과' },
  { key: 'evaluationPlan', label: '평가 계획' },
  { key: 'studentReflection', label: '학생 소감' },
];
const REQUIRED_TOTAL = TEXT_FIELDS.length + 1; // + 제작 계획 단계

const fmtDate = (ts: number): string => new Date(ts).toLocaleDateString('ko-KR');

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="field-label">{props.label}</label>
      {props.multiline ? (
        <textarea
          className="textarea"
          value={props.value}
          rows={props.rows ?? 3}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
        />
      ) : (
        <input
          className="input"
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function PlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const plans = useAppStore((s) => s.plans);
  const teacher = useAppStore((s) => s.teacher);
  const pending = useAppStore((s) => s.pending);
  const addPlan = useAppStore((s) => s.addPlan);
  const updatePlan = useAppStore((s) => s.updatePlan);
  const removePlan = useAppStore((s) => s.removePlan);
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);
  const enqueue = useAppStore((s) => s.enqueue);
  const markSubmissionStatus = useAppStore((s) => s.markSubmissionStatus);
  const setTeacherConfig = useAppStore((s) => s.setTeacherConfig);

  const [form, setForm] = useState<PlanForm>(() => {
    // 마지막 계획서의 학생 정보를 기본값으로 재사용
    const last = useAppStore.getState().plans[0];
    return {
      studentId: last?.studentId ?? '',
      studentName: last?.studentName ?? '',
      className: last?.className ?? '',
      inventionTitle: '',
      purpose: '',
      who: '',
      where: '',
      problemSituation: '',
      why: '',
      ideaSummary: '',
      mechanismDescription: '',
      materialsTools: '',
      usageScenario: '',
      planSteps: [''],
      expectedSchedule: '',
      expectedEffects: '',
      evaluationPlan: '',
      studentReflection: '',
    };
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [earnedSaveXp, setEarnedSaveXp] = useState(false);
  const [loadedIdea, setLoadedIdea] = useState<IdeaEntry | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const ideaPrefilled = useRef(false);

  // URL ?idea= 로 아이디어 프리필 (최초 1회만)
  useEffect(() => {
    if (ideaPrefilled.current) return;
    ideaPrefilled.current = true;
    const ideaId = searchParams.get('idea');
    if (!ideaId) return;
    const idea = useAppStore.getState().ideas.find((i) => i.id === ideaId);
    if (!idea) return;
    setForm((f) => ({
      ...f,
      inventionTitle: idea.title || f.inventionTitle,
      ideaSummary: idea.summary || f.ideaSummary,
    }));
    setLoadedIdea(idea);
  }, [searchParams]);

  const setText = (key: TextKey, value: string) =>
    setForm((f) => {
      const next: PlanForm = { ...f };
      next[key] = value;
      return next;
    });

  const setStep = (idx: number, value: string) =>
    setForm((f) => ({ ...f, planSteps: f.planSteps.map((s, i) => (i === idx ? value : s)) }));
  const addStep = () => setForm((f) => ({ ...f, planSteps: [...f.planSteps, ''] }));
  const removeStep = (idx: number) =>
    setForm((f) => ({ ...f, planSteps: f.planSteps.filter((_, i) => i !== idx) }));

  const filledCount =
    TEXT_FIELDS.filter((t) => form[t.key].trim() !== '').length +
    (form.planSteps.some((s) => s.trim() !== '') ? 1 : 0);
  const progressPct = Math.round((filledCount / REQUIRED_TOTAL) * 100);

  /** 현재 폼을 store에 저장하고 저장된 엔트리를 반환 (검증 실패 시 null) */
  const savePlan = (): PlanEntry | null => {
    if (!form.inventionTitle.trim()) {
      toast('발명 제목을 먼저 입력해 주세요!', '✏️');
      return null;
    }
    const now = Date.now();
    if (editingId) {
      updatePlan(editingId, { ...form });
      if (!earnedSaveXp) {
        addXp(XP_TABLE.planSave);
        setEarnedSaveXp(true);
      }
      toast('계획서를 저장했어요!', '💾');
      return useAppStore.getState().plans.find((p) => p.id === editingId) ?? null;
    }
    const entry: PlanEntry = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      ...form,
      submittedToTeacher: false,
    };
    addPlan(entry);
    if (!earnedSaveXp) {
      addXp(XP_TABLE.planSave);
      setEarnedSaveXp(true);
    }
    setEditingId(entry.id);
    toast('새 계획서를 저장했어요!', '💾');
    return entry;
  };

  const loadPlan = (p: PlanEntry) => {
    setEditingId(p.id);
    setEarnedSaveXp(true); // 기존 계획서 수정에는 XP를 다시 주지 않음
    setLoadedIdea(null);
    setForm({
      ...p,
      planSteps: p.planSteps.length > 0 ? [...p.planSteps] : [''],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const newPlan = () => {
    setEditingId(null);
    setEarnedSaveXp(false);
    setLoadedIdea(null);
    setForm((f) => ({
      studentId: f.studentId,
      studentName: f.studentName,
      className: f.className,
      inventionTitle: '',
      purpose: '',
      who: '',
      where: '',
      problemSituation: '',
      why: '',
      ideaSummary: '',
      mechanismDescription: '',
      materialsTools: '',
      usageScenario: '',
      planSteps: [''],
      expectedSchedule: '',
      expectedEffects: '',
      evaluationPlan: '',
      studentReflection: '',
    }));
  };

  const handlePdf = async () => {
    if (!form.studentId.trim() || !form.studentName.trim()) {
      toast('PDF에는 학번과 이름이 들어가요. 먼저 입력해 주세요!', '⚠️');
      return;
    }
    const saved = savePlan();
    if (!saved) return;
    const plan: PlanEntry = { ...saved, ...form };
    setPdfBusy(true);
    try {
      await exportPlanToPdf(plan);
      if (earnStamp('plan_pdf')) addXp(XP_TABLE.planPdf);
      toast('발명가 인증 도장과 함께 PDF가 저장됐어요!', '🎖️');
    } catch {
      toast('PDF 저장에 실패했어요. 다시 시도해 주세요.', '😅');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleSend = async () => {
    if (!teacher.gasUrl.trim()) {
      setGuideOpen(true);
      return;
    }
    if (!form.studentId.trim() || !form.studentName.trim()) {
      toast('학번과 이름을 먼저 입력해 주세요!', '⚠️');
      return;
    }
    if (sending) return;
    const saved = savePlan();
    if (!saved) return;
    const plan: PlanEntry = { ...saved, ...form };
    const sub: PendingSubmission = {
      id: uid(),
      createdAt: Date.now(),
      type: 'plan',
      classCode: teacher.classCode || plan.className,
      studentId: plan.studentId,
      studentName: plan.studentName,
      className: plan.className,
      title: plan.inventionTitle,
      payload: { planId: plan.id },
      status: 'pending',
    };
    enqueue(sub);
    setSending(true);
    const res = await gasPost(teacher.gasUrl.trim(), {
      type: 'plan',
      classCode: sub.classCode,
      studentId: plan.studentId,
      studentName: plan.studentName,
      className: plan.className,
      title: plan.inventionTitle,
      payload: plan,
    });
    setSending(false);
    if (res.ok) {
      markSubmissionStatus(sub.id, 'sent');
      updatePlan(plan.id, { submittedToTeacher: true, submittedAt: Date.now() });
      toast('선생님께 보냈어요! 선생님 구글시트를 확인해 보세요.', '📨');
    } else {
      markSubmissionStatus(sub.id, 'failed', res.error);
      toast(
        `전송에 실패했어요(${res.error ?? '알 수 없는 오류'}). 인터넷을 확인하고 다시 시도해 주세요.`,
        '❌',
      );
    }
  };

  /** 계획서 카드의 전송 상태 뱃지 */
  const planStatus = (p: PlanEntry): { label: string; bg: string; fg: string } => {
    const latest = pending.find(
      (s) =>
        s.type === 'plan' && typeof s.payload.planId === 'string' && s.payload.planId === p.id,
    );
    if (latest?.status === 'sent' || p.submittedToTeacher)
      return { label: '전송 완료', bg: 'var(--mint-soft)', fg: 'var(--mint)' };
    if (latest?.status === 'failed')
      return { label: '전송 실패', bg: 'var(--accent-soft)', fg: 'var(--accent)' };
    if (latest?.status === 'pending')
      return { label: '전송 중', bg: 'var(--amber-soft)', fg: 'var(--amber)' };
    return { label: '미전송', bg: 'var(--surface-2)', fg: 'var(--ink-3)' };
  };

  return (
    <div>
      <Section
        title="📄 발명계획서"
        sub="우리 반 발명 수업의 공식 문서예요. 차근차근 채워 보세요!"
        right={
          <button className="btn btn-sm" onClick={newPlan}>
            ✏️ 새 계획서
          </button>
        }
      >
        {/* 진행률 + 액션 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <strong>계획서 진행률</strong>
            <span
              className="badge"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}
            >
              {filledCount}/{REQUIRED_TOTAL} 항목
            </span>
            <div className="spacer" />
            {editingId && <span className="tiny">저장된 계획서를 편집하고 있어요</span>}
          </div>
          <div className="xp-bar" style={{ height: 10, borderRadius: 6 }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--primary), #8b5cf6)',
                borderRadius: 6,
              }}
            />
          </div>
          <div className="row-wrap" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => savePlan()}>
              💾 저장하기
            </button>
            <button className="btn" onClick={handlePdf} disabled={pdfBusy}>
              {pdfBusy ? '⏳ PDF 만드는 중...' : '📄 PDF 내보내기'}
            </button>
            <button className="btn" onClick={handleSend} disabled={sending}>
              {sending ? '⏳ 보내는 중...' : '📨 선생님께 보내기'}
            </button>
            {teacher.gasUrl.trim() ? (
              <span
                className="badge"
                style={{ background: 'var(--mint-soft)', color: 'var(--mint)' }}
                title={`연결된 반: ${teacher.className || teacher.classCode || '설정됨'}`}
              >
                🏫 {teacher.className || teacher.classCode || '연결됨'} 연결됨
              </span>
            ) : (
              <span className="tiny" style={{ color: 'var(--ink-3)' }}>
                아직 반 연결 전 — 보내기를 누르면 연결 방법을 알려줘요
              </span>
            )}
          </div>
        </div>

        {/* 불러온 아이디어 배너 */}
        {loadedIdea && (
          <div
            className="card card-tight"
            style={{
              marginBottom: 16,
              background: 'var(--primary-soft)',
              borderColor: 'var(--primary)',
            }}
          >
            <div className="row" style={{ marginBottom: 6 }}>
              <strong>💡 불러온 아이디어: {loadedIdea.title}</strong>
            </div>
            <p className="muted" style={{ marginBottom: 10 }}>
              {loadedIdea.summary}
            </p>
            <div className="row-wrap">
              {loadedIdea.keywords.map((k) => (
                <span
                  key={k}
                  className="badge"
                  style={{ background: 'var(--surface)', color: 'var(--primary-deep)' }}
                >
                  #{k}
                </span>
              ))}
              <button
                className="btn btn-sm"
                onClick={() =>
                  navigate(`/patent?q=${encodeURIComponent(loadedIdea.keywords.join(' '))}`)
                }
              >
                📜 이 아이디어 특허 검색하기
              </button>
            </div>
          </div>
        )}

        {/* 학생 정보 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 12 }}>🙋 학생 정보</strong>
          <div className="grid grid-3">
            <div>
              <label className="field-label">학번 (숫자 4자리)</label>
              <input
                className="input"
                inputMode="numeric"
                maxLength={4}
                value={form.studentId}
                placeholder="예: 0301"
                onChange={(e) => setText('studentId', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <div>
              <label className="field-label">이름</label>
              <input
                className="input"
                value={form.studentName}
                placeholder="예: 김발명"
                onChange={(e) => setText('studentName', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">학급 (예: 1-1)</label>
              <input
                className="input"
                value={form.className}
                placeholder="예: 1-1"
                onChange={(e) => setText('className', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 발명 개요 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 12 }}>💡 발명 개요</strong>
          <div className="col">
            <Field
              label="발명 제목"
              value={form.inventionTitle}
              onChange={(v) => setText('inventionTitle', v)}
              placeholder="예: 비 오는 날도 안전한 미끄럼 방지 우산꽂이"
            />
            <Field
              label="발명 목적"
              value={form.purpose}
              onChange={(v) => setText('purpose', v)}
              placeholder="이 발명을 왜 만들려고 하나요?"
              multiline
            />
            <div className="grid grid-2">
              <Field
                label="누구를 위해 (WHO)"
                value={form.who}
                onChange={(v) => setText('who', v)}
                placeholder="예: 우산을 든 초등학생"
              />
              <Field
                label="어디서 (WHERE)"
                value={form.where}
                onChange={(v) => setText('where', v)}
                placeholder="예: 학교 교실 입구"
              />
            </div>
            <Field
              label="문제 상황"
              value={form.problemSituation}
              onChange={(v) => setText('problemSituation', v)}
              placeholder="어떤 불편한 일이 일어나나요? 구체적으로 적어요."
              multiline
            />
            <Field
              label="왜 필요한가 (WHY)"
              value={form.why}
              onChange={(v) => setText('why', v)}
              placeholder="이 발명이 꼭 필요한 이유는 무엇인가요?"
              multiline
            />
            <Field
              label="아이디어 요약"
              value={form.ideaSummary}
              onChange={(v) => setText('ideaSummary', v)}
              placeholder="발명을 한 문장으로 요약해 볼까요?"
              multiline
              rows={2}
            />
          </div>
        </div>

        {/* 원리와 만들기 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 12 }}>🔧 작동 원리와 만들기</strong>
          <div className="col">
            <Field
              label="작동 원리 · 구조"
              value={form.mechanismDescription}
              onChange={(v) => setText('mechanismDescription', v)}
              placeholder="어떤 원리로 작동하나요? 구조를 설명해 보세요."
              multiline
            />
            <Field
              label="재료 및 도구"
              value={form.materialsTools}
              onChange={(v) => setText('materialsTools', v)}
              placeholder="예: 우산, 벨크로 테이프, 미끄럼 방지 패드, 가위"
              multiline
              rows={2}
            />
            <Field
              label="사용 시나리오"
              value={form.usageScenario}
              onChange={(v) => setText('usageScenario', v)}
              placeholder="누가 언제 어떻게 사용하나요? 이야기처럼 적어도 좋아요."
              multiline
            />
            <div>
              <label className="field-label">제작 계획 단계</label>
              <div className="col">
                {form.planSteps.map((step, i) => (
                  <div className="row" key={i}>
                    <span
                      className="badge"
                      style={{
                        background: 'var(--primary-soft)',
                        color: 'var(--primary-deep)',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}단계
                    </span>
                    <input
                      className="input"
                      value={step}
                      placeholder="이 단계에서 할 일을 적어요"
                      onChange={(e) => setStep(i, e.target.value)}
                    />
                    <button
                      className="btn btn-sm btn-ghost"
                      aria-label={`${i + 1}단계 삭제`}
                      disabled={form.planSteps.length <= 1}
                      onClick={() => removeStep(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={addStep}>
                ＋ 단계 추가
              </button>
            </div>
          </div>
        </div>

        {/* 계획과 평가 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 12 }}>📅 계획과 평가</strong>
          <div className="col">
            <Field
              label="예상 일정"
              value={form.expectedSchedule}
              onChange={(v) => setText('expectedSchedule', v)}
              placeholder="예: 1주차 설계, 2주차 재료 준비, 3~4주차 제작·시연"
              multiline
              rows={2}
            />
            <Field
              label="기대 효과"
              value={form.expectedEffects}
              onChange={(v) => setText('expectedEffects', v)}
              placeholder="이 발명이 세상을 어떻게 좋게 바꾸나요?"
              multiline
            />
            <Field
              label="평가 계획"
              value={form.evaluationPlan}
              onChange={(v) => setText('evaluationPlan', v)}
              placeholder="잘 만들었는지 어떻게 확인할까요? (테스트 방법, 평가 기준)"
              multiline
            />
            <Field
              label="학생 소감"
              value={form.studentReflection}
              onChange={(v) => setText('studentReflection', v)}
              placeholder="발명을 준비하며 느낀 점을 자유롭게 적어요."
              multiline
            />
          </div>
        </div>
      </Section>

      {/* 계획서 목록 */}
      <Section title="📚 내 계획서 목록" sub="카드를 누르면 내용을 불러와서 이어서 쓸 수 있어요.">
        {plans.length === 0 ? (
          <EmptyState
            icon="📄"
            title="아직 저장한 계획서가 없어요"
            sub="위에서 첫 발명계획서를 써 보세요!"
          />
        ) : (
          <div className="grid grid-2">
            {plans.map((p) => {
              const st = planStatus(p);
              const done =
                TEXT_FIELDS.filter((t) => p[t.key].trim() !== '').length +
                (p.planSteps.some((s) => s.trim() !== '') ? 1 : 0);
              return (
                <div
                  key={p.id}
                  className="card card-tight"
                  style={{ cursor: 'pointer' }}
                  onClick={() => loadPlan(p)}
                >
                  <div className="row" style={{ marginBottom: 6 }}>
                    <strong style={{ fontSize: 15 }}>{p.inventionTitle || '(제목 없음)'}</strong>
                    <div className="spacer" />
                    <span className="badge" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <span className="tiny">
                      {p.studentName || '이름 없음'} · {p.className || '학급 없음'}
                    </span>
                    <div className="spacer" />
                    <span className="tiny">수정 {fmtDate(p.updatedAt)}</span>
                  </div>
                  <div className="row">
                    <span className="tiny">
                      {done}/{REQUIRED_TOTAL} 작성
                    </span>
                    <div className="spacer" />
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlan(p.id);
                        if (editingId === p.id) newPlan();
                      }}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* 구글시트 미설정 안내 모달 */}
      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="📨 선생님께 보내기">
        <p style={{ marginBottom: 8 }}>
          아직 우리 반에 연결되지 않았어요.
        </p>
        <p className="muted" style={{ marginBottom: 14 }}>
          <strong>방법 1</strong> — 선생님이 알려준 <strong>초대 링크</strong>를 열거나 QR을 스캔하면 한 번에
          연결돼요.
          <br />
          <strong>방법 2</strong> — 아래에 선생님이 알려준 웹앱 URL을 직접 붙여넣어도 돼요.
        </p>
        <div className="row-wrap" style={{ marginBottom: 14 }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="https://script.google.com/macros/..."
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={!pasteUrl.trim().startsWith('http')}
            onClick={() => {
              setTeacherConfig({ gasUrl: pasteUrl.trim() });
              setPasteUrl('');
              setGuideOpen(false);
              toast('선생님 웹앱에 연결했어요!', '🏫');
            }}
          >
            연결하기
          </button>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setGuideOpen(false);
              navigate('/teacher');
            }}
          >
            🧑‍🏫 교사용 페이지로 이동
          </button>
          <button className="btn btn-ghost" onClick={() => setGuideOpen(false)}>
            닫기
          </button>
        </div>
      </Modal>
    </div>
  );
}
