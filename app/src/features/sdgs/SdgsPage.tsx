import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { SDGS_CARDS } from '../../data/sdgs';
import { SSI_AWARDS, awardColor, awardRank } from '../../data/ssi';
import { stampById } from '../../lib/level';
import { Modal, Section, toast } from '../../components/ui';

export default function SdgsPage() {
  const navigate = useNavigate();
  const markSdgsExplored = useAppStore((s) => s.markSdgsExplored);
  const earnStamp = useAppStore((s) => s.earnStamp);

  const [openCode, setOpenCode] = useState<string | null>(null);
  const card = SDGS_CARDS.find((c) => c.code === openCode);

  // 최초 방문 시 탐구 완료 처리 + 도장
  useEffect(() => {
    markSdgsExplored();
    if (earnStamp('sdgs_explored')) {
      toast(`도장 획득: ${stampById('sdgs_explored').name}`, '🏅');
    }
  }, [markSdgsExplored, earnStamp]);

  const related = useMemo(() => {
    if (!card) return [];
    return SSI_AWARDS.filter((a) => a.tags.what.some((w) => card.relatedWhats.includes(w)))
      .sort((x, y) => awardRank(x.award) - awardRank(y.award) || y.year - x.year)
      .slice(0, 6);
  }, [card]);

  return (
    <div>
      <h1 className="section-title">🌏 SDGs 탐구</h1>
      <p className="section-sub">내가 발견한 문제와 연결된 지구 목표를 살펴봐요!</p>

      <Section title="🌏 지구를 지키는 7가지 목표" sub="카드를 누르면 자세한 설명과 관련 수상작이 나와요!">
        <div className="grid grid-4">
          {SDGS_CARDS.map((c) => (
            <div
              key={c.code}
              className="card card-tight"
              style={{ cursor: 'pointer', borderTop: `4px solid ${c.color}` }}
              onClick={() => setOpenCode(c.code)}
            >
              <div style={{ fontSize: 30, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ marginBottom: 6 }}>
                <span className="badge" style={{ background: c.color, color: '#fff' }}>
                  {c.code}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{c.title}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="card center">
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          🚀 SDGs와 관련된 문제를 발견하고 싶다면?
        </div>
        <p className="muted" style={{ marginBottom: 14 }}>
          문제 발견 네비게이터에서 문제를 고르면 관련 SDGs 목표를 추천해 줘요!
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/discover')}>
          🔎 SDGs 관련 문제 발견하러 가기
        </button>
      </div>

      <Modal
        open={card !== undefined}
        onClose={() => setOpenCode(null)}
        title={card ? `${card.icon} ${card.title}` : undefined}
        wide
      >
        {card && (
          <div className="col" style={{ gap: 16 }}>
            <div>
              <span className="badge" style={{ background: card.color, color: '#fff' }}>
                {card.code}
              </span>
            </div>
            <p style={{ fontSize: 14.5 }}>{card.shortDescription}</p>
            <div>
              <div className="field-label">💡 이런 발명을 생각해 볼 수 있어요</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {card.exampleTopics.map((t) => (
                  <li key={t} style={{ fontSize: 13.5, marginBottom: 2 }}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="field-label">🏆 이 목표와 관련된 실제 수상작</div>
              {related.length === 0 ? (
                <p className="tiny">관련 수상작이 아직 없어요.</p>
              ) : (
                <div className="col">
                  {related.map((a) => (
                    <div
                      key={a.id}
                      className="row"
                      style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 12px' }}
                    >
                      <span className="badge" style={{ background: awardColor(a.award), color: '#fff' }}>
                        {a.award}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</span>
                      <span className="tiny">({a.year})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-lg" style={{ width: '100%' }} onClick={() => setOpenCode(null)}>
              닫기
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
