import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uid, useAppStore, XP_TABLE } from '../../store/useAppStore';
import type { DiscoveryEntry, StampId, WhatId, WhereId, WhoId } from '../../types';
import {
  EMOTION_SCALE,
  WHO_CATEGORIES,
  WHAT_CATEGORIES,
  WHERE_CATEGORIES,
  findWhat,
  findWho,
  findWhere,
  isWhatId,
  isWhoId,
  isWhereId,
} from '../../data/categories';
import { SDGS_CARDS, sdgsCard } from '../../data/sdgs';
import { stampById } from '../../lib/level';
import { ConfirmButton, EmptyState, Section, toast } from '../../components/ui';

/** 마지막 글자의 받침 유무로 이/가를 고른다 (한글이 아니면 이(가)로 표기) */
function josaIGa(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? '가' : '이';
  return '이(가)';
}

const STEPS = ['누구를 위해?', '어디서?', '무엇이 문제?'] as const;

export default function DiscoverPage() {
  const navigate = useNavigate();
  const discoveries = useAppStore((s) => s.discoveries);
  const addDiscovery = useAppStore((s) => s.addDiscovery);
  const removeDiscovery = useAppStore((s) => s.removeDiscovery);
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);

  const [step, setStep] = useState(1);
  const [who, setWho] = useState<WhoId | null>(null);
  const [whoCustom, setWhoCustom] = useState('');
  const [where, setWhere] = useState<WhereId | null>(null);
  const [whereCustom, setWhereCustom] = useState('');
  const [what, setWhat] = useState<WhatId | null>(null);
  const [whatCustom, setWhatCustom] = useState('');
  const [emotion, setEmotion] = useState(3);
  const [sdgCode, setSdgCode] = useState<string | null>(null);
  const [statement, setStatement] = useState('');

  // 선택이 바뀌면 문제 문장을 자동으로 다시 만든다 (사용자가 고친 문장은 다음 선택 시 갱신)
  useEffect(() => {
    if (who === null || where === null || what === null) return;
    const whoText = who === 'others' ? whoCustom.trim() : findWho(who).label;
    const whereText = where === 'others' ? whereCustom.trim() : findWhere(where).label;
    const whatText = what === 'others' ? whatCustom.trim() : findWhat(what).label;
    if (!whoText || !whereText || !whatText) return;
    const emo = EMOTION_SCALE.find((e) => e.value === emotion);
    setStatement(
      `${whoText}${josaIGa(whoText)} ${whereText}에서 ${whatText} 때문에 불편을 겪고 있어요. (불편 정도: ${emo ? emo.label : ''})`,
    );
  }, [who, whoCustom, where, whereCustom, what, whatCustom, emotion]);

  const whoOk = who !== null && (who !== 'others' || whoCustom.trim().length > 0);
  const whereOk = where !== null && (where !== 'others' || whereCustom.trim().length > 0);
  const whatOk = what !== null && (what !== 'others' || whatCustom.trim().length > 0);
  const stepOk = step === 1 ? whoOk : step === 2 ? whereOk : whatOk;
  const canSave = whoOk && whereOk && whatOk && statement.trim().length > 0;

  const sdgMatches = what !== null ? SDGS_CARDS.filter((c) => c.relatedWhats.includes(what)) : [];

  const grantStamp = (id: StampId) => {
    if (earnStamp(id)) toast(`도장 획득: ${stampById(id).name}`, '🏅');
  };

  function resetForm() {
    setStep(1);
    setWho(null);
    setWhoCustom('');
    setWhere(null);
    setWhereCustom('');
    setWhat(null);
    setWhatCustom('');
    setEmotion(3);
    setSdgCode(null);
    setStatement('');
  }

  function save() {
    if (!canSave || who === null || where === null || what === null) return;
    const entry: DiscoveryEntry = {
      id: uid(),
      createdAt: Date.now(),
      who,
      whoCustom: whoCustom.trim(),
      where,
      whereCustom: whereCustom.trim(),
      what,
      whatCustom: whatCustom.trim(),
      emotion,
      problemStatement: statement.trim(),
      sdgCode: sdgCode ?? undefined,
      linkedIdeaIds: [],
    };
    addDiscovery(entry);
    addXp(XP_TABLE.discovery);
    grantStamp('first_discovery');
    if (useAppStore.getState().discoveries.length >= 5) grantStamp('discovery_5');
    toast('문제 발견 저장 완료! XP +10', '🔎');
    resetForm();
  }

  return (
    <div>
      <h1 className="section-title">🔎 문제 발견 네비게이터</h1>
      <p className="section-sub">누가 · 어디서 · 무엇이 골라 나만의 문제를 발견해 보세요!</p>

      <div className="card" style={{ marginBottom: 30 }}>
        <div className="stepper">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <Fragment key={label}>
                {n > 1 && <div className={`step-line ${step >= n ? 'done' : ''}`} />}
                <div
                  className={`step-dot ${step === n ? 'current' : step > n ? 'done' : ''}`}
                  style={step > n ? { cursor: 'pointer' } : undefined}
                  onClick={step > n ? () => setStep(n) : undefined}
                >
                  {step > n ? '✓' : n}
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: step >= n ? 'var(--ink)' : 'var(--ink-3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </Fragment>
            );
          })}
        </div>

        {step === 1 && (
          <div>
            <p className="muted" style={{ marginBottom: 10 }}>
              이 불편을 겪고 있는 사람은 누구인가요?
            </p>
            <div className="row-wrap">
              {WHO_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip ${who === c.id ? 'selected' : ''}`}
                  title={c.description}
                  onClick={() => {
                    if (isWhoId(c.id)) setWho(c.id);
                  }}
                >
                  <span className="chip-ico">{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
            {who === 'others' && (
              <input
                className="input"
                style={{ marginTop: 12 }}
                placeholder="예: 할머니, 부모님, 외국인 친구"
                value={whoCustom}
                onChange={(e) => setWhoCustom(e.target.value)}
              />
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="muted" style={{ marginBottom: 10 }}>
              어디에서 불편을 느꼈나요?
            </p>
            <div className="row-wrap">
              {WHERE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip ${where === c.id ? 'selected' : ''}`}
                  title={c.description}
                  onClick={() => {
                    if (isWhereId(c.id)) setWhere(c.id);
                  }}
                >
                  <span className="chip-ico">{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
            {where === 'others' && (
              <input
                className="input"
                style={{ marginTop: 12 }}
                placeholder="예: 학교 앞 편의점, 지하철역"
                value={whereCustom}
                onChange={(e) => setWhereCustom(e.target.value)}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="col" style={{ gap: 16 }}>
            <div>
              <p className="muted" style={{ marginBottom: 10 }}>
                어떤 종류의 문제인가요?
              </p>
              <div className="row-wrap">
                {WHAT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip ${what === c.id ? 'selected' : ''}`}
                    title={c.description}
                    onClick={() => {
                      if (isWhatId(c.id)) setWhat(c.id);
                    }}
                  >
                    <span className="chip-ico">{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
              {what === 'others' && (
                <input
                  className="input"
                  style={{ marginTop: 12 }}
                  placeholder="예: 정리가 잘 안 되는 책상"
                  value={whatCustom}
                  onChange={(e) => setWhatCustom(e.target.value)}
                />
              )}
            </div>

            <div>
              <p className="muted" style={{ marginBottom: 10 }}>
                얼마나 불편한가요?
              </p>
              <div className="row-wrap">
                {EMOTION_SCALE.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    className={`chip ${emotion === e.value ? 'selected' : ''}`}
                    onClick={() => setEmotion(e.value)}
                  >
                    <span style={{ fontSize: 17 }}>{e.icon}</span> {e.label}
                  </button>
                ))}
              </div>
            </div>

            {sdgMatches.length > 0 && (
              <div>
                <p className="muted" style={{ marginBottom: 8 }}>
                  이 문제, 지구 목표와도 관련 있어요! 카드를 눌러 연결해 보세요. (선택)
                </p>
                <div className="grid grid-3">
                  {sdgMatches.map((c) => {
                    const sel = sdgCode === c.code;
                    return (
                      <div
                        key={c.code}
                        className="card card-tight"
                        style={{
                          cursor: 'pointer',
                          borderWidth: sel ? 2 : 1,
                          borderColor: sel ? c.color : 'var(--line)',
                          background: sel ? 'var(--surface)' : 'var(--surface-2)',
                        }}
                        onClick={() => setSdgCode(sel ? null : c.code)}
                      >
                        <div className="row">
                          <span style={{ fontSize: 20 }}>{c.icon}</span>
                          <b style={{ fontSize: 13 }}>{c.title}</b>
                          <span
                            className="badge"
                            style={{ background: c.color, color: '#fff', marginLeft: 'auto' }}
                          >
                            {c.code}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="field-label">🔍 나의 문제 발견 문장</label>
              <textarea
                className="textarea"
                value={statement}
                placeholder="칩을 모두 고르면 문장이 자동으로 만들어져요!"
                onChange={(e) => setStatement(e.target.value)}
              />
              <p className="tiny" style={{ marginTop: 4 }}>
                문장을 자유롭게 고쳐 쓸 수 있어요.
              </p>
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 18 }}>
          {step > 1 && (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              ← 이전
            </button>
          )}
          <div className="spacer" />
          {step < 3 ? (
            <button className="btn btn-primary" disabled={!stepOk} onClick={() => setStep(step + 1)}>
              다음 →
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" disabled={!canSave} onClick={save}>
              💾 문제 발견 저장하기
            </button>
          )}
        </div>
      </div>

      <Section
        title="📁 내가 발견한 문제들"
        right={
          <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
            {discoveries.length}개
          </span>
        }
      >
        {discoveries.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="아직 발견한 문제가 없어요"
            sub="위 3단계를 따라가면 첫 문제를 발견할 수 있어요!"
          />
        ) : (
          <div className="col">
            {discoveries.map((d) => {
              const whoText = d.who === 'others' && d.whoCustom ? d.whoCustom : findWho(d.who).label;
              const whereText =
                d.where === 'others' && d.whereCustom ? d.whereCustom : findWhere(d.where).label;
              const whatText =
                d.what === 'others' && d.whatCustom ? d.whatCustom : findWhat(d.what).label;
              const emo = EMOTION_SCALE.find((e) => e.value === d.emotion);
              const sdg = d.sdgCode ? sdgsCard(d.sdgCode) : undefined;
              const meta = { background: 'var(--surface-2)', color: 'var(--ink-2)' };
              return (
                <div key={d.id} className="card card-tight">
                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>
                    {d.problemStatement}
                  </div>
                  <div className="row-wrap" style={{ marginBottom: 10 }}>
                    <span className="badge" style={meta}>
                      {findWho(d.who).icon} {whoText}
                    </span>
                    <span className="badge" style={meta}>
                      {findWhere(d.where).icon} {whereText}
                    </span>
                    <span className="badge" style={meta}>
                      {findWhat(d.what).icon} {whatText}
                    </span>
                    {emo && (
                      <span className="badge" style={meta}>
                        {emo.icon} {emo.label}
                      </span>
                    )}
                    {sdg && (
                      <span className="badge" style={{ background: sdg.color, color: '#fff' }}>
                        {sdg.icon} {sdg.code} {sdg.title}
                      </span>
                    )}
                    {d.linkedIdeaIds.length > 0 && (
                      <span className="badge" style={{ background: 'var(--amber-soft)', color: '#92400e' }}>
                        💡 연결된 아이디어 {d.linkedIdeaIds.length}개
                      </span>
                    )}
                  </div>
                  <div className="row">
                    <span className="tiny">{new Date(d.createdAt).toLocaleDateString('ko-KR')}</span>
                    <div className="spacer" />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/ideas?from=${d.id}`)}
                    >
                      💡 아이디어 만들기
                    </button>
                    <ConfirmButton
                      onConfirm={() => {
                        removeDiscovery(d.id);
                        toast('문제 발견을 삭제했어요', '🗑️');
                      }}
                    >
                      삭제
                    </ConfirmButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
