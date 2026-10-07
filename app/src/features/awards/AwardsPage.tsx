import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Section, toast } from '../../components/ui';
import { useAppStore, XP_TABLE } from '../../store/useAppStore';
import {
  AWARD_ORDER,
  EMPTY_FILTER,
  SSI_AWARDS,
  SSI_STATS,
  awardColor,
  filterAwards,
  type AwardFilter,
} from '../../data/ssi';
import { COMMANDMENTS, commandment } from '../../data/commandments';
import { WHAT_CATEGORIES, WHERE_CATEGORIES, WHO_CATEGORIES } from '../../data/categories';
import { stampById } from '../../lib/level';
import type { Category, SsiAward, SsiFiveW1H } from '../../types';

const PAGE_SIZE = 60;

const FIVE_W1H_ROWS: { key: keyof SsiFiveW1H; label: string; icon: string }[] = [
  { key: 'who', label: '누가', icon: '👤' },
  { key: 'when', label: '언제', icon: '🕰️' },
  { key: 'where', label: '어디서', icon: '📍' },
  { key: 'what', label: '무엇을', icon: '🎯' },
  { key: 'why', label: '왜', icon: '🤔' },
  { key: 'how', label: '어떻게', icon: '⚙️' },
];

/** titleMissing인 작품은 제목 대신 "(제목 미상) · 학교"로 보여 준다 */
function awardTitleText(a: SsiAward): string {
  return a.titleMissing ? `(제목 미상) · ${a.school}` : a.title;
}

/** 제목에서 특허 검색용 키워드 2~3개를 뽑는다 */
function patentQueryOf(title: string): string {
  return title
    .split(/[\s,.·:;()[\]{}'"!?~\-]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 3)
    .join(' ');
}

function AwardCard(props: { award: SsiAward; onOpen: (a: SsiAward) => void }) {
  const { award, onOpen } = props;
  const color = awardColor(award.award);
  return (
    <button type="button" className="card award-card" onClick={() => onOpen(award)}>
      <div className="row" style={{ gap: 6 }}>
        <span className="badge" style={{ background: `${color}1a`, color }}>
          {award.award}
        </span>
        <span className="tiny">{award.year}년</span>
      </div>
      <div className="award-card-title">{awardTitleText(award)}</div>
      <div className="tiny">
        {award.year} {award.school} {award.student}
      </div>
      <div className="cmd-row">
        {award.commandments.map((c) => {
          const cm = commandment(c.no);
          return (
            <span key={c.no} className="cmd-pill" title={`${c.no}. ${cm.title}`}>
              {cm.icon} {c.no}
            </span>
          );
        })}
      </div>
    </button>
  );
}

function CategoryFilterGroup(props: {
  label: string;
  items: Category[];
  active: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="field-label">{props.label}</div>
      <div className="row-wrap" style={{ gap: 6 }}>
        <button
          type="button"
          className={`chip chip-sm ${props.active === null ? 'selected' : ''}`}
          onClick={() => props.onPick(null)}
        >
          전체
        </button>
        {props.items.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.description}
            className={`chip chip-sm ${props.active === c.id ? 'selected' : ''}`}
            onClick={() => props.onPick(props.active === c.id ? null : c.id)}
          >
            <span className="chip-ico">{c.icon}</span> {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const awardsCss = `
.award-card {
  text-align: left; cursor: pointer; font: inherit; color: inherit;
  display: flex; flex-direction: column; gap: 7px;
  transition: transform 0.1s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.award-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-up); border-color: var(--primary); }
.award-card-title {
  font-weight: 800; font-size: 14.5px; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.cmd-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; }
.cmd-pill {
  display: inline-flex; align-items: center; gap: 3px;
  background: var(--primary-soft); color: var(--primary-deep);
  border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 800; white-space: nowrap;
}
.chip-sm { padding: 6px 11px; font-size: 12.5px; }
.award-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.cmd-chip { max-width: 280px; }
.cmd-chip-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.cmd-desc {
  margin-top: 12px; background: var(--primary-soft);
  border-radius: var(--radius-sm); padding: 12px 14px;
}
.cmd-no-badge {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  background: var(--surface); border: 1.5px solid var(--primary); color: var(--primary-deep);
  border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 800;
}
.cmd-match-panel { background: var(--primary-soft); border-radius: var(--radius-sm); padding: 12px 14px; }
.fwh-label { flex-shrink: 0; width: 76px; font-size: 12.5px; font-weight: 800; color: var(--ink-2); }
@media (max-width: 560px) {
  .fwh-label { width: 64px; }
  .cmd-chip { max-width: 100%; }
}
`;

export default function AwardsPage() {
  const navigate = useNavigate();
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);
  const markAwardExplored = useAppStore((s) => s.markAwardExplored);
  const exploredCount = useAppStore((s) => s.exploredAwardIds.length);

  const [filter, setFilter] = useState<AwardFilter>({ ...EMPTY_FILTER });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<SsiAward | null>(null);

  const results = useMemo(() => filterAwards(filter), [filter]);
  const visible = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);

  const commandmentCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const a of SSI_AWARDS) {
      for (const c of a.commandments) counts.set(c.no, (counts.get(c.no) ?? 0) + 1);
    }
    return counts;
  }, []);

  const years = useMemo(
    () =>
      Object.keys(SSI_STATS.byYear)
        .map(Number)
        .sort((a, b) => b - a),
    [],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  function patch(p: Partial<AwardFilter>) {
    setFilter((f) => ({ ...f, ...p }));
  }

  function setCategory(dim: 'who' | 'where' | 'what', id: string | null) {
    setFilter((f) => {
      const next: AwardFilter = { ...f };
      if (dim === 'who') next.who = id;
      else if (dim === 'where') next.where = id;
      else next.what = id;
      return next;
    });
  }

  function openAward(a: SsiAward) {
    setSelected(a);
    markAwardExplored(a.id);
    addXp(XP_TABLE.awardExplore);
    const count = useAppStore.getState().exploredAwardIds.length;
    if (count === 10 && earnStamp('awards_10')) {
      toast(`도장 획득: ${stampById('awards_10').name}`, '🏅');
    } else if (count === 50 && earnStamp('awards_50')) {
      toast(`도장 획득: ${stampById('awards_50').name}`, '🏅');
    }
  }

  const activeCmd = filter.commandment !== null ? commandment(filter.commandment) : null;
  const hasFilter =
    filter.query.trim() !== '' ||
    filter.year !== null ||
    filter.award !== null ||
    filter.commandment !== null ||
    filter.who !== null ||
    filter.where !== null ||
    filter.what !== null;

  return (
    <div>
      <style>{awardsCss}</style>

      <h1 className="section-title">🏆 수상작 탐구</h1>
      <p className="section-sub">
        2019~2025 SSI 대회 수상작 총 {SSI_STATS.total}작이에요. 마음에 드는 발명을 골라 자세히
        살펴보세요!
      </p>

      <div
        className="card card-tight row"
        style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)', marginBottom: 16 }}
      >
        <span style={{ fontSize: 20 }}>🌐</span>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 14 }}>전국학생 과학발명품 경진대회 (SSI)</strong>
          <div className="tiny">대회 소개·출품 방법은 공식 사이트에서 확인할 수 있어요.</div>
        </div>
        <a
          className="btn btn-sm btn-primary"
          href="http://ssicompetition.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          공식 사이트 바로가기 →
        </a>
      </div>

      {/* 발명 10계명 */}
      <Section
        title="발명 10계명"
        sub="계명 칩을 누르면 그 계명으로 만든 수상작만 모아 보여 줘요."
      >
        <div className="row-wrap" style={{ gap: 6 }}>
          {COMMANDMENTS.map((cm) => (
            <button
              key={cm.no}
              type="button"
              className={`chip cmd-chip ${filter.commandment === cm.no ? 'selected' : ''}`}
              title={`${cm.description} (${commandmentCounts.get(cm.no) ?? 0}작)`}
              onClick={() => patch({ commandment: filter.commandment === cm.no ? null : cm.no })}
            >
              <span className="chip-ico">{cm.icon}</span>
              <b>{cm.no}</b>
              <span className="cmd-chip-title">{cm.title}</span>
              <span className="tiny">{commandmentCounts.get(cm.no) ?? 0}작</span>
            </button>
          ))}
        </div>
        {activeCmd && (
          <div className="cmd-desc">
            <div className="row">
              <span className="cmd-no-badge">
                {activeCmd.icon} {activeCmd.no}
              </span>
              <b style={{ fontSize: 14 }}>{activeCmd.title}</b>
              <div className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => patch({ commandment: null })}>
                해제
              </button>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              {activeCmd.description}
            </p>
            <p className="tiny" style={{ marginTop: 2 }}>
              💡 {activeCmd.prompt}
            </p>
          </div>
        )}
      </Section>

      {/* 검색 + 필터 */}
      <Section title="수상작 찾기" sub="검색어와 필터로 원하는 수상작을 찾아 보세요.">
        <div className="card">
          <div className="field-label">🔎 통합 검색</div>
          <input
            className="input"
            placeholder="제목, 학교, 학생 이름으로 검색해 보세요"
            value={filter.query}
            onChange={(e) => patch({ query: e.target.value })}
          />
          <div style={{ height: 14 }} />
          <div className="field-label">📅 수상 연도</div>
          <div className="row-wrap" style={{ gap: 6 }}>
            <button
              type="button"
              className={`chip chip-sm ${filter.year === null ? 'selected' : ''}`}
              onClick={() => patch({ year: null })}
            >
              전체 · {SSI_STATS.total}작
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`chip chip-sm ${filter.year === y ? 'selected' : ''}`}
                onClick={() => patch({ year: filter.year === y ? null : y })}
              >
                {y}년 · {SSI_STATS.byYear[String(y)] ?? 0}작
              </button>
            ))}
          </div>
          <div style={{ height: 14 }} />
          <div className="field-label">🏅 수상 종류</div>
          <div className="row-wrap" style={{ gap: 6 }}>
            <button
              type="button"
              className={`chip chip-sm ${filter.award === null ? 'selected' : ''}`}
              onClick={() => patch({ award: null })}
            >
              전체
            </button>
            {AWARD_ORDER.map((a) => {
              const color = awardColor(a);
              const isSelected = filter.award === a;
              return (
                <button
                  key={a}
                  type="button"
                  className={`chip chip-sm ${isSelected ? 'selected' : ''}`}
                  style={isSelected ? { borderColor: color, color, background: `${color}14` } : undefined}
                  onClick={() => patch({ award: isSelected ? null : a })}
                >
                  <span className="award-dot" style={{ background: color }} /> {a}
                </button>
              );
            })}
          </div>
          <div style={{ height: 4 }} />
          <CategoryFilterGroup
            label="👤 누가 (WHO)"
            items={WHO_CATEGORIES}
            active={filter.who}
            onPick={(id) => setCategory('who', id)}
          />
          <CategoryFilterGroup
            label="📍 어디서 (WHERE)"
            items={WHERE_CATEGORIES}
            active={filter.where}
            onPick={(id) => setCategory('where', id)}
          />
          <CategoryFilterGroup
            label="🎯 무엇을 (WHAT)"
            items={WHAT_CATEGORIES}
            active={filter.what}
            onPick={(id) => setCategory('what', id)}
          />
        </div>
      </Section>

      {/* 결과 그리드 */}
      <Section
        title="탐색 결과"
        sub={`내가 탐구해 본 수상작: ${exploredCount}작`}
        right={
          <div className="row" style={{ gap: 8 }}>
            {hasFilter && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setFilter({ ...EMPTY_FILTER })}
              >
                필터 초기화
              </button>
            )}
            <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
              총 {results.length}작
            </span>
          </div>
        }
      >
        {results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico">🔍</div>
            <div className="empty-title">검색 결과가 없어요</div>
            <div className="tiny">다른 검색어나 필터로 다시 찾아 보세요!</div>
          </div>
        ) : (
          <>
            <div className="grid grid-3">
              {visible.map((a) => (
                <AwardCard key={a.id} award={a} onOpen={openAward} />
              ))}
            </div>
            {results.length > visibleCount && (
              <div className="center" style={{ marginTop: 18 }}>
                <button className="btn" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  더 보기 ({results.length - visibleCount}작 남음)
                </button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 상세 모달 */}
      <Modal open={selected !== null} onClose={() => setSelected(null)} wide title="수상작 상세">
        {selected && (
          <div className="col" style={{ gap: 16 }}>
            <div>
              <span
                className="badge"
                style={{ background: `${awardColor(selected.award)}1a`, color: awardColor(selected.award) }}
              >
                {selected.award}
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{awardTitleText(selected)}</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                {selected.year}년 · {selected.school} · {selected.student}
                {selected.teacher ? ` · 지도 ${selected.teacher}` : ''}
              </p>
            </div>

            <div className="cmd-match-panel">
              <div className="field-label">이 수상작에 담긴 발명 10계명</div>
              <div className="col" style={{ gap: 8 }}>
                {selected.commandments.map((c) => {
                  const cm = commandment(c.no);
                  return (
                    <div key={c.no} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                      <span className="cmd-no-badge" title={cm.title}>
                        {cm.icon} {c.no}
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.title}</div>
                        <div className="tiny">{c.interpretation}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card card-tight" style={{ background: 'var(--surface-2)' }}>
              <div className="field-label">5W1H 분석</div>
              <div className="col" style={{ gap: 6 }}>
                {FIVE_W1H_ROWS.map((r) => (
                  <div key={r.key} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                    <span className="fwh-label">
                      {r.icon} {r.label}
                    </span>
                    <span style={{ fontSize: 13.5 }}>{selected.fiveW1H[r.key]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="row-wrap">
              <button className="btn btn-primary" onClick={() => navigate('/ideas')}>
                💡 이 아이디어에서 배우기
              </button>
              <button
                className="btn"
                onClick={() =>
                  navigate(`/patent?q=${encodeURIComponent(patentQueryOf(selected.title))}`)
                }
              >
                📜 특허 검색해 보기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
