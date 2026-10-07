import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XP_TABLE, useAppStore } from '../../store/useAppStore';
import { buildKeywordSet, extractKeywords } from '../../lib/keywords';
import { Section, toast } from '../../components/ui';

type Engine = 'kipris' | 'google';

const PATENT_URLS: Record<Engine, (q: string) => string> = {
  kipris: (q) => `https://kipris.or.kr/krts/search/searchTotal.do?keyword=${encodeURIComponent(q)}`,
  google: (q) => `https://patents.google.com/?q=${encodeURIComponent(q)}`,
};

export default function PatentPage() {
  const [searchParams] = useSearchParams();

  const ideas = useAppStore((s) => s.ideas);
  const discoveries = useAppStore((s) => s.discoveries);
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);

  const [ideaId, setIdeaId] = useState(searchParams.get('idea') ?? '');
  const [text, setText] = useState(searchParams.get('q') ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const idea = ideas.find((i) => i.id === ideaId);
  const discovery = idea?.discoveryId
    ? discoveries.find((d) => d.id === idea.discoveryId)
    : undefined;

  // 추천 키워드: 아이디어 선택 시 아이디어 키워드 + 발견 카테고리 키워드, 직접 입력 시 본문에서 추출
  const suggestions = useMemo(() => {
    const base = idea ? [...idea.keywords] : extractKeywords(text);
    const cats = discovery ? [discovery.who, discovery.where, discovery.what] : [];
    return buildKeywordSet(base, cats).filter((k) => k.trim() !== '').slice(0, 12);
  }, [idea, discovery, text]);

  // 검색어 = 입력 텍스트 + 선택한 키워드 (중복 제외)
  const query = useMemo(() => {
    const t = text.trim();
    const extra = selected.filter((k) => !t.includes(k));
    return [t, ...extra].join(' ').trim();
  }, [text, selected]);

  const runSearch = (engine: Engine) => {
    const q = query;
    if (!q) {
      toast('먼저 검색어를 입력하거나 키워드를 골라 주세요!', '🔍');
      return;
    }
    window.open(PATENT_URLS[engine](q), '_blank', 'noopener');
    addXp(XP_TABLE.patentSearch);
    if (earnStamp('patent_searched')) toast('특허 조사관 도장을 획득했어요!', '📜');
    setRecent((r) => [q, ...r.filter((x) => x !== q)].slice(0, 5));
  };

  const toggleKeyword = (k: string) =>
    setSelected((sel) => (sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]));

  const pickIdea = (v: string) => {
    setIdeaId(v);
    setSelected([]);
    const picked = ideas.find((i) => i.id === v);
    if (picked) setText(picked.title);
  };

  return (
    <div>
      <Section title="📜 특허 검색" sub="내 아이디어가 이미 세상에 있는 발명인지 한번 확인해 볼까요?">
        {/* 검색 카드 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="field-label">내 아이디어 선택</label>
              <select className="select" value={ideaId} onChange={(e) => pickIdea(e.target.value)}>
                <option value="">✏️ 직접 입력할게요</option>
                {ideas.map((i) => (
                  <option key={i.id} value={i.id}>
                    💡 {i.title || '(제목 없는 아이디어)'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">검색어</label>
              <input
                className="input"
                value={text}
                placeholder="예: 미끄럼 방지 우산꽂이"
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>

          <label className="field-label">추천 키워드 (눌러서 선택)</label>
          {suggestions.length === 0 ? (
            <p className="tiny" style={{ marginBottom: 12 }}>
              검색어를 입력하거나 아이디어를 선택하면 추천 키워드가 나타나요.
            </p>
          ) : (
            <div className="row-wrap" style={{ marginBottom: 12 }}>
              {suggestions.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={selected.includes(k) ? 'chip selected' : 'chip'}
                  onClick={() => toggleKeyword(k)}
                >
                  {selected.includes(k) ? '✓' : '+'} {k}
                </button>
              ))}
            </div>
          )}

          {selected.length > 0 && (
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="tiny">
                선택한 키워드: {selected.length}개 (검색어에 함께 들어가요)
              </span>
              <div className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => setSelected([])}>
                선택 지우기
              </button>
            </div>
          )}

          <div className="row-wrap">
            <button className="btn btn-primary" onClick={() => runSearch('kipris')}>
              🔍 KIPRIS(특허정보검색서비스)에서 검색
            </button>
            <button className="btn" onClick={() => runSearch('google')}>
              🌍 Google Patents에서 검색
            </button>
          </div>
          <p className="tiny" style={{ marginTop: 10 }}>
            검색 결과는 새 탭에서 열려요. 비슷한 발명이 있는지 사진과 설명을 살펴 보세요!
          </p>

          {recent.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <label className="field-label">최근 검색어</label>
              <div className="row-wrap">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="chip"
                    onClick={() => {
                      setText(r);
                      setSelected([]);
                    }}
                  >
                    🕐 {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 안내 카드 */}
        <div className="card" style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)' }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>💡 특허란 무엇일까요?</strong>
          <p className="muted" style={{ marginBottom: 8 }}>
            특허는 새로운 발명을 <strong>처음 만든 사람</strong>이 국가에서 공식으로 인정받는
            권리예요. 특허를 받으면 정해진 기간 동안 다른 사람이 허락 없이 그 발명을 만들거나 팔 수
            없어요.
          </p>
          <p className="muted">
            <strong>왜 확인할까요?</strong> 내 아이디어와 똑같은 발명이 이미 특허로 등록되어 있다면,
            그대로 만드는 것은 '새로운 발명'이 아니에요. 하지만 걱정 마세요! 이미 있는 발명을
            찾아보고 <strong>"여기가 불편한데 더 좋게 바꾸면 어때?"</strong> 하고 나만의 아이디어를
            더하면, 그것이 바로 나의 발명이 될 수 있어요.
          </p>
        </div>
      </Section>
    </div>
  );
}
