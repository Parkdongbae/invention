import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { decodeJoin } from '../../lib/join';
import { EmptyState, toast } from '../../components/ui';

export default function JoinPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [joining, setJoining] = useState(false);

  const info = useMemo(() => decodeJoin(params.get('t') ?? ''), [params]);
  const connectedCode = useAppStore((s) => s.teacher.classCode);

  const alreadySame = info && connectedCode === info.classCode;

  const confirm = () => {
    if (!info) return;
    setJoining(true);
    useAppStore.getState().setTeacherConfig({
      gasUrl: info.gasUrl,
      classCode: info.classCode,
      className: info.className,
    });
    toast(`${info.className || info.classCode} 반에 연결했어요!`, '🏫');
    navigate('/plan');
  };

  if (!info) {
    return (
      <div className="card">
        <EmptyState
          icon="🔗"
          title="연결 링크가 올바르지 않아요"
          sub="선생님이 알려준 초대 링크를 그대로 다시 열어 주세요. (링크가 잘렸을 수 있어요)"
        >
          <button className="btn" onClick={() => navigate('/')}>
            🏠 홈으로
          </button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: 34 }}>
      <div style={{ fontSize: 46, marginBottom: 8 }}>🏫</div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>
        {info.className || info.classCode || '우리 반'}
      </h1>
      <p className="muted" style={{ marginBottom: 4 }}>
        {info.classCode && <>{info.classCode} 반</>} 선생님의 발명 도우미에 연결할까요?
      </p>
      <p className="tiny" style={{ marginBottom: 18 }}>
        연결하면 발명계획서를 선생님께 바로 보낼 수 있어요.
      </p>

      {alreadySame ? (
        <>
          <p
            className="badge"
            style={{ background: 'var(--mint-soft)', color: 'var(--mint)', marginBottom: 14 }}
          >
            ✓ 이미 연결되어 있어요
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/plan')}>
              📄 발명계획서로 가기
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              홈으로
            </button>
          </div>
        </>
      ) : (
        <button className="btn btn-primary btn-lg" onClick={confirm} disabled={joining}>
          {joining ? '⏳ 연결 중...' : '🏫 우리 반에 연결하기'}
        </button>
      )}
    </div>
  );
}
