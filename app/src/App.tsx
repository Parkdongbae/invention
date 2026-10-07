import { lazy, Suspense, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Modal, ToastHost } from './components/ui';
import { useAppStore } from './store/useAppStore';
import { levelInfo, levelProgress } from './lib/level';

const HomePage = lazy(() => import('./features/home/HomePage'));
const DiscoverPage = lazy(() => import('./features/discover/DiscoverPage'));
const IdeasPage = lazy(() => import('./features/ideas/IdeasPage'));
const SdgsPage = lazy(() => import('./features/sdgs/SdgsPage'));
const AwardsPage = lazy(() => import('./features/awards/AwardsPage'));
const GamePage = lazy(() => import('./features/game/GamePage'));
const PatentPage = lazy(() => import('./features/patent/PatentPage'));
const NotesPage = lazy(() => import('./features/notes/NotesPage'));
const PlanPage = lazy(() => import('./features/plan/PlanPage'));
const TeacherPage = lazy(() => import('./features/teacher/TeacherPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const JoinPage = lazy(() => import('./features/join/JoinPage'));
const InventorsPage = lazy(() => import('./features/inventors/InventorsPage'));
const ReportPage = lazy(() => import('./features/report/ReportPage'));

const NAV_ITEMS: { to: string; icon: string; label: string; tab?: boolean }[] = [
  { to: '/', icon: '🏠', label: '홈', tab: true },
  { to: '/discover', icon: '🔎', label: '문제 발견', tab: true },
  { to: '/ideas', icon: '💡', label: '아이디어', tab: true },
  { to: '/awards', icon: '🏆', label: '수상작', tab: true },
  { to: '/sdgs', icon: '🌏', label: 'SDGs' },
  { to: '/game', icon: '🃏', label: '카드게임' },
  { to: '/inventors', icon: '🧑‍🔬', label: '발명가 게임' },
  { to: '/patent', icon: '📜', label: '특허 검색' },
  { to: '/plan', icon: '📄', label: '발명계획서' },
  { to: '/notes', icon: '📓', label: '발명 노트' },
  { to: '/profile', icon: '🎖️', label: '내 발명가' },
  { to: '/report', icon: '🚨', label: '오류 신고' },
  { to: '/teacher', icon: '🧑‍🏫', label: '교사용' },
];

function Loading() {
  return (
    <div className="page-loading">
      <span className="spin">💡</span> 불러오는 중...
    </div>
  );
}

export default function App() {
  const profile = useAppStore((s) => s.profile);
  const sfx = useAppStore((s) => s.sfx);
  const toggleSfx = useAppStore((s) => s.toggleSfx);
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const info = levelInfo(profile.xp);
  const progress = levelProgress(profile.xp);

  const tabs = NAV_ITEMS.filter((n) => n.tab);
  const side = NAV_ITEMS;
  const moreItems = NAV_ITEMS.filter((n) => !n.tab);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="brand">
            <span className="brand-badge">💡</span>
            발명 도우미
          </NavLink>
          <div className="header-right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleSfx}
              title={sfx ? '효과음 끄기' : '효과음 켜기'}
              aria-label={sfx ? '효과음 끄기' : '효과음 켜기'}
              style={{ fontSize: 16, padding: '6px 9px' }}
            >
              {sfx ? '🔊' : '🔇'}
            </button>
            <button
              className="xp-chip"
              onClick={() => navigate('/profile')}
              title={`${info.title} · XP ${profile.xp}`}
            >
              <span className="avatar-dot">{profile.avatar}</span>
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.2 }}>
                  Lv.{info.level} {profile.nickname || info.title}
                </span>
                <span className="xp-bar" style={{ display: 'block', marginTop: 2 }}>
                  <span style={{ display: 'block', height: '100%', width: `${Math.round(progress * 100)}%`, background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', borderRadius: 4 }} />
                </span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <nav className="side-nav" aria-label="주 메뉴">
          {side.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <span className="nav-ico">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <main className="app-main">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/sdgs" element={<SdgsPage />} />
              <Route path="/awards" element={<AwardsPage />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/inventors" element={<InventorsPage />} />
              <Route path="/patent" element={<PatentPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/teacher" element={<TeacherPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="*" element={<Loading />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <nav className="tab-nav" aria-label="모바일 메뉴">
        <div className="tab-nav-inner">
          {tabs.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <span className="nav-ico">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
            onClick={() => setMoreOpen(true)}
          >
            <span className="nav-ico">⋯</span>
            더보기
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="메뉴">
        <div className="grid grid-2">
          {moreItems.map((n) => (
            <button
              key={n.to}
              className="btn"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                setMoreOpen(false);
                navigate(n.to);
              }}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>
      </Modal>

      <ToastHost />
    </div>
  );
}
