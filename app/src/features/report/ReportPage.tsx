import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { gasPost } from '../../lib/gas';
import { Section, toast } from '../../components/ui';
import { uid } from '../../store/useAppStore';

const MENUS = [
  '홈',
  '문제 발견',
  '아이디어 공방',
  '수상작 탐구',
  'SDGs 탐구',
  '카드게임',
  '발명가 게임',
  '특허 검색',
  '발명 노트',
  '발명계획서',
  '내 발명가',
  '기타',
];

/** 오류 신고는 학급 구분 없이 공통 시트(공통_오류신고)에 기록한다 */
const REPORT_CODE = '공통';
const REPORT_SHEET = '오류신고';

export default function ReportPage() {
  const navigate = useNavigate();
  const teacher = useAppStore((s) => s.teacher);
  const plans = useAppStore((s) => s.plans);
  const enqueue = useAppStore((s) => s.enqueue);
  const markSubmissionStatus = useAppStore((s) => s.markSubmissionStatus);

  const lastPlan = plans[0];
  const [studentId, setStudentId] = useState(lastPlan?.studentId ?? '');
  const [studentName, setStudentName] = useState(lastPlan?.studentName ?? '');
  const [menu, setMenu] = useState(MENUS[0]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const connected = teacher.gasUrl.trim().length > 0;

  const submit = async () => {
    if (!studentId.trim() || !studentName.trim()) {
      toast('학번과 이름을 입력해 주세요!', '⚠️');
      return;
    }
    if (!content.trim()) {
      toast('어디가 어떻게 잘못되었는지 적어 주세요!', '✏️');
      return;
    }
    if (!connected) {
      toast('아직 우리 반에 연결되지 않았어요. 선생님께 초대 링크를 요청해 보세요!', '🔗');
      return;
    }
    const gasUrl = teacher.gasUrl.trim();
    const sub = {
      id: uid(),
      createdAt: Date.now(),
      type: 'report' as const,
      classCode: REPORT_CODE,
      studentId: studentId.trim(),
      studentName: studentName.trim(),
      className: '',
      title: `[오류 신고] ${menu}`,
      payload: { menu, content: content.trim() },
      status: 'pending' as const,
    };
    enqueue(sub);
    setSending(true);
    const res = await gasPost(gasUrl, {
      type: 'report',
      classCode: REPORT_CODE,
      sheet: REPORT_SHEET,
      studentId: sub.studentId,
      studentName: sub.studentName,
      className: '',
      title: sub.title,
      payload: sub.payload,
    });
    setSending(false);
    if (res.ok) {
      markSubmissionStatus(sub.id, 'sent');
      setSent(true);
      setContent('');
      toast('신고가 접수되었어요! 선생님께서 확인해 주실 거예요.', '📮');
    } else {
      markSubmissionStatus(sub.id, 'failed', res.error);
      toast(`전송 실패: ${res.error ?? '인터넷 연결을 확인하고 다시 시도해 주세요.'}`, '❌');
    }
  };

  return (
    <div>
      <Section
        title="🚨 오류 신고"
        sub="화면에서 잘못된 정보를 찾았나요? 어느 메뉴인지 알려주면 선생님이 고쳐 주세요!"
      >
        <div className="card" style={{ maxWidth: 560 }}>
          {sent && (
            <div
              className="card card-tight"
              style={{ background: 'var(--mint-soft)', borderColor: 'var(--mint)', marginBottom: 14 }}
            >
              ✅ 신고가 접수되었어요. 다른 오류를 또 신고할 수도 있어요.
            </div>
          )}

          <div className="grid grid-2">
            <div>
              <label className="field-label">학번</label>
              <input
                className="input"
                inputMode="numeric"
                maxLength={4}
                placeholder="예: 1101"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="field-label">이름</label>
              <input
                className="input"
                placeholder="예: 김발명"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="field-label">어느 화면인가요?</label>
            <div className="row-wrap">
              {MENUS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip ${menu === m ? 'selected' : ''}`}
                  onClick={() => setMenu(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="field-label">어떤 오류인가요?</label>
            <textarea
              className="textarea"
              placeholder="예: 수상작 탐구에서 발명가 이름의 한글 표기가 틀렸어요. / 점수 계산이 이상해요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary btn-lg" onClick={submit} disabled={sending}>
              {sending ? '⏳ 보내는 중...' : '📮 오류 신고하기'}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              홈으로
            </button>
          </div>

          {!connected && (
            <p className="tiny" style={{ marginTop: 10 }}>
              ※ 우리 반 연결 후에 전송할 수 있어요. (현재 연결 안 됨)
            </p>
          )}
          <p className="tiny" style={{ marginTop: 6 }}>
            신고 내용은 선생님의 구글시트 <strong>공통_오류신고</strong> 시트에 학번·이름과 함께 기록돼요.
          </p>
        </div>
      </Section>
    </div>
  );
}
