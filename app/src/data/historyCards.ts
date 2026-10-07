import type { HistoryCard } from '../types';

// 역사 속 발명 카드 (카드게임용) — 발명 10계명 매칭 포함
export const HISTORY_CARDS: HistoryCard[] = [
  { id: 'h1', name: '우산', year: '기원전 11세기', inventor: '고대 중국', story: '비를 피하기 위해 만들어졌지만, 지금은 양산으로 햇빛도 막아요. 용도를 바꾼 발명의 대표 사례죠.', commandmentNos: [6], hint: '비도 막고 햇빛도 막아요' },
  { id: 'h2', name: '지퍼', year: '1913년', inventor: '기드온 선드백', story: '끈과 단추의 불편을 줄이기 위해 born했어요. 두 조각을 교대로 물리는 구조가 핵심이에요.', commandmentNos: [5, 4], hint: '옷을 딱딱 잡아 주는 이빨들' },
  { id: 'h3', name: '마스크 테이프', year: '1925년', inventor: '리처드 드류', story: '차 도색할 때 붙였다 떼는 테이프가 필요해서 만들어졌어요. 접착력을 "조금만" 남긴 게 포인트!', commandmentNos: [1, 9], hint: '붙였다 떼도 자국이 없어요' },
  { id: 'h4', name: '포스트잇', year: '1974년', inventor: '아서 플라이', story: '잘 안 붙는 실패한 접착제를 "살짝 붙는 메모지"로 재탄생시켰어요. 실패를 성공으로 바꾼 발명이죠.', commandmentNos: [6, 9], hint: '살짝 붙었다 잘 떨어지는 노란 종이' },
  { id: 'h5', name: '벨크로', year: '1941년', inventor: '조지 드 메스트랄', story: '산책 후 옷에 붙은 도꼬리 열매의 갈고리 구조를 관찰해 만들었어요. 자연에서 아이디어를 빌린 발명이에요.', commandmentNos: [4, 2], hint: '찌익 소리 나는 신발 끈' },
  { id: 'h6', name: '안전벨트', year: '1959년', inventor: '닐스 볼린', story: '사고 때 사람을 지키기 위해 Y자형 3점식 벨트를 고안했어요. 모양을 바꿔 안전을 만든 발명이에요.', commandmentNos: [5], hint: '승차 전 꼭 착! 하고 채우는 것' },
  { id: 'h7', name: '젓가락', year: '기원전 1200년', inventor: '고대 중국', story: '뜨거운 음식을 집기 위해 나뭇가지에서 시작됐어요. 가장 단순하고 오래된 도구 중 하나죠.', commandmentNos: [1], hint: '두 개면 충분해요' },
  { id: 'h8', name: '자전거', year: '1817년', inventor: '칼 폰 드라이스', story: '처음엔 페달 없이 발로 밀며 달렸어요. 페달과 체인이 "더해지면서" 지금의 자전거가 됐죠.', commandmentNos: [2], hint: '두 바퀴와 페달' },
  { id: 'h9', name: '정화조 손잡이 변기', year: '1775년', inventor: '알렉산더 커밍', story: 'S자 관으로 악취를 막는 수장(水封)을 발명했어요. 반대로 생각해 물로 막는 아이디어!', commandmentNos: [7], hint: '물이 고여 냄새를 막아요' },
  { id: 'h10', name: '슈퍼글루', year: '1942년', inventor: '해리 쿠버', story: '총기 조준경 재료 연구 중 끈끈이 나온 실패작! 나중에 "붙는 접착제"로 재발견됐어요.', commandmentNos: [6, 9], hint: '손가락이 붙어버린 경험 있나요?' },
  { id: 'h11', name: '전구', year: '1879년', inventor: '토머스 에디슨', story: '수천 가지 필라멘트 재료를 시험해 최적의 재료를 찾았어요. 재료 바꾸기의 끝판왕 발명이죠.', commandmentNos: [9], hint: '실이 아니라 타는 가느다란 선' },
  { id: 'h12', name: '장갑 씌운 청소기', year: '1907년', inventor: '제임스 스팽글러', story: '먼지를 빨아들이는 아이디어를 가방과 모터로 실현했어요. 여러 아이디어를 합친 발명이에요.', commandmentNos: [2, 4], hint: '먼지를 홀짝홀짝 빨아들여요' },
  { id: 'h13', name: '츄잉껌', year: '1892년', inventor: '윌리엄 리글리', story: '치약 재료로 쓰던 칠 소재를 "케우는 재미" 상품으로 용도를 바꿨어요.', commandmentNos: [6], hint: '케먹는 달콤한 조각' },
  { id: 'h14', name: '텀블러', year: '고대부터', inventor: '인류 공통', story: '종이컵 낭비를 줄이려는 요즘 텀블러 문화는 "빼기"의 발명 — 일회용을 없앤 거죠.', commandmentNos: [1, 10], hint: '내 컵을 들고 다녀요' },
  { id: 'h15', name: '삼각대 후방카메라', year: '현대', inventor: '자동차 회사들', story: '운전자의 사각지대 문제를 카메라로 해결했어요. 문제 인식이 발명의 시작임을 보여줘요.', commandmentNos: [2, 4], hint: '뒤모습이 화면에 나타나요' },
  { id: 'h16', name: '우산꽂이', year: '현대', inventor: '여러 발명가', story: '젖은 우산이 문제! 물을 받는 통과 탈수 구조를 "더해" 해결했어요.', commandmentNos: [2], hint: '현관에 서 있는 원통' },
  { id: 'h17', name: '회전문', year: '1888년', inventor: '판켄부쉬', story: '겨울에 찬바람이 들어오는 문제를 "돌아가는 문"으로 해결했어요. 모양을 완전히 바꾼 발명이죠.', commandmentNos: [5, 7], hint: '밀며 들어가는 문' },
  { id: 'h18', name: '후라이팬 국자', year: '현대', inventor: '주방용품 회사들', story: '기름을 덜어내는 국자에 "기름 잡는 홈"을 더한 발명. 건강 문제를 해결했어요.', commandmentNos: [2, 1], hint: '기름을 골라내는 홈' },
];

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
