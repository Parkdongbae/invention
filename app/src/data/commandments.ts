// 발명 10계명 (invertion.md §6 + inven10.md 해석 반영)
export interface Commandment {
  no: number;
  title: string;
  description: string;
  icon: string;
  prompt: string; // 학생용 사고 유도 질문
}

export const COMMANDMENTS: Commandment[] = [
  {
    no: 1,
    title: '빼기도 훌륭한 발명이다.',
    description: '불필요하거나 해로운 것을 빼거나 줄이는 발명',
    icon: '➖',
    prompt: '이 물건에서 빼면 더 좋아질 것은 무엇일까요?',
  },
  {
    no: 2,
    title: '더하기도 발명이다.',
    description: '기존 물건에 새로운 기능을 더해 개선하는 발명',
    icon: '➕',
    prompt: '이 물건에 어떤 기능을 하나 더한다면 쓸모가 두 배가 될까요?',
  },
  {
    no: 3,
    title: '크게 하거나 작게 하는 것도 훌륭한 발명이다.',
    description: '크기·양·높이를 조절해 쓰임을 새롭게 만드는 발명',
    icon: '🔍',
    prompt: '크기를 키우거나 줄이면 어떤 문제가 해결될까요?',
  },
  {
    no: 4,
    title: '남의 아이디어를 빌리는 것도 훌륭한 발명이다.',
    description: '다른 분야의 원리·법칙·아이디어를 가져와 적용하는 발명',
    icon: '🤝',
    prompt: '다른 곳에서 쓰이는 원리를 여기에 빌려온다면?',
  },
  {
    no: 5,
    title: '모양을 바꿔 보자.',
    description: '모양·구조를 바꾸어 기능을 새롭게 만드는 발명',
    icon: '⭐',
    prompt: '생김새를 바꾸면 잡기 쉬워지거나 안전해질까요?',
  },
  {
    no: 6,
    title: '용도를 바꾸는 것도 훌륭한 발명이다.',
    description: '기존 사물을 다른 목적으로 활용하는 발명',
    icon: '🔄',
    prompt: '이 물건을 전혀 다른 용도로 쓸 수는 없을까요?',
  },
  {
    no: 7,
    title: '반대로 생각하는 것도 훌륭한 발명이다.',
    description: '상식을 뒤집어 반대 방향에서 해결책을 찾는 발명',
    icon: '↩️',
    prompt: '반대로 하면 어떻게 될까요? 안 열리는 문이라면?',
  },
  {
    no: 8,
    title: '불가능한 발명은 피하라!',
    description: '지금 기술과 재료로 만들 수 있는 현실적인 발명을 계획하라',
    icon: '🛑',
    prompt: '정말 만들 수 있을까요? 재료와 도구가 있는지 확인해 보세요.',
  },
  {
    no: 9,
    title: '재료를 바꿔 보는 것도 훌륭한 발명이다.',
    description: '재료를 바꾸어 성능·안전성을 개선하는 발명',
    icon: '🧱',
    prompt: '다른 재료로 바꾸면 더 튼튼하거나 안전해질까요?',
  },
  {
    no: 10,
    title: '폐품을 활용하는 것도 훌륭한 발명이다.',
    description: '버려지는 물건을 재활용해 가치를 만드는 발명',
    icon: '♻️',
    prompt: '버려지는 물건 중에 다시 쓸 수 있는 것이 있을까요?',
  },
];

export function commandment(no: number): Commandment {
  return COMMANDMENTS.find((c) => c.no === no) ?? COMMANDMENTS[0];
}
