// SCAMPER 확산적 사고 카드 (invertion.md §2-2, §8-3 아이디어 스파크)
export interface ScamperCard {
  key: string;
  korean: string;
  icon: string;
  question: string;
  examples: string[];
}

export const SCAMPER_CARDS: ScamperCard[] = [
  {
    key: 'S',
    korean: '대체하기 (Substitute)',
    icon: '🔁',
    question: '재료나 부품을 다른 것으로 바꾸면 어떨까요?',
    examples: ['플라스틱 → 종이', '버튼 → 터치', '고무줄 → 자석'],
  },
  {
    key: 'C',
    korean: '합치기 (Combine)',
    icon: '🧩',
    question: '두 가지를 하나로 합치면 편리할까요?',
    examples: ['우산 + 손전등', '물병 + 컵', '가방 + 김장갑'],
  },
  {
    key: 'A',
    korean: '응용하기 (Adapt)',
    icon: '🤝',
    question: '다른 곳에서 쓰이는 아이디어를 빌려올 수 없을까요?',
    examples: ['지렛대 원리 → 배수로 덮개', '벨크로 → 신발', '날개 구조 → 우산'],
  },
  {
    key: 'M',
    korean: '크기 바꾸기 (Modify/Magnify)',
    icon: '🔍',
    question: '크게, 작게, 길게, 짧게 바꾸면 어떨까요?',
    examples: ['더 큰 손잡이', '더 가벼운 재료', '접히는 구조'],
  },
  {
    key: 'P',
    korean: '다른 용도 (Put to other use)',
    icon: '🔄',
    question: '이 물건을 다르게 사용할 수는 없을까요?',
    examples: ['버린 페트병 → 화분', '텀블러 → 연필꽂이', '우산 천 → 가방'],
  },
  {
    key: 'E',
    korean: '없애기 (Eliminate)',
    icon: '➖',
    question: '빼도 되는 부분은 없을까요?',
    examples: ['뚜껑 없는 쓰레기통', '끈 없는 가방', '소음 줄이기'],
  },
  {
    key: 'R',
    korean: '뒤집기 (Reverse/Rearrange)',
    icon: '↩️',
    question: '순서나 방향을 반대로 하면 어떨까요?',
    examples: ['여는 문 → 밀어서 닫는 문', '위에서 아래로 → 아래에서 위로'],
  },
];

export function randomScamper(): ScamperCard {
  return SCAMPER_CARDS[Math.floor(Math.random() * SCAMPER_CARDS.length)];
}
