import { AVATARS, useAppStore } from '../../store/useAppStore';
import { STAMPS, levelInfo, levelProgress } from '../../lib/level';
import { downloadText } from '../../lib/csv';
import { Section, toast } from '../../components/ui';

export default function ProfilePage() {
  const profile = useAppStore((s) => s.profile);
  const stamps = useAppStore((s) => s.stamps);
  const discoveries = useAppStore((s) => s.discoveries);
  const ideas = useAppStore((s) => s.ideas);
  const notes = useAppStore((s) => s.notes);
  const plans = useAppStore((s) => s.plans);
  const gameScores = useAppStore((s) => s.gameScores);
  const exploredAwardIds = useAppStore((s) => s.exploredAwardIds);
  const setProfile = useAppStore((s) => s.setProfile);

  const info = levelInfo(profile.xp);
  const progress = levelProgress(profile.xp);
  const xpToNext =
    info.maxXp === Number.MAX_SAFE_INTEGER ? null : info.maxXp - profile.xp;
  const bestGameScore = gameScores.length === 0 ? 0 : Math.max(...gameScores.map((g) => g.score));

  const stats: { icon: string; label: string; value: string }[] = [
    { icon: '🔎', label: '발견한 문제', value: String(discoveries.length) },
    { icon: '💡', label: '만든 아이디어', value: String(ideas.length) },
    { icon: '📓', label: '발명 노트', value: String(notes.length) },
    { icon: '📄', label: '발명계획서', value: String(plans.length) },
    { icon: '🏆', label: '탐색한 수상작', value: String(exploredAwardIds.length) },
    {
      icon: '🃏',
      label: '카드게임 기록',
      value: `${gameScores.length}회 · 최고 ${bestGameScore}점`,
    },
  ];

  /** 전체 데이터 JSON 백업 (필요한 필드만 조립) */
  const exportAllData = () => {
    const s = useAppStore.getState();
    const data = {
      exportedAt: new Date().toISOString(),
      profile: s.profile,
      stamps: s.stamps,
      discoveries: s.discoveries,
      ideas: s.ideas,
      notes: s.notes,
      plans: s.plans,
      gameScores: s.gameScores,
      exploredAwardIds: s.exploredAwardIds,
      sdgsExplored: s.sdgsExplored,
      teacherFeedback: s.teacher.feedback,
      presentationOrders: s.teacher.presentationOrders,
    };
    downloadText('발명노트_백업.json', JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
    toast('백업 파일을 저장했어요!', '💾');
  };

  return (
    <div>
      <Section title="🎖️ 내 발명가" sub="나의 발명 활동 기록을 한눈에 볼 수 있어요.">
        {/* 프로필 + 레벨 */}
        <div className="grid grid-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <strong style={{ display: 'block', marginBottom: 12 }}>🙋 발명가 소개</strong>
            <label className="field-label">발명가 이름 (닉네임)</label>
            <input
              className="input"
              value={profile.nickname}
              maxLength={10}
              placeholder="예: 발명왕 김코딩"
              onChange={(e) => setProfile({ nickname: e.target.value.slice(0, 10) })}
              style={{ marginBottom: 14 }}
            />
            <label className="field-label">아바타 선택</label>
            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
            >
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={a === profile.avatar ? 'chip selected' : 'chip'}
                  style={{ justifyContent: 'center', fontSize: 20, padding: '10px 0' }}
                  aria-label={`아바타 ${a}`}
                  onClick={() => setProfile({ avatar: a })}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div
            className="card"
            style={{ background: 'linear-gradient(135deg, var(--primary-soft), #fff)' }}
          >
            <div className="row" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 44 }}>{info.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  Lv.{info.level}{' '}
                  <span style={{ color: 'var(--primary-deep)' }}>{info.title}</span>
                </div>
                <div className="muted">
                  총 XP {profile.xp} · {profile.nickname || '이름 없는 발명가'}
                </div>
              </div>
            </div>
            <div className="xp-bar" style={{ height: 12, borderRadius: 7 }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(progress * 100)}%`,
                  background: 'linear-gradient(90deg, var(--primary), #8b5cf6)',
                  borderRadius: 7,
                }}
              />
            </div>
            <p className="tiny" style={{ marginTop: 8 }}>
              {xpToNext === null
                ? '👑 최고 레벨 달성! 멋진 마스터 발명가예요!'
                : `다음 레벨까지 XP ${xpToNext} 남았어요!`}
            </p>
          </div>
        </div>

        {/* 통계 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 12 }}>📊 발명 활동 통계</strong>
          <div className="grid grid-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="card card-tight"
                style={{ background: 'var(--surface-2)', boxShadow: 'none' }}
              >
                <div style={{ fontSize: 24, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                <div className="tiny">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 도장 컬렉션 */}
      <Section
        title="🏅 발명가 도장 컬렉션"
        sub="활동을 할수록 도장이 모여요. 모두 모아 발명가 인증을 완성해 보세요!"
        right={
          <span
            className="badge"
            style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}
          >
            {stamps.length}/{STAMPS.length} 획득
          </span>
        }
      >
        <div className="stamp-grid">
          {STAMPS.map((st) => {
            const earned = stamps.includes(st.id);
            return (
              <div
                key={st.id}
                className={earned ? 'stamp-item earned' : 'stamp-item'}
                title={st.description}
              >
                <span className="stamp-ico">{st.icon}</span>
                <div className="stamp-name">{st.name}</div>
                <div className="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                  {st.description}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 데이터 관리 */}
      <Section title="💾 데이터 관리">
        <div className="card">
          <div className="row-wrap" style={{ marginBottom: 10 }}>
            <button className="btn btn-primary" onClick={exportAllData}>
              📤 모든 데이터 내보내기 (JSON)
            </button>
            <span className="tiny">발명노트_백업.json 파일로 저장돼요</span>
          </div>
          <p className="tiny" style={{ margin: 0 }}>
            🔒 데이터는 이 브라우저(LocalStorage)에만 저장돼요. 기기를 바꾸거나 브라우저 기록을
            지우면 사라질 수 있으니, 소중한 기록은 백업 파일을 꼭 챙기세요!
          </p>
        </div>
      </Section>
    </div>
  );
}
