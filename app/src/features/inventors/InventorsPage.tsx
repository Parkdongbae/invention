import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Modal, Section, toast } from '../../components/ui';
import { useAppStore, XP_TABLE } from '../../store/useAppStore';
import {
  INVENTORS,
  INVENTOR_STATS,
  inventionList,
  inventorName,
  inventorSubName,
  pick,
  pickDistractors,
  shuffle,
  wikiUrl,
} from '../../data/inventors';
import type { Inventor } from '../../types';
import { playSfx } from '../../lib/sound';
import { stampById } from '../../lib/level';

type Tab = 'who' | 'korea' | 'invention' | 'dex';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'who', icon: '🤔', label: '발명가 누구게?' },
  { key: 'korea', icon: '🇰🇷', label: '한국 발명가 챌린지' },
  { key: 'invention', icon: '🛠️', label: '발명품은 누구 작품?' },
  { key: 'dex', icon: '📖', label: '발명가 도감' },
];

const WHO_POINTS = [50, 40, 30, 20, 10];
const KR_POINTS = [40, 30, 20, 10];

interface Clue {
  icon: string;
  label: string;
  value: string;
}

function buildClues(inv: Inventor, koreaMode: boolean): Clue[] {
  const clues: Clue[] = [];
  if (!koreaMode) clues.push({ icon: '🌏', label: '국가', value: `${inv.flag} ${inv.nation}` });
  clues.push({ icon: '📅', label: '생몰연도', value: inv.life || '알려지지 않음' });
  clues.push({ icon: '🔬', label: '분야', value: inv.fieldKo });
  clues.push({ icon: '🛠️', label: '주요 발명품·업적', value: inv.inventions });
  clues.push({ icon: '📖', label: '힌트', value: inv.summary.slice(0, 90) + (inv.summary.length > 90 ? '…' : '') });
  return clues;
}

// ===== 단서 공개 추리 퀴즈 (누구게? / 한국 발명가 챌린지 공용) =====
function WhoGame(props: { pool: Inventor[]; koreaMode: boolean; mode: string; total: number }) {
  const { pool, koreaMode, mode, total } = props;
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);
  const addGameScore = useAppStore((s) => s.addGameScore);

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [rounds, setRounds] = useState<Inventor[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [clueIdx, setClueIdx] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);

  const points = koreaMode ? KR_POINTS : WHO_POINTS;
  const card = rounds[roundIdx];
  const clues = card ? buildClues(card, koreaMode) : [];
  const visibleClues = clues.slice(0, clueIdx + 1);

  const choices = useMemo(() => {
    if (!card || solved) return [];
    return shuffle([card, ...pickDistractors(card, pool)]);
  }, [card, solved, pool]);

  function start() {
    const deck = shuffle(pool).slice(0, total);
    setRounds(deck);
    setRoundIdx(0);
    setClueIdx(0);
    setWrongIds([]);
    setSolved(false);
    setScore(0);
    setGained(0);
    setPhase('playing');
  }

  function choose(inv: Inventor) {
    if (!card || solved || wrongIds.includes(inv.id)) return;
    if (inv.id === card.id) {
      const pts = points[Math.min(clueIdx, points.length - 1)];
      playSfx('correct');
      addXp(XP_TABLE.gameCorrect);
      setScore((v) => v + 1);
      setGained((v) => v + pts);
      setSolved(true);
      if (earnStamp('inventor_first')) {
        toast(`도장 획득: ${stampById('inventor_first').name}`, '🏅');
      }
    } else {
      playSfx('wrong');
      const next = clueIdx + 1;
      setWrongIds((w) => [...w, inv.id]);
      if (next >= clues.length) {
        setClueIdx(clues.length - 1);
        setSolved(true);
      } else {
        setClueIdx(next);
      }
    }
  }

  function next() {
    if (roundIdx + 1 >= rounds.length) {
      addGameScore({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, playedAt: Date.now(), mode, score, total: rounds.length });
      if (score === rounds.length && earnStamp('inventor_perfect')) {
        toast(`도장 획득: ${stampById('inventor_perfect').name}`, '🎓');
      }
      setPhase('done');
    } else {
      setRoundIdx((i) => i + 1);
      setClueIdx(0);
      setWrongIds([]);
      setSolved(false);
    }
  }

  if (phase === 'idle') {
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 50 }}>{koreaMode ? '🇰🇷' : '🤔'}</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 6px' }}>
          {koreaMode ? '한국 발명가 챌린지' : '발명가 누구게?'}
        </h3>
        <p className="muted" style={{ maxWidth: 420, margin: '0 auto 16px' }}>
          단서는 한 장씩 공개돼요. 빨리 맞힐수록 높은 점수! 총 {total}라운드입니다.
          {koreaMode && ' 우리나라 발명가·혁신가만 나와요.'}
        </p>
        <button className="btn btn-primary btn-lg" onClick={start}>
          🎮 시작하기
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const perfect = score === rounds.length;
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 48 }}>{perfect ? '🏆' : score >= rounds.length * 0.6 ? '🎉' : '💪'}</div>
        <h3 style={{ fontSize: 21, fontWeight: 800, margin: '8px 0 4px' }}>
          {score} / {rounds.length} 정답!
        </h3>
        <p className="muted">획득 점수 {gained}점 · XP +{score * XP_TABLE.gameCorrect}</p>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={start}>
          🔁 다시 도전하기
        </button>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row card-tight" style={{ padding: 0 }}>
        <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
          {roundIdx + 1} / {rounds.length}
        </span>
        <span className="tiny">정답 {score}</span>
        <div className="spacer" />
        <span className="tiny">단서 {clueIdx + 1}/{clues.length} 공개</span>
      </div>

      {card && (
        <div className="card">
          <div className="col" style={{ gap: 8 }}>
            {visibleClues.map((c, i) => (
              <div
                key={c.label}
                className="card card-tight"
                style={{
                  background: i === visibleClues.length - 1 && !solved ? 'var(--amber-soft)' : 'var(--surface-2)',
                  borderColor: i === visibleClues.length - 1 && !solved ? 'var(--amber)' : 'var(--line)',
                }}
              >
                <div className="tiny" style={{ fontWeight: 800 }}>
                  {c.icon} 단서 {(!koreaMode ? i : i + 1)}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: solved ? 600 : 700 }}>
                  <span className="muted" style={{ marginRight: 6 }}>{c.label}:</span>
                  {c.value}
                </div>
              </div>
            ))}
            {!solved && clueIdx < clues.length - 1 && (
              <p className="tiny center">틀리면 다음 단서가 공개돼요. 빨리 맞힐수록 고득점!</p>
            )}
          </div>

          {solved ? (
            <div
              className="card card-tight"
              style={{ marginTop: 12, background: 'var(--mint-soft)', borderColor: 'var(--mint)' }}
            >
              <strong style={{ fontSize: 16 }}>
                {card.flag} {inventorName(card)}
                {inventorSubName(card) && <span className="muted"> ({inventorSubName(card)})</span>}
              </strong>
              <p className="tiny" style={{ marginTop: 4 }}>{card.summary}</p>
              {wikiUrl(card) && (
                <a
                  href={wikiUrl(card) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary-deep)' }}
                >
                  📖 위키피디아에서 더 알아보기 →
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              {choices.map((c) => {
                const isWrong = wrongIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="btn"
                    style={{ justifyContent: 'flex-start', opacity: isWrong ? 0.45 : 1 }}
                    disabled={isWrong}
                    onClick={() => choose(c)}
                  >
                    {isWrong ? '❌ ' : '🤔 '}
                    {inventorName(c)}
                  </button>
                );
              })}
            </div>
          )}

          {solved && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={next}>
              {roundIdx + 1 >= rounds.length ? '🏁 결과 보기' : '다음 발명가 →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== 발명품은 누구 작품? (스피드 퀴즈) =====
function InventionGame() {
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);
  const addGameScore = useAppStore((s) => s.addGameScore);

  const eligible = useMemo(
    () => INVENTORS.filter((i) => inventionList(i).length > 0),
    [],
  );

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [rounds, setRounds] = useState<{ inv: Inventor; item: string }[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const total = rounds.length;
  const cur = rounds[roundIdx];
  const answered = picked !== null;
  const isCorrect = cur ? picked === cur.inv.id : false;

  const choices = useMemo(() => {
    if (!cur) return [];
    return shuffle([cur.inv, ...pickDistractors(cur.inv, INVENTORS)]);
  }, [cur]);

  function start() {
    const deck = shuffle(eligible).slice(0, 10).map((inv) => ({ inv, item: pick(inventionList(inv)) }));
    setRounds(deck);
    setRoundIdx(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setPhase('playing');
  }

  function choose(inv: Inventor) {
    if (!cur || answered) return;
    setPicked(inv.id);
    if (inv.id === cur.inv.id) {
      playSfx('correct');
      addXp(XP_TABLE.gameCorrect);
      setScore((v) => v + 1);
      setStreak((s) => s + 1);
      if (earnStamp('inventor_first')) {
        toast(`도장 획득: ${stampById('inventor_first').name}`, '🏅');
      }
    } else {
      playSfx('wrong');
      setStreak(0);
    }
  }

  function next() {
    if (roundIdx + 1 >= total) {
      addGameScore({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, playedAt: Date.now(), mode: 'invention', score, total });
      if (score === total && earnStamp('inventor_perfect')) {
        toast(`도장 획득: ${stampById('inventor_perfect').name}`, '🎓');
      }
      setPhase('done');
    } else {
      setRoundIdx((i) => i + 1);
      setPicked(null);
    }
  }

  if (phase === 'idle') {
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 50 }}>🛠️</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 6px' }}>발명품은 누구 작품?</h3>
        <p className="muted" style={{ maxWidth: 420, margin: '0 auto 16px' }}>
          발명품 이름을 보고 만든 사람을 맞히는 스피드 퀴즈! 총 10라운드, 연속 정답하면 콤보!
        </p>
        <button className="btn btn-primary btn-lg" onClick={start}>
          ⚡ 시작하기
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const perfect = score === total;
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 48 }}>{perfect ? '🏆' : score >= total * 0.6 ? '🎉' : '💪'}</div>
        <h3 style={{ fontSize: 21, fontWeight: 800, margin: '8px 0 4px' }}>
          {score} / {total} 정답!
        </h3>
        <p className="muted">XP +{score * XP_TABLE.gameCorrect}</p>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={start}>
          🔁 다시 도전하기
        </button>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row card-tight" style={{ padding: 0 }}>
        <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
          {roundIdx + 1} / {total}
        </span>
        <span className="tiny">정답 {score}</span>
        {streak >= 2 && (
          <span className="badge" key={streak} style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            🔥 콤보 x{streak}
          </span>
        )}
      </div>

      {cur && (
        <div className="card center" style={{ padding: 30 }}>
          <p className="tiny" style={{ marginBottom: 6 }}>이 발명품·업적을 만든 사람은?</p>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 18 }}>「{cur.item}」</div>
          <div className="grid grid-2">
            {choices.map((c) => {
              const showCorrect = answered && c.id === cur.inv.id;
              const showWrong = answered && picked === c.id && c.id !== cur.inv.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="btn"
                  style={{
                    justifyContent: 'flex-start',
                    borderColor: showCorrect ? 'var(--ok)' : showWrong ? 'var(--danger)' : undefined,
                    background: showCorrect ? 'var(--mint-soft)' : showWrong ? 'var(--accent-soft)' : undefined,
                  }}
                  disabled={answered}
                  onClick={() => choose(c)}
                >
                  {showCorrect ? '✅ ' : showWrong ? '❌ ' : ''}
                  {c.flag} {inventorName(c)}
                </button>
              );
            })}
          </div>
          {answered && (
            <>
              <p
                className="badge"
                style={{
                  marginTop: 14,
                  background: isCorrect ? 'var(--mint-soft)' : 'var(--accent-soft)',
                  color: isCorrect ? 'var(--mint)' : 'var(--accent)',
                }}
              >
                {isCorrect ? `정답! +${XP_TABLE.gameCorrect} XP` : `정답: ${inventorName(cur.inv)} (${cur.inv.flag} ${cur.inv.nation})`}
              </p>
              <div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={next}>
                  {roundIdx + 1 >= total ? '🏁 결과 보기' : '다음 문제 →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== 발명가 도감 =====
function DexView() {
  const [query, setQuery] = useState('');
  const [nation, setNation] = useState<string | null>(null);
  const [storyOnly, setStoryOnly] = useState(false);
  const [selected, setSelected] = useState<Inventor | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INVENTORS.filter((i) => {
      if (nation && i.flag !== nation) return false;
      if (storyOnly && !i.story) return false;
      if (!q) return true;
      return `${i.name} ${i.nameKo} ${i.inventions} ${i.summary}`.toLowerCase().includes(q);
    });
  }, [query, nation, storyOnly]);

  return (
    <div>
      <div className="card card-tight" style={{ marginBottom: 14 }}>
        <input
          className="input"
          placeholder="이름, 발명품, 활동으로 검색해 보세요 (예: 우산, 테슬라, 장영실)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="row-wrap" style={{ marginTop: 10 }}>
          {[
            { key: null, label: '전체' },
            { key: '🇰🇷', label: '🇰🇷 한국·조선' },
            { key: '🇺🇸', label: '🇺🇸 미국' },
            { key: '🇬🇧', label: '🇬🇧 영국' },
            { key: '🇩🇪', label: '🇩🇪 독일' },
            { key: '🇯🇵', label: '🇯🇵 일본' },
          ].map((n) => (
            <button
              key={n.label}
              type="button"
              className={`chip ${nation === n.key ? 'selected' : ''}`}
              onClick={() => setNation(n.key)}
            >
              {n.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip ${storyOnly ? 'selected' : ''}`}
            onClick={() => setStoryOnly((v) => !v)}
          >
            ⭐ 심화 스토리
          </button>
        </div>
      </div>

      <p className="tiny" style={{ marginBottom: 10 }}>총 {list.length}명</p>
      {list.length === 0 ? (
        <EmptyState icon="🔍" title="검색 결과가 없어요" sub="다른 키워드로 찾아보세요!" />
      ) : (
        <div className="grid grid-4">
          {list.map((i) => (
            <button
              key={i.id}
              type="button"
              className="card"
              style={{ cursor: 'pointer', textAlign: 'left', position: 'relative' }}
              onClick={() => setSelected(i)}
            >
              {i.story && (
                <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 13 }} title="심화 스토리 있음">
                  ⭐
                </span>
              )}
              <div style={{ fontSize: 30 }}>{i.flag}</div>
              <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 4 }}>{inventorName(i)}</div>
              {inventorSubName(i) && <div className="tiny">{inventorSubName(i)}</div>}
              <div className="tiny" style={{ marginTop: 4 }}>
                {i.fieldKo} · {i.life || '?'}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${selected.flag} ${inventorName(selected)}` : ''} wide>
        {selected && (
          <div>
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
                {selected.fieldKo}
              </span>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                {selected.nation}
              </span>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                {selected.life || '생몰년 미상'}
              </span>
              {selected.story && (
                <span className="badge" style={{ background: 'var(--amber-soft)', color: '#92400e' }}>
                  ⭐ 심화 스토리
                </span>
              )}
              {wikiUrl(selected) && (
                <a
                  className="btn btn-sm btn-primary"
                  href={wikiUrl(selected) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📖 위키피디아에서 더 보기
                </a>
              )}
            </div>

            <div className="card card-tight" style={{ background: 'var(--surface-2)', marginBottom: 10 }}>
              <div className="tiny" style={{ fontWeight: 800, marginBottom: 2 }}>🛠️ 주요 발명품·업적</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.inventions}</div>
            </div>

            <p style={{ fontSize: 14 }}>{selected.summary}</p>

            {selected.story && (
              <div className="col" style={{ marginTop: 14, gap: 10 }}>
                <div className="tiny" style={{ fontWeight: 800, color: '#92400e' }}>
                  ⭐ {inventorName(selected)} 심화 스토리
                </div>
                {selected.story.sections.map((s, i) => (
                  <div key={s.title} className="card card-tight">
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                      {i + 1}. {s.title}
                    </div>
                    <p className="muted" style={{ fontSize: 13.5 }}>{s.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ===== 페이지 =====
export default function InventorsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : 'who';
  const gameScores = useAppStore((s) => s.gameScores);

  const setTab = (t: Tab) => setParams({ tab: t });

  const recentScores = gameScores
    .filter((s) => s.mode === 'who' || s.mode === 'whoKr' || s.mode === 'invention')
    .slice(0, 5);

  return (
    <div>
      <Section
        title="🧑‍🔬 발명가 도전"
        sub={`역사 속 발명가 ${INVENTOR_STATS.total}명(한국 ${INVENTOR_STATS.korean}명 · 심화 스토리 ${INVENTOR_STATS.withStory}인)과 함께 놀아요!`}
      >
        <div className="row-wrap" style={{ marginBottom: 18 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`chip ${tab === t.key ? 'selected' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'who' && <WhoGame pool={INVENTORS} koreaMode={false} mode="who" total={8} />}
        {tab === 'korea' && (
          <WhoGame pool={INVENTORS.filter((i) => i.isKorean)} koreaMode={true} mode="whoKr" total={6} />
        )}
        {tab === 'invention' && <InventionGame />}
        {tab === 'dex' && <DexView />}

        {tab !== 'dex' && (
          <div className="card card-tight" style={{ marginTop: 16 }}>
            <div className="tiny" style={{ fontWeight: 800, marginBottom: 6 }}>📊 최근 발명가 퀴즈 기록</div>
            {recentScores.length === 0 ? (
              <p className="tiny">아직 기록이 없어요. 게임을 시작해 보세요!</p>
            ) : (
              <div className="col" style={{ gap: 4 }}>
                {recentScores.map((s) => (
                  <div key={s.id} className="row">
                    <span className="tiny">
                      {s.mode === 'who' ? '🤔 누구게' : s.mode === 'whoKr' ? '🇰🇷 한국 챌린지' : '🛠️ 발명품 퀴즈'}
                      {' · '}
                      {new Date(s.playedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </span>
                    <div className="spacer" />
                    <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                      {s.score}/{s.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
