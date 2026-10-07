import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { COMMANDMENTS } from '../../data/commandments';
import { levelInfo, levelProgress, STAMPS } from '../../lib/level';
import { SSI_STATS } from '../../data/ssi';
import { quoteOfDay } from '../../data/quotes';

const QUICK_LINKS = [
  { to: '/discover', icon: '🔎', title: '문제 발견', desc: '클릭만 하면 불편한 문제가 씨앗이 돼요' },
  { to: '/ideas', icon: '💡', title: '아이디어 공방', desc: '5W1H·SCAMPER로 아이디어를 키워요' },
  { to: '/awards', icon: '🏆', title: '수상작 탐구', desc: `수상작 ${SSI_STATS.total}작의 비밀을 파헤쳐요` },
  { to: '/plan', icon: '📄', title: '발명계획서', desc: 'PDF까지 딱, 선생님께 내기 준비 끝' },
  { to: '/inventors', icon: '🧑‍🔬', title: '발명가 게임', desc: '역사 속 발명가를 추리하자!' },
  { to: '/game', icon: '🃏', title: '카드게임', desc: '역사 속 발명으로 계명을 익혀요' },
  { to: '/sdgs', icon: '🌏', title: 'SDGs 탐구', desc: '지구를 지키는 발명을 찾아요' },
  { to: '/patent', icon: '📜', title: '특허 검색', desc: '내 아이디어의 특허를 찾아요' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const discoveries = useAppStore((s) => s.discoveries);
  const ideas = useAppStore((s) => s.ideas);
  const plans = useAppStore((s) => s.plans);
  const notes = useAppStore((s) => s.notes);
  const stamps = useAppStore((s) => s.stamps);

  const tip = useMemo(() => COMMANDMENTS[Math.floor(Math.random() * COMMANDMENTS.length)], []);
  const quote = useMemo(() => quoteOfDay(), []);
  const info = levelInfo(profile.xp);
  const progress = Math.round(levelProgress(profile.xp) * 100);
  const isGuest = !profile.nickname;

  const stats = [
    { icon: '🔎', label: '발견한 문제', value: discoveries.length, to: '/discover' },
    { icon: '💡', label: '아이디어', value: ideas.length, to: '/ideas' },
    { icon: '📓', label: '노트', value: notes.length, to: '/notes' },
    { icon: '📄', label: '계획서', value: plans.length, to: '/plan' },
  ];

  const latestIdea = ideas[0];
  const latestDiscovery = discoveries[0];

  return (
    <div className="col" style={{ gap: 26 }}>
      {/* 히어로 */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
          border: 'none',
          color: '#fff',
          padding: '34px 30px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.15, transform: 'rotate(12deg)' }}>
          💡
        </div>
        <p style={{ fontWeight: 700, opacity: 0.85, fontSize: 13.5 }}>
          {isGuest ? '안녕하세요, 미래의 발명가!' : `안녕하세요, ${profile.nickname} ${profile.avatar}`}
        </p>
        <h1 style={{ fontSize: 27, fontWeight: 800, margin: '4px 0 8px', lineHeight: 1.35 }}>
          일상의 불편에서
          <br />
          발명 아이디어를 찾아보세요
        </h1>
        <p style={{ fontSize: 14, opacity: 0.9, maxWidth: 480 }}>
          클릭하고, 고르고, 살짝 입력하기만 하면요. 내 주변의 문제가 발명의 씨앗이 됩니다.
        </p>
        <div className="row-wrap" style={{ marginTop: 18 }}>
          <button className="btn btn-lg" style={{ background: '#ffd54f', borderColor: '#ffd54f', color: '#5b4200' }} onClick={() => navigate('/discover')}>
            🔎 문제 발견 시작하기
          </button>
          <button className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.35)', color: '#fff' }} onClick={() => navigate('/awards')}>
            🏆 수상작 구경하기
          </button>
        </div>
      </section>

      {/* 내 발명 대시보드 */}
      <section className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ fontSize: 18 }}>
            내 발명 현황
          </h2>
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>
            Lv.{info.level} {info.icon} {profile.nickname || info.title} · {profile.xp} XP ›
          </button>
        </div>
        <div className="row" style={{ marginBottom: 14, gap: 12 }}>
          <span className="tiny" style={{ minWidth: 96 }}>
            {info.icon} {info.title}
          </span>
          <span className="xp-bar" style={{ flex: 1, display: 'block' }}>
            <span style={{ display: 'block', height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', borderRadius: 4 }} />
          </span>
          <span className="tiny">{progress}%</span>
        </div>
        <div className="grid grid-4">
          {stats.map((s) => (
            <button
              key={s.label}
              className="card card-tight"
              style={{ cursor: 'pointer', textAlign: 'left' }}
              onClick={() => navigate(s.to)}
            >
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
              <div className="tiny">{s.label}</div>
            </button>
          ))}
        </div>
        <div className="row-wrap" style={{ marginTop: 12 }}>
          <span className="badge" style={{ background: 'var(--amber-soft)', color: '#92400e' }}>
            🏅 도장 {stamps.length}/{STAMPS.length}
          </span>
          {latestDiscovery && (
            <span className="tiny">최근 발견: “{latestDiscovery.problemStatement.slice(0, 26)}…”</span>
          )}
          {latestIdea && <span className="tiny">최근 아이디어: “{latestIdea.title.slice(0, 20)}”</span>}
        </div>
      </section>

      {/* 빠른 메뉴 */}
      <section>
        <h2 className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>
          무엇을 도와드릴까요?
        </h2>
        <div className="grid grid-4">
          {QUICK_LINKS.map((l) => (
            <button key={l.to} className="card" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate(l.to)}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{l.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{l.title}</div>
              <div className="tiny">{l.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 오늘의 발명 팁 */}
      <section
        className="card"
        style={{ borderColor: 'var(--amber)', background: 'linear-gradient(160deg, #fffbeb, #fef3c7)' }}
      >
        <div className="row" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>{tip.icon}</span>
          <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>오늘의 발명 계명 #{tip.no}</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{tip.title}</div>
        <p className="muted">{tip.description}</p>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#92400e', marginTop: 8 }}>💭 {tip.prompt}</p>
      </section>

      {/* 오늘의 발명 명언 */}
      <section className="card row" style={{ alignItems: 'flex-start', background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
        <span style={{ fontSize: 24 }}>💬</span>
        <div style={{ flex: 1 }}>
          <div className="tiny" style={{ fontWeight: 800, color: 'var(--primary-deep)', marginBottom: 4 }}>
            오늘의 발명 명언
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.6 }}>“{quote}”</p>
        </div>
      </section>
      {/* 사용 설명서 (학생용) */}
      <a
        className="card row"
        href="./manual-student.pdf"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <span style={{ fontSize: 24 }}>📖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>사용 설명서 (학생용)</div>
          <div className="tiny">메뉴 사용법이 궁금하면 열어보세요! (PDF)</div>
        </div>
        <span className="tiny">열기 ›</span>
      </a>
    </div>
  );
}
