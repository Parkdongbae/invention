import { useEffect, useMemo, useRef, useState } from 'react';
import { uid, useAppStore } from '../../store/useAppStore';
import type { FeedbackRecord, FeedbackScores, PendingSubmission, PlanEntry } from '../../types';
import {
  GAS_SCRIPT_TEMPLATE,
  gasFetchSubmissions,
  gasPost,
  type GasSubmissionRow,
} from '../../lib/gas';
import { downloadCsv } from '../../lib/csv';
import { exportPlanToPdf, renderPlanDocument } from '../../lib/pdf';
import { buildJoinUrl } from '../../lib/join';
import QRCode from 'qrcode';
import { ConfirmButton, EmptyState, Modal, Section, StarRating, toast } from '../../components/ui';

const SCORE_ITEMS: { key: keyof FeedbackScores; label: string }[] = [
  { key: 'creativity', label: '창의성' },
  { key: 'functionality', label: '기능성' },
  { key: 'practicality', label: '실용성' },
  { key: 'economy', label: '경제성' },
  { key: 'aesthetics', label: '심미성' },
];

const today = (): string => new Date().toISOString().slice(0, 10);

/** 피드백 5개 항목의 평균 별점 */
const avgScoreOf = (f: FeedbackRecord): number =>
  (f.scores.creativity +
    f.scores.functionality +
    f.scores.practicality +
    f.scores.economy +
    f.scores.aesthetics) /
  5;

/** 피드백 전체의 평균 별점 */
const avgScoreAll = (list: FeedbackRecord[]): number =>
  list.length === 0 ? 0 : list.reduce((sum, f) => sum + avgScoreOf(f), 0) / list.length;

interface ReceivedPlan {
  key: string;
  source: 'device' | 'sheet';
  at: number;
  plan: PlanEntry | null;
  studentId: string;
  studentName: string;
  className: string;
  title: string;
}

const asString = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';

function planFromUnknown(raw: unknown): PlanEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
  const steps = Array.isArray(o.planSteps)
    ? o.planSteps.filter((s): s is string => typeof s === 'string')
    : [];
  return {
    id: asString(o.id),
    createdAt: num(o.createdAt),
    updatedAt: num(o.updatedAt),
    studentId: asString(o.studentId),
    studentName: asString(o.studentName),
    className: asString(o.className),
    inventionTitle: asString(o.inventionTitle),
    purpose: asString(o.purpose),
    who: asString(o.who),
    where: asString(o.where),
    problemSituation: asString(o.problemSituation),
    why: asString(o.why),
    ideaSummary: asString(o.ideaSummary),
    mechanismDescription: asString(o.mechanismDescription),
    materialsTools: asString(o.materialsTools),
    usageScenario: asString(o.usageScenario),
    planSteps: steps,
    expectedSchedule: asString(o.expectedSchedule),
    expectedEffects: asString(o.expectedEffects),
    evaluationPlan: asString(o.evaluationPlan),
    studentReflection: asString(o.studentReflection),
    submittedToTeacher: true,
  };
}

function planFromPending(p: PendingSubmission): ReceivedPlan {
  const payload = (p.payload ?? {}) as Record<string, unknown>;
  let plan = planFromUnknown(payload);
  if (!plan?.inventionTitle) {
    // 로컬 제출 기록엔 planId만 있음 → 이 기기의 plans에서 본문을 찾아 복구
    const planId = asString(payload.planId);
    const stored = planId
      ? useAppStore.getState().plans.find((x) => x.id === planId)
      : undefined;
    if (stored) plan = stored;
  }
  return {
    key: `device:${p.id}`,
    source: 'device',
    at: p.sentAt ?? p.createdAt,
    plan,
    studentId: p.studentId,
    studentName: p.studentName,
    className: p.className,
    title: p.title,
  };
}

function planIdOfPayload(payload: string): string {
  try {
    const o = JSON.parse(payload) as Record<string, unknown>;
    return asString(o.planId);
  } catch {
    return '';
  }
}

function planFromRow(row: GasSubmissionRow): ReceivedPlan {
  let plan: PlanEntry | null = null;
  try {
    plan = planFromUnknown(JSON.parse(row.payload));
  } catch {
    plan = null;
  }
  const parsed = Date.parse(row.ts);
  return {
    key: `sheet:${row.ts}:${row.studentId}:${row.title}`,
    source: 'sheet',
    at: Number.isFinite(parsed) ? parsed : 0,
    plan,
    studentId: row.studentId,
    studentName: row.studentName,
    className: row.className,
    title: row.title,
  };
}

function InviteCard(props: { classCode: string; className: string; gasUrl: string }) {
  const ready = props.gasUrl.trim().length > 0 && props.classCode.trim().length > 0;
  const joinUrl = useMemo(
    () =>
      ready
        ? buildJoinUrl({
            gasUrl: props.gasUrl.trim(),
            classCode: props.classCode.trim(),
            className: props.className.trim(),
          })
        : '',
    [ready, props.classCode, props.className, props.gasUrl],
  );
  const [qr, setQr] = useState('');
  const [qrBig, setQrBig] = useState('');

  const openBigQr = async () => {
    try {
      setQrBig(await QRCode.toDataURL(joinUrl, { width: 560, margin: 2 }));
    } catch {
      setQrBig(qr);
    }
  };

  useEffect(() => {
    if (!joinUrl) {
      setQr('');
      return;
    }
    let alive = true;
    QRCode.toDataURL(joinUrl, { width: 240, margin: 1 })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr('');
      });
    return () => {
      alive = false;
    };
  }, [joinUrl]);

  if (!ready) {
    return (
      <div className="card card-tight" style={{ background: 'var(--surface-2)' }}>
        <p className="muted">
          먼저 위에서 <strong>학급 코드</strong>와 <strong>구글시트 웹앱 URL</strong>을 저장하면 이곳에
          초대 링크와 QR이 만들어져요.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 18 }}>
        <div className="col" style={{ gap: 8 }}>
          <div>
            <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
              {props.className || props.classCode} 반
            </span>
          </div>
          <input className="input" readOnly value={joinUrl} onFocus={(e) => e.target.select()} />
          <div className="row-wrap">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                navigator.clipboard
                  .writeText(joinUrl)
                  .then(() => toast('초대 링크를 복사했어요! 학생에게 보내주세요.', '🔗'))
                  .catch(() => toast('복사에 실패했어요. 링크를 직접 선택해 복사해 주세요.', '😅'));
              }}
            >
              📋 링크 복사
            </button>
            <span className="tiny">
              학생이 링크를 열면 「우리 반에 연결하기」 버튼 한 번으로 연결돼요. (QR은 태블릿·휴대폰용)
            </span>
          </div>
        </div>
        {qr && (
          <img
            src={qr}
            alt="초대 QR 코드"
            width={132}
            height={132}
            onClick={openBigQr}
            title="클릭하면 크게 볼 수 있어요"
            style={{ borderRadius: 12, border: '1px solid var(--line)', cursor: 'zoom-in' }}
          />
        )}
      </div>

      <Modal open={qrBig !== ''} onClose={() => setQrBig('')} title="📱 학생 초대 QR 코드">
        <div className="center">
          <img
            src={qrBig}
            alt="큰 초대 QR 코드"
            style={{ width: 'min(420px, 80vw)', borderRadius: 16, border: '1px solid var(--line)' }}
          />
          <p className="muted" style={{ marginTop: 12 }}>
            학생이 스캔하면 우리 반에 자동 연결돼요. 프로젝터·전자칠판에 띄워 활용해 보세요.
          </p>
          <button className="btn btn-ghost" onClick={() => setQrBig('')}>
            닫기
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function TeacherPage() {
  const teacher = useAppStore((s) => s.teacher);
  const pending = useAppStore((s) => s.pending);
  const setTeacherConfig = useAppStore((s) => s.setTeacherConfig);
const teacherClasses = useAppStore((s) => s.teacherClasses);
const saveTeacherClass = useAppStore((s) => s.saveTeacherClass);
const removeTeacherClass = useAppStore((s) => s.removeTeacherClass);
  const addFeedback = useAppStore((s) => s.addFeedback);
  const removeFeedback = useAppStore((s) => s.removeFeedback);
  const addPresentationOrder = useAppStore((s) => s.addPresentationOrder);
  const removePresentationOrder = useAppStore((s) => s.removePresentationOrder);

  // (a) 설정 (로컬 폼 → 저장 버튼)
  const [cfg, setCfg] = useState(() => {
    const t = useAppStore.getState().teacher;
    return { classCode: t.classCode, className: t.className, gasUrl: t.gasUrl };
  });

  // (b) 구글시트 연동
  const [gasOpen, setGasOpen] = useState(false);
const [selectedClass, setSelectedClass] = useState(
  () => useAppStore.getState().teacher.classCode || useAppStore.getState().teacherClasses[0]?.classCode || '',
);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // (d) 발표 순서
  const [namesRaw, setNamesRaw] = useState('');
  const [presMode, setPresMode] = useState(false);
  const [presIdx, setPresIdx] = useState(0);

  // (e) 피드백
  const [presenter, setPresenter] = useState('');
  const [fbTitle, setFbTitle] = useState('');
  const [scores, setScores] = useState<FeedbackScores>({
    creativity: 0,
    functionality: 0,
    practicality: 0,
    economy: 0,
    aesthetics: 0,
  });
  const [comment, setComment] = useState('');

  // 발표 모드 ESC 닫기
  useEffect(() => {
    if (!presMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presMode]);

  const saveCfg = () => {
    setTeacherConfig(cfg);
    if (cfg.classCode.trim()) {
      saveTeacherClass({
        classCode: cfg.classCode.trim(),
        className: cfg.className.trim(),
        gasUrl: cfg.gasUrl.trim(),
      });
      setSelectedClass(cfg.classCode.trim());
    }
    toast('교사용 설정을 저장했어요. (반 전환 목록에도 저장됨)', '💾');
  };

  const switchClass = () => {
    const target = teacherClasses.find((c) => c.classCode === selectedClass);
    if (!target) {
      toast('전환할 반을 먼저 선택해 주세요.', '⚠️');
      return;
    }
    setTeacherConfig({ classCode: target.classCode, className: target.className, gasUrl: target.gasUrl });
    setCfg({ classCode: target.classCode, className: target.className, gasUrl: target.gasUrl });
    toast(`${target.className || target.classCode} 반으로 전환했어요!`, '🔄');
  };

  const deleteClass = () => {
    if (!selectedClass) return;
    removeTeacherClass(selectedClass);
    setSelectedClass('');
    toast('반 목록에서 삭제했어요.', '🗑️');
  };

  const copyScript = () => {
    navigator.clipboard
      .writeText(GAS_SCRIPT_TEMPLATE)
      .then(() => toast('스크립트를 복사했어요! 구글시트 Apps Script에 붙여넣으세요.', '📋'))
      .catch(() => toast('복사에 실패했어요. 코드를 직접 선택해 복사해 주세요.', '😅'));
  };

  const runTest = async () => {
    const url = cfg.gasUrl.trim();
    if (!url) {
      setTestResult({ ok: false, msg: '먼저 웹앱 URL을 입력하고 저장해 주세요.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await gasPost(url, {
      action: 'test',
      type: 'test',
      classCode: cfg.classCode || 'TEST',
      title: '연결 테스트',
      payload: { testedAt: new Date().toISOString() },
    });
    setTesting(false);
    setTestResult(
      res.ok
        ? { ok: true, msg: '연결 성공! 구글시트에 시트가 생겼는지 확인해 보세요.' }
        : { ok: false, msg: `연결 실패: ${res.error ?? '알 수 없는 오류'}` },
    );
  };

  // (c) 받은 계획서
  const [sheetRows, setSheetRows] = useState<GasSubmissionRow[] | null>(null);
  const [sheetFetchedAt, setSheetFetchedAt] = useState<number | null>(null);
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ReceivedPlan | null>(null);
  const [pdfBusyFor, setPdfBusyFor] = useState<string | null>(null);
  const [viewerZoom, setViewerZoom] = useState(0.8);
  const [viewerFull, setViewerFull] = useState(false);
  const modalDocRef = useRef<HTMLDivElement | null>(null);
  const fullDocRef = useRef<HTMLDivElement | null>(null);

  const changeZoom = (delta: number) => {
    setViewerZoom((z) => Math.min(1.8, Math.max(0.4, Math.round((z + delta) * 100) / 100)));
  };

  const zoomControls = (
    <div className="row-wrap">
      <span className="tiny" style={{ fontWeight: 800 }}>글자 크기</span>
      <button className="btn btn-sm" onClick={() => changeZoom(-0.1)} aria-label="글자 작게">A－</button>
      <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
        {Math.round(viewerZoom * 100)}%
      </span>
      <button className="btn btn-sm" onClick={() => changeZoom(0.1)} aria-label="글자 크게">A＋</button>
      <button className="btn btn-sm" onClick={() => setViewerZoom(0.8)}>기본</button>
    </div>
  );

  // 오류 신고 (학급 구분 없이 공통 시트 공통_오류신고에서 수집)
  interface ReportItem {
    key: string;
    source: 'device' | 'sheet';
    at: number;
    studentId: string;
    studentName: string;
    menu: string;
    content: string;
  }
  const [reportRows, setReportRows] = useState<GasSubmissionRow[] | null>(null);
  const [fetchingReports, setFetchingReports] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null);

  const fetchReports = async () => {
    const url = teacher.gasUrl.trim();
    if (!url) {
      toast('먼저 구글시트 연동을 설정해 주세요.', '⚠️');
      return;
    }
    setFetchingReports(true);
    setReportError(null);
    const res = await gasFetchSubmissions(url, '공통', '오류신고');
    setFetchingReports(false);
    if (!res.ok) {
      setReportError(res.error ?? '알 수 없는 오류');
      toast(`신고 불러오기 실패: ${res.error ?? ''}`, '❌');
      return;
    }
    setReportRows(res.rows ?? []);
    toast(`오류 신고 ${(res.rows ?? []).length}건을 불러왔어요.`, '🔄');
  };

  const reportItems = useMemo<ReportItem[]>(() => {
    const parsePayload = (raw: string): { menu: string; content: string } => {
      try {
        const o = JSON.parse(raw) as Record<string, unknown>;
        return { menu: asString(o.menu), content: asString(o.content) };
      } catch {
        return { menu: '', content: raw };
      }
    };
    const items: ReportItem[] = [];
    for (const p of pending) {
      if (p.type !== 'report') continue;
      const o = (p.payload ?? {}) as Record<string, unknown>;
      items.push({
        key: `dev:${p.id}`,
        source: 'device',
        at: p.sentAt ?? p.createdAt,
        studentId: p.studentId,
        studentName: p.studentName,
        menu: asString(o.menu) || p.title.replace('[오류 신고]', '').trim(),
        content: asString(o.content),
      });
    }
    for (const row of reportRows ?? []) {
      if (row.type !== 'report') continue;
      const parsed = parsePayload(row.payload);
      const ts = Date.parse(row.ts);
      items.push({
        key: `sheet:${row.ts}:${row.studentId}`,
        source: 'sheet',
        at: Number.isFinite(ts) ? ts : 0,
        studentId: row.studentId,
        studentName: row.studentName,
        menu: parsed.menu,
        content: parsed.content,
      });
    }
    return items.sort((a, b) => b.at - a.at);
  }, [pending, reportRows]);

  const exportReportsCsv = () => {
    if (reportItems.length === 0) {
      toast('내보낼 신고가 아직 없어요.', '⚠️');
      return;
    }
    downloadCsv(
      `오류신고_${today()}.csv`,
      reportItems.map((r) => ({
        접수시각: r.at ? new Date(r.at).toLocaleString('ko-KR') : '',
        학번: r.studentId,
        이름: r.studentName,
        화면: r.menu,
        내용: r.content,
        출처: r.source === 'sheet' ? '구글시트' : '이 기기',
      })),
    );
    toast('CSV 파일을 저장했어요!', '💾');
  };

  const fetchSheet = async () => {
    const url = teacher.gasUrl.trim();
    if (!url) {
      toast('먼저 구글시트 연동을 설정해 주세요.', '⚠️');
      return;
    }
    setFetchingSheet(true);
    setSheetError(null);
    const res = await gasFetchSubmissions(url, teacher.classCode || cfg.classCode);
    setFetchingSheet(false);
    if (!res.ok) {
      setSheetError(res.error ?? '알 수 없는 오류');
      toast(`불러오기 실패: ${res.error ?? ''}`, '❌');
      return;
    }
    setSheetRows(res.rows ?? []);
    setSheetFetchedAt(Date.now());
    toast(`구글시트에서 ${(res.rows ?? []).length}건을 불러왔어요.`, '🔄');
  };

  const receivedPlans = useMemo<ReceivedPlan[]>(() => {
    const byKey = new Map<string, ReceivedPlan>();
    for (const p of pending) {
      if (p.type !== 'plan') continue;
      const item = planFromPending(p);
      const payload = (p.payload ?? {}) as Record<string, unknown>;
      const planId = asString(payload.planId);
      byKey.set(planId ? `plan:${planId}` : item.key, item);
    }
    for (const row of sheetRows ?? []) {
      const item = planFromRow(row);
      const planId = planIdOfPayload(row.payload);
      const key = planId ? `plan:${planId}` : item.key;
      if (!byKey.has(key)) byKey.set(key, item);
    }
    return [...byKey.values()].sort((a, b) => b.at - a.at);
  }, [pending, sheetRows]);

  // 뷰어(모달/전체화면)가 열릴 때 계획서 문서를 컨테이너에 주입
  useEffect(() => {
    const node = viewerFull ? fullDocRef.current : modalDocRef.current;
    if (!node || !viewing?.plan) return;
    node.replaceChildren(renderPlanDocument(viewing.plan));
  }, [viewing, viewerFull, viewerZoom]);

  const savePlanAsPdf = async (item: ReceivedPlan) => {
    if (!item.plan) return;
    setPdfBusyFor(item.key);
    try {
      await exportPlanToPdf(item.plan);
      toast('PDF로 저장했어요!', '📄');
    } catch {
      toast('PDF 저장에 실패했어요.', '😅');
    } finally {
      setPdfBusyFor(null);
    }
  };

  const exportPlansCsv = () => {
    if (receivedPlans.length === 0) {
      toast('내보낼 계획서가 아직 없어요.', '⚠️');
      return;
    }
    downloadCsv(
      `받은_발명계획서_${today()}.csv`,
      receivedPlans.map((r) => ({
        제출시각: r.at ? new Date(r.at).toLocaleString('ko-KR') : '',
        학번: r.studentId,
        이름: r.studentName,
        학급: r.className,
        발명제목: r.title,
        출처: r.source === 'sheet' ? '구글시트' : '이 기기',
      })),
    );
    toast('CSV 파일을 저장했어요!', '💾');
  };

  // (d) 발표 순서
  const shuffleNames = () => {
    const names = namesRaw.split('\n').map((s) => s.trim()).filter(Boolean);
    if (names.length < 2) {
      toast('이름을 두 명 이상 입력해 주세요!', '✏️');
      return;
    }
    // Fisher-Yates 셔플
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    addPresentationOrder({
      id: uid(),
      createdAt: Date.now(),
      className: teacher.className || '우리 반',
      order: names,
    });
    setPresIdx(0);
    toast('발표 순서를 만들었어요!', '🎲');
  };

  const latestOrder = teacher.presentationOrders[0] ?? null;

  // (e) 피드백
  const feedback = teacher.feedback;
  const presenterCandidates = Array.from(
    new Set(teacher.presentationOrders.flatMap((o) => o.order)),
  );

  const submitFeedback = () => {
    if (!presenter.trim() || !fbTitle.trim()) {
      toast('발표자와 발명 제목을 입력해 주세요!', '✏️');
      return;
    }
    addFeedback({
      id: uid(),
      createdAt: Date.now(),
      presenterName: presenter.trim(),
      inventionTitle: fbTitle.trim(),
      scores,
      comment: comment.trim(),
    });
    setFbTitle('');
    setScores({ creativity: 0, functionality: 0, practicality: 0, economy: 0, aesthetics: 0 });
    setComment('');
    toast('피드백을 기록했어요!', '📝');
  };

  const exportFeedbackCsv = () => {
    if (feedback.length === 0) {
      toast('내보낼 피드백이 아직 없어요.', '⚠️');
      return;
    }
    downloadCsv(
      `발표_피드백_${today()}.csv`,
      feedback.map((f) => ({
        기록시각: new Date(f.createdAt).toLocaleString('ko-KR'),
        발표자: f.presenterName,
        발명제목: f.inventionTitle,
        창의성: f.scores.creativity,
        기능성: f.scores.functionality,
        실용성: f.scores.practicality,
        경제성: f.scores.economy,
        심미성: f.scores.aesthetics,
        평균: Number(avgScoreOf(f).toFixed(1)),
        코멘트: f.comment,
      })),
    );
    toast('CSV 파일을 저장했어요!', '💾');
  };

  // (f) 초기화: 이 기기의 교사 기록(피드백/발표 순서)만 삭제 가능
  const resetTeacherData = () => {
    teacher.feedback.forEach((f) => removeFeedback(f.id));
    teacher.presentationOrders.forEach((o) => removePresentationOrder(o.id));
    toast('피드백과 발표 순서 기록을 모두 지웠어요.', '🧹');
  };

  return (
    <div>
      <Section title="🧑‍🏫 교사용 대시보드" sub="학생 모드와 분리된 교사 전용 관리 화면입니다.">
        <div
          className="card card-tight"
          style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)', marginBottom: 16 }}
        >
          <p className="muted" style={{ margin: 0 }}>
            <strong>교사 모드 안내</strong> · 이 페이지의 설정과 기록은 <strong>이 브라우저</strong>에
            저장됩니다. 학생 데이터는 각 학생의 기기에 따로 저장되며, 학생이 「선생님께 보내기」로
            전송한 계획서가 구글시트와 이 기기의 기록에 쌓입니다.
          </p>
          <a
            className="btn btn-sm"
            style={{ marginTop: 8 }}
            href="./manual-teacher.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            📖 교사용 설명서 열기 (PDF)
          </a>
        </div>

        {/* (a) 설정 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 12 }}>⚙️ 학급 설정</strong>
          <div className="grid grid-3" style={{ marginBottom: 12 }}>
            <div>
              <label className="field-label">학급 코드 (예: 1-1)</label>
              <input
                className="input"
                value={cfg.classCode}
                placeholder="예: 1-1"
                onChange={(e) => setCfg({ ...cfg, classCode: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">학급 이름</label>
              <input
                className="input"
                value={cfg.className}
                placeholder="예: 1학년 1반"
                onChange={(e) => setCfg({ ...cfg, className: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">구글시트 웹앱 URL</label>
              <input
                className="input"
                value={cfg.gasUrl}
                placeholder="https://script.google.com/macros/..."
                onChange={(e) => setCfg({ ...cfg, gasUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="row-wrap">
            <button className="btn btn-primary btn-sm" onClick={saveCfg}>
              💾 설정 저장
            </button>
            <span className="tiny">설정 저장 시 이 반이 전환 목록에도 저장돼요.</span>
          </div>

          {teacherClasses.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <label className="field-label">🔄 저장된 반 전환 (여러 반 수업용)</label>
              <div className="row-wrap">
                <select
                  className="select"
                  style={{ maxWidth: 280 }}
                  value={selectedClass || teacherClasses[0]?.classCode || ''}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {teacherClasses.map((c) => (
                    <option key={c.classCode} value={c.classCode}>
                      {c.className || c.classCode} ({c.classCode})
                    </option>
                  ))}
                </select>
                <button className="btn btn-sm btn-primary" onClick={switchClass}>
                  ▶ 이 반으로 전환
                </button>
                <ConfirmButton
                  className="btn btn-sm"
                  message="이 반을 목록에서 삭제할까요?"
                  onConfirm={deleteClass}
                >
                  🗑 반 삭제
                </ConfirmButton>
              </div>
              <p className="tiny" style={{ marginTop: 6 }}>
                전환하면 이후 학생 제출이 새 학급 코드로 기록돼요. (이미 받은 계획서는 그대로 보존돼요)
              </p>
            </div>
          )}
        </div>

        {/* (b) 구글시트 연동 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row">
            <strong>🔗 구글시트 연동 설정</strong>
            {teacher.gasUrl ? (
              <span className="badge" style={{ background: 'var(--mint-soft)', color: 'var(--mint)' }}>
                연동 URL 저장됨
              </span>
            ) : (
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}>
                미설정
              </span>
            )}
            <div className="spacer" />
            <button className="btn btn-sm" onClick={() => setGasOpen(!gasOpen)}>
              {gasOpen ? '▲ 접기' : '▼ 펼치기'}
            </button>
          </div>

          {gasOpen && (
            <div style={{ marginTop: 14 }}>
              <ol className="muted" style={{ margin: '0 0 14px 18px', padding: 0 }}>
                <li style={{ marginBottom: 4 }}>
                  <strong>구글시트를 만들고</strong> (sheets.new) 이름을 정해요.
                </li>
                <li style={{ marginBottom: 4 }}>
                  메뉴에서 <strong>확장 프로그램 → Apps Script</strong>를 열어요.
                </li>
                <li style={{ marginBottom: 4 }}>
                  기존 코드를 지우고 아래 <strong>스크립트 전체를 붙여넣어요.</strong>
                </li>
                <li style={{ marginBottom: 4 }}>
                  <strong>배포 → 새 배포 → 유형: 웹앱</strong>으로 배포해요. (실행: 나 / 액세스 권한:{' '}
                  <strong>모든 사용자</strong>)
                </li>
                <li>
                  만들어진 <strong>웹앱 URL</strong>을 위 학급 설정에 붙여넣고 저장해요.
                </li>
              </ol>

              <div className="row" style={{ marginBottom: 8 }}>
                <span className="field-label" style={{ margin: 0 }}>
                  연동 스크립트 (GAS)
                </span>
                <div className="spacer" />
                <button className="btn btn-sm" onClick={copyScript}>
                  📋 코드 복사
                </button>
              </div>
              <pre
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                  fontSize: 12,
                  lineHeight: 1.5,
                  overflowX: 'auto',
                  maxHeight: 320,
                  overflowY: 'auto',
                  margin: 0,
                }}
              >
                {GAS_SCRIPT_TEMPLATE}
              </pre>

              <div className="row-wrap" style={{ marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={runTest} disabled={testing}>
                  {testing ? '⏳ 테스트 중...' : '🔌 연결 테스트'}
                </button>
                {testResult && (
                  <span
                    className="badge"
                    style={{
                      background: testResult.ok ? 'var(--mint-soft)' : 'var(--accent-soft)',
                      color: testResult.ok ? 'var(--mint)' : 'var(--accent)',
                    }}
                  >
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* (b2) 학생 초대 링크 */}
      <Section
        title="🔗 학생 초대 링크 · QR"
        sub="학생이 이 링크를 열거나 QR을 스캔하면 우리 반에 자동 연결돼요. URL을 직접 입력할 필요가 없어요."
      >
        <InviteCard classCode={teacher.classCode} className={teacher.className} gasUrl={teacher.gasUrl} />
      </Section>

      {/* (c) 받은 계획서 */}
      <Section
        title="📥 받은 발명계획서"
        sub="학생이 보낸 계획서예요. 카드를 누르면 내용을 볼 수 있고, 「구글시트에서 불러오기」로 모든 학생 기기의 제출물을 모아올 수 있어요."
        right={
          <div className="row">
            <button
              className="btn btn-sm"
              onClick={fetchSheet}
              disabled={fetchingSheet || !teacher.gasUrl.trim()}
              title={teacher.gasUrl.trim() ? '' : '먼저 구글시트 연동을 설정해 주세요'}
            >
              {fetchingSheet ? '⏳ 불러오는 중...' : '🔄 구글시트에서 불러오기'}
            </button>
            <button className="btn btn-sm" onClick={exportPlansCsv}>
              📤 CSV
            </button>
          </div>
        }
      >
        {sheetError && (
          <div
            className="card card-tight"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', marginBottom: 10 }}
          >
            ⚠️ 시트 불러오기 실패: {sheetError}
          </div>
        )}
        {sheetFetchedAt !== null && (
          <p className="tiny" style={{ marginBottom: 8 }}>
            마지막으로 시트를 불러온 시각: {new Date(sheetFetchedAt).toLocaleTimeString('ko-KR')}
          </p>
        )}
        {receivedPlans.length === 0 ? (
          <EmptyState
            icon="📥"
            title="아직 받은 계획서가 없어요"
            sub="학생이 계획서를 보내거나, 위의 「구글시트에서 불러오기」를 눌러 보세요."
          />
        ) : (
          <div className="col">
            {receivedPlans.map((r) => (
              <button
                key={r.key}
                type="button"
                className="card card-tight"
                style={{ cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setViewing(r)}
              >
                <div className="row">
                  <strong style={{ fontSize: 15 }}>{r.title || '(제목 없음)'}</strong>
                  <div className="spacer" />
                  <span
                    className="badge"
                    style={
                      r.source === 'sheet'
                        ? { background: 'var(--primary-soft)', color: 'var(--primary-deep)' }
                        : { background: 'var(--mint-soft)', color: 'var(--mint)' }
                    }
                  >
                    {r.source === 'sheet' ? '구글시트' : '이 기기'}
                  </span>
                </div>
                <div className="row" style={{ marginTop: 4 }}>
                  <span className="tiny">
                    {r.studentName} · {r.studentId} · {r.className}
                  </span>
                  <div className="spacer" />
                  {r.at > 0 && (
                    <span className="tiny">{new Date(r.at).toLocaleString('ko-KR')}</span>
                  )}
                  <span className="tiny" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    내용 보기 ›
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* (d) 발표 순서 */}
      <Section title="🎲 발표 순서 만들기" sub="이름 목록을 넣고 버튼만 누르면 발표 순서가 완성돼요.">
        <div className="grid grid-2">
          <div className="card">
            <label className="field-label">학생 이름 목록 (한 줄에 한 명)</label>
            <textarea
              className="textarea"
              style={{ minHeight: 150 }}
              value={namesRaw}
              placeholder={'예:\n김발명\n이아이디어\n박상상'}
              onChange={(e) => setNamesRaw(e.target.value)}
            />
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={shuffleNames}>
              🎲 순서 섞기
            </button>
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <strong>최근 발표 순서</strong>
              {latestOrder && (
                <span className="tiny">
                  {latestOrder.className} · {latestOrder.order.length}명
                </span>
              )}
              <div className="spacer" />
              {latestOrder && (
                <button
                  className="btn btn-sm btn-accent"
                  onClick={() => {
                    setPresIdx(0);
                    setPresMode(true);
                  }}
                >
                  🖥️ 프레젠테이션 모드
                </button>
              )}
            </div>
            {latestOrder ? (
              <div className="col" style={{ gap: 6 }}>
                {latestOrder.order.map((name, i) => (
                  <div key={`${i}-${name}`} className="row" style={{ fontSize: 17, fontWeight: 800 }}>
                    <span
                      className="badge"
                      style={{
                        background: 'var(--primary-soft)',
                        color: 'var(--primary-deep)',
                        minWidth: 34,
                        justifyContent: 'center',
                      }}
                    >
                      {i + 1}
                    </span>
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="🎲" title="아직 만든 순서가 없어요" sub="이름을 넣고 순서 섞기를 눌러요!" />
            )}
          </div>
        </div>

        {teacher.presentationOrders.length > 1 && (
          <div className="card" style={{ marginTop: 14 }}>
            <strong style={{ display: 'block', marginBottom: 10 }}>지난 순서 기록</strong>
            <div className="col">
              {teacher.presentationOrders.slice(1, 6).map((o) => (
                <div key={o.id} className="row">
                  <span className="muted">
                    {new Date(o.createdAt).toLocaleString('ko-KR')} · {o.className} · {o.order.length}명
                  </span>
                  <div className="spacer" />
                  <ConfirmButton
                    className="btn btn-sm btn-ghost"
                    onConfirm={() => removePresentationOrder(o.id)}
                  >
                    🗑️ 삭제
                  </ConfirmButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* (e) 피드백 */}
      <Section
        title="📝 발표 피드백 기록"
        sub="발표를 보고 5가지 항목을 별점으로 평가해 보세요."
        right={
          <button className="btn btn-sm" onClick={exportFeedbackCsv}>
            📤 CSV 내보내기
          </button>
        }
      >
        <div className="grid grid-2">
          <div className="card">
            <strong style={{ display: 'block', marginBottom: 12 }}>새 피드백</strong>
            <div className="col">
              <div>
                <label className="field-label">발표자 (목록에서 선택하거나 직접 입력)</label>
                <input
                  className="input"
                  list="presenter-options"
                  value={presenter}
                  placeholder="예: 김발명"
                  onChange={(e) => setPresenter(e.target.value)}
                />
                <datalist id="presenter-options">
                  {presenterCandidates.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label">발명 제목</label>
                <input
                  className="input"
                  value={fbTitle}
                  placeholder="예: 미끄럼 방지 우산꽂이"
                  onChange={(e) => setFbTitle(e.target.value)}
                />
              </div>
              <div className="col" style={{ gap: 4 }}>
                {SCORE_ITEMS.map((item) => (
                  <div className="row" key={item.key}>
                    <span className="muted" style={{ width: 60, fontWeight: 700 }}>
                      {item.label}
                    </span>
                    <StarRating
                      value={scores[item.key]}
                      onChange={(v) => setScores({ ...scores, [item.key]: v })}
                    />
                    <span className="tiny">{scores[item.key]}점</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="field-label">코멘트</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={comment}
                  placeholder="칭찬과 개선 아이디어를 함께 적어요."
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={submitFeedback}>
                ✓ 피드백 기록하기
              </button>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <strong>피드백 목록</strong>
              <div className="spacer" />
              {feedback.length > 0 && (
                <span
                  className="badge"
                  style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}
                >
                  평균 ★ {avgScoreAll(feedback).toFixed(1)} ({feedback.length}건)
                </span>
              )}
            </div>
            {feedback.length === 0 ? (
              <EmptyState
                icon="📝"
                title="아직 기록한 피드백이 없어요"
                sub="왼쪽에서 첫 피드백을 남겨 보세요."
              />
            ) : (
              <div className="col">
                {feedback.map((f) => (
                  <div key={f.id} className="card card-tight">
                    <div className="row" style={{ marginBottom: 4 }}>
                      <strong style={{ fontSize: 14.5 }}>{f.presenterName}</strong>
                      <span className="tiny">· {f.inventionTitle}</span>
                      <div className="spacer" />
                      <StarRating value={Math.round(avgScoreOf(f))} size={15} />
                    </div>
                    <div className="row" style={{ marginBottom: 4 }}>
                      {SCORE_ITEMS.map((item) => (
                        <span key={item.key} className="tiny">
                          {item.label} {f.scores[item.key]}★
                        </span>
                      ))}
                    </div>
                    {f.comment && <p className="muted">"{f.comment}"</p>}
                    <div className="row" style={{ marginTop: 6 }}>
                      <span className="tiny">{new Date(f.createdAt).toLocaleString('ko-KR')}</span>
                      <div className="spacer" />
                      <ConfirmButton
                        className="btn btn-sm btn-ghost"
                        onConfirm={() => removeFeedback(f.id)}
                      >
                        🗑️ 삭제
                      </ConfirmButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 오류 신고 확인 */}
      <Section
        title="🚨 오류 신고 확인"
        sub="학생들이 신고한 잘못된 정보예요. 학급 구분 없이 모든 신고가 모입니다."
        right={
          <div className="row">
            <button
              className="btn btn-sm"
              onClick={fetchReports}
              disabled={fetchingReports || !teacher.gasUrl.trim()}
              title={teacher.gasUrl.trim() ? '' : '먼저 구글시트 연동을 설정해 주세요'}
            >
              {fetchingReports ? '⏳ 불러오는 중...' : '🔄 시트에서 불러오기'}
            </button>
            <button className="btn btn-sm" onClick={exportReportsCsv}>
              📤 CSV
            </button>
          </div>
        }
      >
        {reportError && (
          <div
            className="card card-tight"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', marginBottom: 10 }}
          >
            ⚠️ 불러오기 실패: {reportError}
          </div>
        )}
        {reportItems.length === 0 ? (
          <EmptyState
            icon="🚨"
            title="접수된 오류 신고가 없어요"
            sub="학생이 「오류 신고」 메뉴에서 보내면 이곳에 표시돼요."
          />
        ) : (
          <div className="col">
            {reportItems.map((r) => (
              <button
                key={r.key}
                type="button"
                className="card card-tight"
                style={{ cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setViewingReport(r)}
              >
                <div className="row">
                  <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {r.menu || '기타'}
                  </span>
                  <strong style={{ fontSize: 14 }}>
                    {r.content.length > 40 ? r.content.slice(0, 40) + '…' : r.content}
                  </strong>
                  <div className="spacer" />
                  <span
                    className="badge"
                    style={
                      r.source === 'sheet'
                        ? { background: 'var(--primary-soft)', color: 'var(--primary-deep)' }
                        : { background: 'var(--mint-soft)', color: 'var(--mint)' }
                    }
                  >
                    {r.source === 'sheet' ? '구글시트' : '이 기기'}
                  </span>
                </div>
                <div className="row" style={{ marginTop: 4 }}>
                  <span className="tiny">
                    {r.studentName} · {r.studentId}
                  </span>
                  <div className="spacer" />
                  {r.at > 0 && <span className="tiny">{new Date(r.at).toLocaleString('ko-KR')}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* (f) 데이터 초기화 */}
      <Section title="🧹 데이터 초기화">
        <div className="card">
          <p className="muted" style={{ marginBottom: 12 }}>
            현재 페이지에서 지울 수 있는 것: <strong>피드백 기록</strong>과{' '}
            <strong>발표 순서 기록</strong>. 학생의 발견·아이디어·노트·계획서는 각 학생 브라우저에
            저장되어 있어 이 화면에서 지울 수 없습니다.
          </p>
          <ConfirmButton
            className="btn"
            message="⚠️ 정말 모두 지울까요? 되돌릴 수 없어요! (한 번 더 누르면 삭제)"
            onConfirm={resetTeacherData}
          >
            🧹 피드백·발표 순서 기록 모두 지우기
          </ConfirmButton>
        </div>
      </Section>

      {/* 프레젠테이션 모드 (전체화면 스타일) */}
      {presMode && latestOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'var(--ink)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <span className="tiny" style={{ color: 'var(--ink-3)' }}>
            {latestOrder.className} · {presIdx + 1} / {latestOrder.order.length}명
          </span>
          <div style={{ fontSize: 'clamp(44px, 10vw, 110px)', fontWeight: 800, lineHeight: 1.1 }}>
            {presIdx + 1}번
          </div>
          <div style={{ fontSize: 'clamp(30px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.2 }}>
            {latestOrder.order[presIdx]}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-lg"
              style={{ background: 'transparent', color: '#fff', borderColor: 'var(--ink-3)' }}
              disabled={presIdx === 0}
              onClick={() => setPresIdx((i) => Math.max(0, i - 1))}
            >
              ◀ 이전
            </button>
            <button
              className="btn btn-lg btn-primary"
              disabled={presIdx >= latestOrder.order.length - 1}
              onClick={() => setPresIdx((i) => Math.min(latestOrder.order.length - 1, i + 1))}
            >
              다음 ▶
            </button>
            <button
              className="btn btn-lg"
              style={{ background: 'transparent', color: '#fff', borderColor: 'var(--ink-3)' }}
              onClick={() => setPresMode(false)}
            >
              ✕ 종료
            </button>
          </div>
          <span className="tiny" style={{ color: 'var(--ink-3)' }}>
            ESC 키로도 종료할 수 있어요
          </span>
        </div>
      )}

      {/* 받은 계획서 내용 보기 */}
      <Modal
        open={viewing !== null && !viewerFull}
        onClose={() => {
          setViewing(null);
          setViewerFull(false);
        }}
        title={viewing ? `📄 ${viewing.title || '(제목 없음)'}` : ''}
        wide
      >
        {viewing && (
          <>
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <span className="tiny">
                {viewing.studentName} · {viewing.studentId} · {viewing.className}
                {viewing.at > 0 && ` · ${new Date(viewing.at).toLocaleString('ko-KR')}`}
              </span>
              <div className="spacer" />
              <button className="btn btn-sm" onClick={() => setViewerFull(true)}>
                🖥️ 크게 보기
              </button>
              {viewing.plan && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={pdfBusyFor === viewing.key}
                  onClick={() => savePlanAsPdf(viewing)}
                >
                  {pdfBusyFor === viewing.key ? '⏳ 만드는 중...' : '📄 PDF로 저장'}
                </button>
              )}
            </div>
            <div style={{ marginBottom: 10 }}>{zoomControls}</div>
            {viewing.plan ? (
              <div
                style={{
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  background: '#fff',
                }}
              >
                <div ref={modalDocRef} style={{ zoom: viewerZoom }} />
              </div>
            ) : (
              <p className="muted">
                이 기록에는 계획서 본문이 없어요 (요약 정보만 수신된 제출이에요).
              </p>
            )}
          </>
        )}
      </Modal>

      {/* 계획서 전체화면 보기 */}
      {viewerFull && viewing?.plan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'var(--ink)',
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
          }}
        >
          <div
            className="row-wrap"
            style={{ color: '#fff', marginBottom: 10, alignItems: 'center' }}
          >
            <strong style={{ fontSize: 15 }}>
              📄 {viewing.title || '(제목 없음)'} — {viewing.studentName}
            </strong>
            <div className="spacer" />
            <div style={{ background: '#fff', borderRadius: 10, padding: '4px 8px' }}>{zoomControls}</div>
            <button
              className="btn btn-sm"
              style={{ color: '#fff', background: 'transparent', borderColor: 'var(--ink-3)' }}
              onClick={() => setViewerFull(false)}
            >
              ✕ 창 모드로
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              background: '#fff',
              borderRadius: 12,
            }}
          >
            <div ref={fullDocRef} style={{ zoom: viewerZoom }} />
          </div>
        </div>
      )}

      {/* 오류 신고 내용 보기 */}
      <Modal
        open={viewingReport !== null}
        onClose={() => setViewingReport(null)}
        title={viewingReport ? `🚨 오류 신고 — ${viewingReport.menu || '기타'}` : ''}
      >
        {viewingReport && (
          <div>
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <span className="tiny">
                {viewingReport.studentName} · {viewingReport.studentId}
                {viewingReport.at > 0 && ` · ${new Date(viewingReport.at).toLocaleString('ko-KR')}`}
              </span>
              <div className="spacer" />
              <span
                className="badge"
                style={
                  viewingReport.source === 'sheet'
                    ? { background: 'var(--primary-soft)', color: 'var(--primary-deep)' }
                    : { background: 'var(--mint-soft)', color: 'var(--mint)' }
                }
              >
                {viewingReport.source === 'sheet' ? '구글시트' : '이 기기'}
              </span>
            </div>
            <div
              className="card"
              style={{ background: 'var(--surface-2)', whiteSpace: 'pre-wrap', fontSize: 14.5 }}
            >
              {viewingReport.content || '(내용 없음)'}
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button
                className="btn"
                onClick={() => {
                  navigator.clipboard
                    .writeText(`[${viewingReport.menu}] ${viewingReport.content}`)
                    .then(() => toast('신고 내용을 복사했어요.', '📋'))
                    .catch(() => toast('복사에 실패했어요.', '😅'));
                }}
              >
                📋 내용 복사
              </button>
              <button className="btn btn-ghost" onClick={() => setViewingReport(null)}>
                닫기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
