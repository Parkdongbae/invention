import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { uid, useAppStore, XP_TABLE } from '../../store/useAppStore';
import type { Category, DiscoveryEntry, IdeaEntry, ScamperNote, SsiFiveW1H } from '../../types';
import { WHO_CATEGORIES, WHERE_CATEGORIES, WHAT_CATEGORIES } from '../../data/categories';
import { COMMANDMENTS } from '../../data/commandments';
import type { Commandment } from '../../data/commandments';
import { SCAMPER_CARDS } from '../../data/scamper';
import type { ScamperCard } from '../../data/scamper';
import { similarAwards, awardColor, awardById } from '../../data/ssi';
import { buildKeywordSet, extractKeywords } from '../../lib/keywords';
import { stampById } from '../../lib/level';
import { playSfx } from '../../lib/sound';
import { ConfirmButton, EmptyState, Modal, Section, toast } from '../../components/ui';

/** 마지막 글자의 받침 유무로 이/가를 고른다 (한글이 아니면 이(가)로 표기) */
function josaIGa(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? '가' : '이';
  return '이(가)';
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function pick<T>(arr: T[]): T {
  return arr[randInt(arr.length)];
}

interface SparkSeed {
  who: Category;
  where: Category;
  what: Category;
  cmd: Commandment;
  sc: ScamperCard;
}

const TABS = [
  { id: 'cmd', icon: '🧭', label: '발명 10계명' },
  { id: 'scamper', icon: '🧩', label: 'SCAMPER 카드' },
  { id: 'spark', icon: '💥', label: '랜덤 스파크' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const W1H_FIELDS: { key: keyof SsiFiveW1H; label: string; placeholder: string }[] = [
  { key: 'who', label: '누가', placeholder: '예: 학생' },
  { key: 'when', label: '언제', placeholder: '예: 비 오는 날' },
  { key: 'where', label: '어디서', placeholder: '예: 교실에서' },
  { key: 'what', label: '무엇을', placeholder: '예: 우산을' },
  { key: 'why', label: '왜', placeholder: '예: 손이 불편해서' },
  { key: 'how', label: '어떻게', placeholder: '예: 어떻게 쓰나요?' },
];

const EMPTY_W1H: Record<keyof SsiFiveW1H, string> = {
  who: '',
  when: '',
  where: '',
  what: '',
  why: '',
  how: '',
};

/** 아이디어 상세(수정·삭제·계획서 이동) 모달 */
function IdeaDetailModal(props: {
  idea: IdeaEntry;
  discovery?: DiscoveryEntry;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<IdeaEntry>) => void;
  onDelete: (id: string) => void;
  onPlan: (id: string) => void;
}) {
  const { idea } = props;
  const [title, setTitle] = useState(idea.title);
  const [summary, setSummary] = useState(idea.summary);
  const [w1h, setW1h] = useState<Record<keyof SsiFiveW1H, string>>({ ...EMPTY_W1H, ...idea.fiveW1H });

  const dirty =
    title.trim() !== idea.title ||
    summary.trim() !== idea.summary ||
    W1H_FIELDS.some((f) => w1h[f.key].trim() !== (idea.fiveW1H[f.key] ?? ''));

  return (
    <Modal open onClose={props.onClose} title="아이디어 자세히 보기" wide>
      <div className="col">
        {props.discovery && (
          <div
            className="tiny"
            style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 12px' }}
          >
            🎯 원래 문제: {props.discovery.problemStatement}
          </div>
        )}
        <div>
          <label className="field-label">제목</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="field-label">한 줄 요약</label>
          <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div>
          <label className="field-label">5W1H</label>
          <div className="grid grid-3">
            {W1H_FIELDS.map((f) => (
              <input
                key={f.key}
                className="input"
                placeholder={f.label}
                value={w1h[f.key]}
                onChange={(e) => setW1h((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            ))}
          </div>
        </div>
        {idea.scamper.length > 0 && (
          <div>
            <label className="field-label">🧩 SCAMPER 메모</label>
            <div className="col">
              {idea.scamper.map((n) => {
                const card = SCAMPER_CARDS.find((c) => c.key === n.key);
                return (
                  <div
                    key={n.key}
                    className="tiny"
                    style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 12px' }}
                  >
                    {card ? `${card.icon} ${card.korean}` : n.key} — {n.note}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="row">
          <ConfirmButton
            onConfirm={() => {
              props.onDelete(idea.id);
              props.onClose();
            }}
          >
            🗑️ 삭제
          </ConfirmButton>
          <div className="spacer" />
          <button className="btn" onClick={props.onClose}>
            닫기
          </button>
          <button
            className="btn btn-primary"
            disabled={!dirty}
            onClick={() => {
              const t = title.trim();
              const s = summary.trim();
              if (!t || !s) {
                toast('제목과 한 줄 요약은 비워둘 수 없어요', '⚠️');
                return;
              }
              const f: Partial<SsiFiveW1H> = {};
              for (const { key } of W1H_FIELDS) {
                const v = w1h[key].trim();
                if (v) f[key] = v;
              }
              props.onUpdate(idea.id, {
                title: t,
                summary: s,
                fiveW1H: f,
                keywords: extractKeywords(`${t} ${s}`),
              });
              toast('아이디어를 수정했어요!', '✏️');
              props.onClose();
            }}
          >
            수정 저장
          </button>
        </div>
        <button
          className="btn btn-lg"
          style={{ width: '100%' }}
          onClick={() => props.onPlan(idea.id)}
        >
          📄 발명계획서로 이어가기
        </button>
      </div>
    </Modal>
  );
}

export default function IdeasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discoveries = useAppStore((s) => s.discoveries);
  const ideas = useAppStore((s) => s.ideas);
  const addIdea = useAppStore((s) => s.addIdea);
  const updateIdea = useAppStore((s) => s.updateIdea);
  const removeIdea = useAppStore((s) => s.removeIdea);
  const linkIdea = useAppStore((s) => s.linkIdea);
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);

  const fromId = searchParams.get('from');
  const discovery = useMemo(
    () => discoveries.find((d) => d.id === fromId),
    [discoveries, fromId],
  );

  const [tab, setTab] = useState<TabId>('cmd');
  const [cmdIdx, setCmdIdx] = useState(() => randInt(COMMANDMENTS.length));
  const [cmdMemos, setCmdMemos] = useState<Record<number, string>>({});
  const [expandedScamper, setExpandedScamper] = useState<string | null>(null);
  const [scamperNotes, setScamperNotes] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<SparkSeed | null>(null);
  const [inspiredBy, setInspiredBy] = useState<string | undefined>(undefined);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [w1h, setW1h] = useState<Record<keyof SsiFiveW1H, string>>(EMPTY_W1H);
  const [removedKw, setRemovedKw] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const keywords = useMemo(
    () => extractKeywords(`${title} ${summary}`).filter((k) => !removedKw.includes(k)),
    [title, summary, removedKw],
  );

  const sparkKeywords = useMemo(
    () =>
      seed
        ? buildKeywordSet([String(seed.cmd.no)], [seed.who.id, seed.where.id, seed.what.id])
        : [],
    [seed],
  );
  const sparkAwards = useMemo(
    () => (seed ? similarAwards(sparkKeywords, 3) : []),
    [seed, sparkKeywords],
  );

  const scamperNoteCount = SCAMPER_CARDS.filter(
    (c) => (scamperNotes[c.key] ?? '').trim().length > 0,
  ).length;

  const editingIdea = editingId ? ideas.find((i) => i.id === editingId) ?? null : null;

  const grantStamp = (id: Parameters<typeof earnStamp>[0]) => {
    if (earnStamp(id)) toast(`도장 획득: ${stampById(id).name}`, '🏅');
  };

  function genSpark() {
    setInspiredBy(undefined);
    playSfx('spark');
    setSeed({
      who: pick(WHO_CATEGORIES),
      where: pick(WHERE_CATEGORIES),
      what: pick(WHAT_CATEGORIES),
      cmd: pick(COMMANDMENTS),
      sc: pick(SCAMPER_CARDS),
    });
  }

  function noteChange(key: string, value: string) {
    setScamperNotes((prev) => ({ ...prev, [key]: value }));
    if (value.trim() && earnStamp('scamper_used')) {
      toast(`도장 획득: ${stampById('scamper_used').name}`, '🏅');
    }
  }

  function saveIdea() {
    const t = title.trim();
    const s = summary.trim();
    if (!t || !s) {
      toast('제목과 한 줄 요약을 채워 주세요', '⚠️');
      return;
    }
    const f: Partial<SsiFiveW1H> = {};
    for (const { key } of W1H_FIELDS) {
      const v = w1h[key].trim();
      if (v) f[key] = v;
    }
    const scamper: ScamperNote[] = [];
    for (const c of SCAMPER_CARDS) {
      const n = (scamperNotes[c.key] ?? '').trim();
      if (n) scamper.push({ key: c.key, note: n });
    }
    const entry: IdeaEntry = {
      id: uid(),
      createdAt: Date.now(),
      discoveryId: fromId ?? undefined,
      title: t,
      summary: s,
      fiveW1H: f,
      scamper,
      keywords,
      inspiredByAwardId: inspiredBy,
    };
    addIdea(entry);
    addXp(XP_TABLE.idea);
    grantStamp('first_idea');
    if (useAppStore.getState().ideas.length >= 5) grantStamp('idea_5');
    if (W1H_FIELDS.every(({ key }) => Boolean(f[key]))) grantStamp('fiveW1H_complete');
    if (fromId) linkIdea(fromId, entry.id);
    toast('아이디어를 저장했어요! XP +15', '💡');
    setTitle('');
    setSummary('');
    setW1h(EMPTY_W1H);
    setRemovedKw([]);
    setScamperNotes({});
    setInspiredBy(undefined);
  }

  const cmd = COMMANDMENTS[cmdIdx];
  const sparkSentence = seed
    ? `예: ${seed.who.icon} ${seed.who.label}${josaIGa(seed.who.label)} ${seed.where.icon} ${seed.where.label}에서 ${seed.what.icon} ${seed.what.label} 문제를, 「${seed.sc.korean.split(' (')[0]}」로 해결하면? — ${seed.cmd.prompt}`
    : '';

  return (
    <div>
      <h1 className="section-title">💡 아이디어 공방</h1>
      <p className="section-sub">10계명 · SCAMPER · 랜덤 스파크로 아이디어를 키워보세요!</p>

      {discovery && (
        <div
          className="card card-tight"
          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', marginBottom: 20 }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)', marginBottom: 4 }}>
            🎯 해결할 문제
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{discovery.problemStatement}</div>
        </div>
      )}

      <div className="row-wrap" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`chip ${tab === t.id ? 'selected' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'cmd' && (
        <div className="card" style={{ marginBottom: 30 }}>
          <div className="row">
            <span style={{ fontSize: 34 }}>{cmd.icon}</span>
            <div>
              <div className="tiny">발명 10계명 No.{cmd.no}</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{cmd.title}</div>
            </div>
            <div className="spacer" />
            <button
              className="btn btn-sm"
              onClick={() =>
                setCmdIdx((prev) => {
                  let n = randInt(COMMANDMENTS.length);
                  while (n === prev) n = randInt(COMMANDMENTS.length);
                  return n;
                })
              }
            >
              🎲 다른 계명 보기
            </button>
          </div>
          <p style={{ fontWeight: 700, color: 'var(--primary-deep)', margin: '12px 0' }}>
            🤔 {cmd.prompt}
          </p>
          <textarea
            className="textarea"
            placeholder="이 계명으로 떠오른 생각을 자유롭게 적어보세요!"
            value={cmdMemos[cmd.no] ?? ''}
            onChange={(e) => setCmdMemos((prev) => ({ ...prev, [cmd.no]: e.target.value }))}
          />
          <p className="tiny" style={{ marginTop: 6 }}>
            마음에 드는 생각은 아래 저장 폼의 제목·요약에 옮겨 적어보세요!
          </p>
        </div>
      )}

      {tab === 'scamper' && (
        <div className="grid grid-3" style={{ marginBottom: 30 }}>
          {SCAMPER_CARDS.map((c) => {
            const open = expandedScamper === c.key;
            const has = (scamperNotes[c.key] ?? '').trim().length > 0;
            return (
              <div
                key={c.key}
                className="card card-tight"
                style={{ cursor: 'pointer', borderColor: open ? 'var(--primary)' : undefined }}
                onClick={() => setExpandedScamper(open ? null : c.key)}
              >
                <div className="row">
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <b style={{ fontSize: 13.5 }}>{c.korean}</b>
                  {has && (
                    <span
                      className="badge"
                      style={{ background: 'var(--mint-soft)', color: 'var(--mint)', marginLeft: 'auto' }}
                    >
                      작성함 ✓
                    </span>
                  )}
                </div>
                {open && (
                  <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <p style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{c.question}</p>
                    <p className="tiny" style={{ marginBottom: 8 }}>
                      예: {c.examples.join(' / ')}
                    </p>
                    <textarea
                      className="textarea"
                      style={{ minHeight: 64 }}
                      placeholder="여기에 적어보세요!"
                      value={scamperNotes[c.key] ?? ''}
                      onChange={(e) => noteChange(c.key, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'spark' && (
        <div className="card" style={{ marginBottom: 30 }}>
          <div className="center">
            <button className="btn btn-accent btn-lg" onClick={genSpark}>
              💥 스파크!
            </button>
            <p className="tiny" style={{ marginTop: 8 }}>
              버튼을 누르면 랜덤 아이디어 씨앗이 팝!
            </p>
          </div>
          {seed && (
            <>
              <div
                style={{
                  background: 'var(--primary-soft)',
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 14,
                  fontWeight: 700,
                  fontSize: 14.5,
                  lineHeight: 1.7,
                }}
              >
                {sparkSentence}
              </div>
              <div className="field-label" style={{ marginTop: 16 }}>
                🏆 이 씨앗과 비슷한 실제 수상작
              </div>
              {sparkAwards.length === 0 ? (
                <p className="tiny">관련 수상작을 찾지 못했어요. 스파크를 다시 뽑아볼까요?</p>
              ) : (
                <div className="grid grid-3">
                  {sparkAwards.map((a) => {
                    const sel = inspiredBy === a.id;
                    return (
                      <div
                        key={a.id}
                        className="card card-tight"
                        style={{
                          borderWidth: sel ? 2 : 1,
                          borderColor: sel ? 'var(--amber)' : undefined,
                          background: 'var(--surface)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>{a.title}</div>
                        <div className="row-wrap" style={{ marginBottom: 10 }}>
                          <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                            {a.year}년
                          </span>
                          <span className="badge" style={{ background: awardColor(a.award), color: '#fff' }}>
                            {a.award}
                          </span>
                          {a.commandments.slice(0, 3).map((c) => (
                            <span
                              key={c.no}
                              className="badge"
                              style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}
                            >
                              계명 {c.no}
                            </span>
                          ))}
                        </div>
                        <button
                          className={`btn btn-sm ${sel ? 'btn-primary' : ''}`}
                          onClick={() => setInspiredBy(sel ? undefined : a.id)}
                        >
                          {sel ? '✓ 영감으로 선택됨' : '💡 이 작품에서 영감 받기'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Section
        title="✍️ 아이디어 저장하기"
        sub="제목과 한 줄 요약만 채우면 저장할 수 있어요! 5W1H는 선택이에요."
      >
        <div className="card">
          <div className="col" style={{ gap: 16 }}>
            <div>
              <label className="field-label">아이디어 제목</label>
              <input
                className="input"
                placeholder="예: 빗물이 튀지 않는 우산 꽂이"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">한 줄 요약</label>
              <input
                className="input"
                placeholder="이 발명이 무엇을 해결하는지 한 줄로 적어보세요"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            {keywords.length > 0 && (
              <div>
                <label className="field-label">자동으로 뽑은 키워드 (눌러서 지우기)</label>
                <div className="row-wrap">
                  {keywords.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="chip selected"
                      onClick={() => setRemovedKw((prev) => [...prev, k])}
                    >
                      #{k} ✕
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="field-label">5W1H로 살펴보기 (선택 · 6개를 모두 채우면 도장!)</label>
              <div className="grid grid-3">
                {W1H_FIELDS.map((f) => (
                  <input
                    key={f.key}
                    className="input"
                    placeholder={`${f.label} · ${f.placeholder}`}
                    value={w1h[f.key]}
                    onChange={(e) => setW1h((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                ))}
              </div>
            </div>
            <div className="row">
              <span className="tiny">
                {scamperNoteCount > 0 ? `🧩 SCAMPER 메모 ${scamperNoteCount}개가 함께 저장돼요` : ''}
              </span>
              <div className="spacer" />
              <button className="btn btn-primary btn-lg" onClick={saveIdea}>
                💾 아이디어 저장
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="🗂️ 내 아이디어"
        right={
          <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
            {ideas.length}개
          </span>
        }
      >
        {ideas.length === 0 ? (
          <EmptyState icon="💡" title="아직 저장한 아이디어가 없어요" sub="위에서 첫 아이디어를 만들어 보세요!" />
        ) : (
          <div className="grid grid-2">
            {ideas.map((i) => {
              const award = i.inspiredByAwardId ? awardById(i.inspiredByAwardId) : undefined;
              const w1hDone = W1H_FIELDS.every((f) => (i.fiveW1H[f.key] ?? '').trim().length > 0);
              return (
                <div
                  key={i.id}
                  className="card card-tight"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditingId(i.id)}
                >
                  <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4 }}>{i.title}</div>
                  <p className="muted" style={{ marginBottom: 8 }}>
                    {i.summary}
                  </p>
                  <div className="row-wrap">
                    {i.keywords.map((k) => (
                      <span
                        key={k}
                        className="badge"
                        style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}
                      >
                        #{k}
                      </span>
                    ))}
                    {i.scamper.length > 0 && (
                      <span className="badge" style={{ background: 'var(--mint-soft)', color: 'var(--mint)' }}>
                        🧩 SCAMPER {i.scamper.map((n) => n.key).join('·')}
                      </span>
                    )}
                    {w1hDone && (
                      <span className="badge" style={{ background: 'var(--amber-soft)', color: '#92400e' }}>
                        🕵️ 5W1H 완성
                      </span>
                    )}
                    {award && (
                      <span className="badge" style={{ background: 'var(--amber-soft)', color: '#92400e' }}>
                        🏅 수상작에서 영감
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {editingIdea && (
        <IdeaDetailModal
          key={editingIdea.id}
          idea={editingIdea}
          discovery={discoveries.find((d) => d.id === editingIdea.discoveryId)}
          onClose={() => setEditingId(null)}
          onUpdate={updateIdea}
          onDelete={(id) => {
            removeIdea(id);
            toast('아이디어를 삭제했어요', '🗑️');
          }}
          onPlan={(id) => navigate(`/plan?idea=${id}`)}
        />
      )}
    </div>
  );
}
