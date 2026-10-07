import { useState } from 'react';
import { Section, toast } from '../../components/ui';
import { HISTORY_CARDS, shuffle } from '../../data/historyCards';
import { COMMANDMENTS, commandment } from '../../data/commandments';
import { useAppStore, XP_TABLE, uid } from '../../store/useAppStore';
import { stampById } from '../../lib/level';
import { playSfx } from '../../lib/sound';
import type { HistoryCard } from '../../types';

const ROUND_COUNT = 8;
const FLIP_COUNT = 6;

interface FlipChoice {
  no: number;
  correct: boolean;
}

const MODE_META: Record<string, { label: string; icon: string }> = {
  matching: { label: '매칭 게임', icon: '🃏' },
  flip: { label: '뒤집기 테스트', icon: '🎴' },
};

const gameCss = `
.draw-card {
  background: linear-gradient(150deg, #fffdf7, var(--surface-2));
  border: 1.5px solid var(--line); border-radius: var(--radius);
  padding: 22px 20px; text-align: center; overflow: hidden;
}
.draw-card.sparkle { animation: spark 0.6s ease; }
.draw-q { font-size: 40px; line-height: 1; margin-bottom: 6px; }
.draw-name { font-size: 19px; font-weight: 800; }
.draw-story { font-size: 14px; margin: 10px auto 0; max-width: 520px; }
.draw-hint {
  display: inline-block; margin-top: 12px;
  background: var(--amber-soft); color: #92400e;
  border-radius: 999px; padding: 5px 14px; font-size: 12.5px; font-weight: 700;
}
.cmd-grid { display: grid; gap: 8px; grid-template-columns: repeat(2, 1fr); margin-top: 16px; }
@media (min-width: 700px) { .cmd-grid { grid-template-columns: repeat(5, 1fr); } }
.cmd-choice {
  display: flex; align-items: center; gap: 8px; min-width: 0;
  border: 1.5px solid var(--line); background: var(--surface);
  border-radius: var(--radius-sm); padding: 9px 11px;
  cursor: pointer; font: inherit; color: inherit; text-align: left;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.cmd-choice:hover:not(:disabled) { border-color: var(--primary); }
.cmd-choice:disabled { cursor: default; }
.cmd-choice.is-correct { border-color: var(--ok); background: var(--mint-soft); animation: spark 0.5s ease; }
.cmd-choice.is-wrong { border-color: var(--danger); background: var(--accent-soft); animation: shake 0.4s ease; }
.cmd-choice.is-dim { opacity: 0.45; }
.cmd-choice-ico { font-size: 19px; flex-shrink: 0; }
.cmd-choice-body { display: flex; flex-direction: column; min-width: 0; font-size: 12px; }
.cmd-choice-title { color: var(--ink-2); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmd-choice-mark { margin-left: auto; font-size: 10.5px; font-weight: 800; color: var(--ok); flex-shrink: 0; }
.feedback { margin-top: 14px; border-radius: var(--radius-sm); padding: 10px 14px; font-weight: 700; font-size: 13.5px; }
.fb-ok { background: var(--mint-soft); color: #0f766e; }
.fb-no { background: var(--accent-soft); color: #b91c1c; }
.combo-chip {
  display: inline-flex; align-items: center;
  background: linear-gradient(90deg, var(--accent), #ff9f43); color: #fff;
  border-radius: 999px; padding: 4px 12px; font-size: 12.5px; font-weight: 800;
  animation: combo-pop 0.35s ease;
}
@keyframes combo-pop { 0% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes spark {
  0% { transform: scale(1); filter: brightness(1); }
  35% { transform: scale(1.05); filter: brightness(1.12); }
  70% { transform: scale(0.98); }
  100% { transform: scale(1); filter: brightness(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.flip-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); }
@media (max-width: 560px) { .flip-grid { grid-template-columns: repeat(2, 1fr); } }
.flip-scene { perspective: 900px; height: 128px; background: none; border: none; padding: 0; cursor: pointer; font: inherit; }
.flip-scene:disabled { cursor: default; }
.flip-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s ease; }
.flip-scene.open .flip-inner, .flip-scene.acquired .flip-inner { transform: rotateY(180deg); }
.flip-face {
  position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  border-radius: var(--radius); display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px; padding: 10px; text-align: center;
}
.flip-front { background: linear-gradient(140deg, var(--primary), #8b5cf6); color: #fff; box-shadow: var(--shadow); }
.flip-scene:hover:not(:disabled) .flip-front { filter: brightness(1.07); }
.flip-back { transform: rotateY(180deg); background: var(--surface); border: 1.5px solid var(--line); box-shadow: var(--shadow); }
.flip-back .tiny {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.flip-scene.acquired .flip-back {
  border-color: var(--amber); background: linear-gradient(160deg, #fffbeb, var(--amber-soft));
  animation: card-get 0.6s ease;
}
.flip-check { font-size: 11.5px; font-weight: 800; color: #92400e; }
@keyframes card-get {
  0% { transform: rotateY(180deg) scale(1); }
  40% { transform: rotateY(180deg) scale(1.07); }
  70% { transform: rotateY(180deg) scale(0.97); }
  100% { transform: rotateY(180deg) scale(1); }
}
.quiz-panel { margin-top: 14px; animation: pop-in 0.18s ease; }
`;

/** (a) 매칭 게임: 카드 이야기를 읽고 맞는 발명 10계명 고르기 */
function MatchingGame() {
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);
  const addGameScore = useAppStore((s) => s.addGameScore);

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [rounds, setRounds] = useState<HistoryCard[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  const card: HistoryCard | undefined = rounds[roundIdx];
  const answered = picked !== null;
  const isCorrect = picked !== null && card !== undefined && card.commandmentNos.includes(picked);

  function start() {
    setRounds(shuffle(HISTORY_CARDS).slice(0, ROUND_COUNT));
    setRoundIdx(0);
    setPicked(null);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setPhase('playing');
    earnStamp('game_first');
  }

  function pick(no: number) {
    if (answered || !card) return;
    setPicked(no);
    if (card.commandmentNos.includes(no)) {
      playSfx('correct');
      addXp(XP_TABLE.gameCorrect);
      setScore((v) => v + 1);
      const next = combo + 1;
      setCombo(next);
      setBestCombo((b) => Math.max(b, next));
    } else {
      playSfx('wrong');
      setCombo(0);
    }
  }

  function next() {
    if (roundIdx + 1 >= rounds.length) {
      addGameScore({ id: uid(), playedAt: Date.now(), mode: 'matching', score, total: rounds.length });
      if (score === rounds.length && earnStamp('game_master')) {
        toast(`만점! 도장 획득: ${stampById('game_master').name}`, '👑');
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
        <div style={{ fontSize: 52 }}>🃏</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 6px' }}>발명 10계명 매칭 게임</h3>
        <p className="muted" style={{ maxWidth: 430, margin: '0 auto' }}>
          발명 카드를 뽑으면 이야기와 힌트가 나와요. 카드에 숨은 발명 10계명을 {ROUND_COUNT}라운드
          동안 맞혀 보세요!
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 18 }} onClick={start}>
          게임 시작하기
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const perfect = score === rounds.length;
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 52 }}>
          {perfect ? '🏆' : score >= Math.ceil(rounds.length * 0.6) ? '🎉' : '💪'}
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 4px' }}>
          {score}문제 정답! ({score} / {rounds.length})
        </h3>
        <p className="muted">
          최고 콤보 x{bestCombo} · 총 {score * XP_TABLE.gameCorrect} XP를 얻었어요
        </p>
        <p style={{ marginTop: 6, fontWeight: 700 }}>
          {perfect
            ? '완벽해요! 발명 10계명을 완전히 이해했네요!'
            : '다시 도전해서 만점을 노려 보세요!'}
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={start}>
          다시 도전하기
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
          {roundIdx + 1} / {rounds.length} 라운드
        </span>
        <span className="badge" style={{ background: 'var(--mint-soft)', color: '#0f766e' }}>
          정답 {score}
        </span>
        {combo >= 2 && (
          <span key={combo} className="combo-chip">
            🔥 {combo} 콤보!
          </span>
        )}
      </div>

      {card && (
        <>
          <div className={`draw-card${answered && isCorrect ? ' sparkle' : ''}`}>
            <div className="draw-q">{answered ? '💡' : '❓'}</div>
            <div className="draw-name">{answered ? card.name : '이 발명은 무엇일까요?'}</div>
            {answered && (
              <div className="tiny" style={{ marginTop: 2 }}>
                {card.year} · {card.inventor}
              </div>
            )}
            <p className="draw-story">{card.story}</p>
            <div className="draw-hint">힌트: {card.hint}</div>
          </div>

          <div className="cmd-grid">
            {COMMANDMENTS.map((cm) => {
              let cls = 'cmd-choice';
              if (answered) {
                if (card.commandmentNos.includes(cm.no)) cls += ' is-correct';
                else if (picked === cm.no) cls += ' is-wrong';
                else cls += ' is-dim';
              }
              return (
                <button
                  key={cm.no}
                  type="button"
                  className={cls}
                  disabled={answered}
                  onClick={() => pick(cm.no)}
                >
                  <span className="cmd-choice-ico">{cm.icon}</span>
                  <span className="cmd-choice-body">
                    <b>{cm.no}번</b>
                    <span className="cmd-choice-title">{cm.title}</span>
                  </span>
                  {answered && card.commandmentNos.includes(cm.no) && (
                    <span className="cmd-choice-mark">정답</span>
                  )}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`feedback ${isCorrect ? 'fb-ok' : 'fb-no'}`}>
              {isCorrect
                ? `정답이에요! +${XP_TABLE.gameCorrect} XP`
                : `아쉬워요! 정답은 ${card.commandmentNos
                    .map((n) => `${n}번 "${commandment(n).title}"`)
                    .join(' 또는 ')} 이에요.`}
            </div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <span className="muted">정답 {score} / {rounds.length}</span>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!answered} onClick={next}>
              {roundIdx + 1 >= rounds.length ? '결과 보기' : '다음 문제 →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** (b) 뒤집기 테스트: 뒷면 카드를 열고 4지선다로 계명 맞혀 획득하기 */
function FlipGame() {
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);
  const addGameScore = useAppStore((s) => s.addGameScore);

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [cards, setCards] = useState<HistoryCard[]>([]);
  const [acquired, setAcquired] = useState<Record<string, boolean>>({});
  const [hadWrong, setHadWrong] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [choices, setChoices] = useState<FlipChoice[]>([]);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [firstTry, setFirstTry] = useState(0);
  const [streak, setStreak] = useState(0);

  const acquiredCount = cards.filter((c) => acquired[c.id]).length;
  const openCard = openId !== null ? cards.find((c) => c.id === openId) ?? null : null;

  function start() {
    setCards(shuffle(HISTORY_CARDS).slice(0, FLIP_COUNT));
    setAcquired({});
    setHadWrong({});
    setOpenId(null);
    setChoices([]);
    setWrongPicks([]);
    setFirstTry(0);
    setStreak(0);
    setPhase('playing');
    earnStamp('game_first');
  }

  function openCardFn(c: HistoryCard) {
    if (acquired[c.id] || openId === c.id) return;
    const correctNo = c.commandmentNos[Math.floor(Math.random() * c.commandmentNos.length)];
    const wrongs = shuffle(COMMANDMENTS.filter((cm) => !c.commandmentNos.includes(cm.no))).slice(0, 3);
    setChoices(shuffle([{ no: correctNo, correct: true }, ...wrongs.map((w) => ({ no: w.no, correct: false }))]));
    setWrongPicks([]);
    setOpenId(c.id);
  }

  function answer(choice: FlipChoice) {
    if (!openCard || acquired[openCard.id]) return;
    if (choice.correct) {
      playSfx('correct');
      addXp(XP_TABLE.gameCorrect);
      const clean = !hadWrong[openCard.id];
      const nextFirstTry = firstTry + (clean ? 1 : 0);
      const nextAcquired = { ...acquired, [openCard.id]: true };
      setFirstTry(nextFirstTry);
      setStreak(clean ? streak + 1 : 0);
      setAcquired(nextAcquired);
      setOpenId(null);
      if (cards.every((c) => nextAcquired[c.id])) {
        const total = cards.length;
        addGameScore({ id: uid(), playedAt: Date.now(), mode: 'flip', score: nextFirstTry, total });
        if (nextFirstTry === total && earnStamp('game_master')) {
          toast(`만점! 도장 획득: ${stampById('game_master').name}`, '👑');
        }
        setPhase('done');
      }
    } else {
      playSfx('wrong');
      setHadWrong((h) => ({ ...h, [openCard.id]: true }));
      setStreak(0);
      setWrongPicks((w) => [...w, choice.no]);
    }
  }

  if (phase === 'idle') {
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 52 }}>🎴</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 6px' }}>카드 뒤집기 테스트</h3>
        <p className="muted" style={{ maxWidth: 430, margin: '0 auto' }}>
          ❓ 뒷면 카드를 눌러 발명을 확인하고, 4개의 보기 중 맞는 발명 10계명을 고르세요. 6장을 모두
          획득하면 클리어!
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 18 }} onClick={start}>
          게임 시작하기
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const perfect = firstTry === cards.length;
    return (
      <div className="card center" style={{ padding: 36 }}>
        <div style={{ fontSize: 52 }}>{perfect ? '👑' : '🎉'}</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 4px' }}>
          클리어! 첫 시도 정답 {firstTry} / {cards.length}
        </h3>
        <p className="muted">총 {firstTry * XP_TABLE.gameCorrect} XP를 얻었어요</p>
        <p style={{ marginTop: 6, fontWeight: 700 }}>
          {perfect
            ? '6장 모두 한 번에 맞혔어요! 당신은 카드게임 달인!'
            : '틀린 문제는 다시 도전하면 첫 시도 정답에 포함돼요. 만점에 도전해 보세요!'}
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={start}>
          다시 도전하기
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
          획득 {acquiredCount} / {cards.length}
        </span>
        <span className="badge" style={{ background: 'var(--amber-soft)', color: '#92400e' }}>
          첫 시도 정답 {firstTry}
        </span>
        {streak >= 2 && (
          <span key={streak} className="combo-chip">
            🔥 {streak} 연속 정답!
          </span>
        )}
      </div>

      <div className="flip-grid">
        {cards.map((c) => {
          const isAcquired = !!acquired[c.id];
          const isOpen = openId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`flip-scene ${isOpen ? 'open' : ''} ${isAcquired ? 'acquired' : ''}`}
              disabled={isAcquired}
              onClick={() => openCardFn(c)}
            >
              <div className="flip-inner">
                <div className="flip-face flip-front">
                  <div style={{ fontSize: 30 }}>❓</div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.9 }}>눌러서 열기</span>
                </div>
                <div className="flip-face flip-back">
                  {isAcquired && <div className="flip-check">🎉 획득!</div>}
                  <b style={{ fontSize: 13.5 }}>{c.name}</b>
                  <span className="tiny">{c.hint}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {openCard && (
        <div className="card quiz-panel">
          <div className="row-wrap">
            <b style={{ fontSize: 16 }}>{openCard.name}</b>
            <span className="tiny">
              {openCard.year} · {openCard.inventor}
            </span>
          </div>
          <p className="muted" style={{ margin: '6px 0 10px' }}>{openCard.story}</p>
          <div className="field-label">이 발명의 계명은 무엇일까요?</div>
          <div className="cmd-grid" style={{ marginTop: 0 }}>
            {choices.map((ch) => {
              const cm = commandment(ch.no);
              const isWrongPicked = wrongPicks.includes(ch.no);
              return (
                <button
                  key={ch.no}
                  type="button"
                  className={`cmd-choice${isWrongPicked ? ' is-wrong' : ''}`}
                  disabled={isWrongPicked}
                  onClick={() => answer(ch)}
                >
                  <span className="cmd-choice-ico">{cm.icon}</span>
                  <span className="cmd-choice-body">
                    <b>{ch.no}번</b>
                    <span className="cmd-choice-title">{cm.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {wrongPicks.length > 0 && (
            <p className="fb-no" style={{ marginTop: 10, fontWeight: 700, fontSize: 13, borderRadius: 8, padding: '8px 12px' }}>
              아쉬워요! 다른 계명을 골라 다시 도전해 보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PlayHistory() {
  const scores = useAppStore((s) => s.gameScores);
  const recent = scores.slice(0, 5);
  if (recent.length === 0) {
    return <p className="muted">아직 플레이 기록이 없어요. 위에서 게임을 시작해 보세요!</p>;
  }
  return (
    <div className="col" style={{ gap: 8 }}>
      {recent.map((s) => {
        const meta = MODE_META[s.mode] ?? { label: s.mode, icon: '🎮' };
        const perfect = s.score === s.total;
        return (
          <div
            key={s.id}
            className="row"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 14px',
            }}
          >
            <span style={{ fontSize: 17 }}>{meta.icon}</span>
            <b style={{ fontSize: 13.5 }}>{meta.label}</b>
            <span className="tiny">
              {new Date(s.playedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </span>
            <div className="spacer" />
            <span
              className="badge"
              style={
                perfect
                  ? { background: 'var(--amber-soft)', color: '#92400e' }
                  : { background: 'var(--surface-2)', color: 'var(--ink-2)' }
              }
            >
              {s.score} / {s.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function GamePage() {
  const [tab, setTab] = useState<'matching' | 'flip'>('matching');

  return (
    <div>
      <style>{gameCss}</style>

      <h1 className="section-title">🃏 역사 속 발명 카드게임</h1>
      <p className="section-sub">
        역사 속 발명 이야기를 읽고 발명 10계명을 맞혀 보세요. 놀면서 발명 원리를 배울 수 있어요!
      </p>

      <div className="row-wrap" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`chip ${tab === 'matching' ? 'selected' : ''}`}
          onClick={() => setTab('matching')}
        >
          <span className="chip-ico">🃏</span> 매칭 게임
        </button>
        <button
          type="button"
          className={`chip ${tab === 'flip' ? 'selected' : ''}`}
          onClick={() => setTab('flip')}
        >
          <span className="chip-ico">🎴</span> 뒤집기 테스트
        </button>
      </div>

      {tab === 'matching' ? <MatchingGame /> : <FlipGame />}

      <Section title="플레이 기록" sub="최근에 플레이한 게임 기록이에요.">
        <PlayHistory />
      </Section>
    </div>
  );
}
