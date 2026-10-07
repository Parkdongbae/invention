// SDGs 미니 학습 카드 (invertion.md §4)
export interface SdgsCard {
  code: string;
  no: number;
  title: string;
  color: string;
  icon: string;
  shortDescription: string;
  exampleTopics: string[];
  /** 문제 발견 네비게이터에서 연결되는 카테고리 힌트 */
  relatedWhats: string[];
}

export const SDGS_CARDS: SdgsCard[] = [
  {
    code: 'SDG6',
    no: 6,
    title: '깨끗한 물과 위생',
    color: '#26BDE2',
    icon: '💧',
    shortDescription:
      '모든 사람이 깨끗한 물을 쓰고 위생적으로 생활할 수 있게 하는 목표예요. 물 낭비를 줄이고 물을 깨끗하게 유지하는 발명이 필요해요.',
    exampleTopics: ['물 절약 샤워기', '빗물 모으는 화분받이', '손 씻기 습관 도우미', '정수 필터 알림기'],
    relatedWhats: ['environment_waste', 'health_sense'],
  },
  {
    code: 'SDG7',
    no: 7,
    title: '깨끗한 에너지',
    color: '#FCC30B',
    icon: '⚡',
    shortDescription:
      '모두가 깨끗하고 안전한 에너지를 쓸 수 있게 하는 목표예요. 태양빛, 바람 같은 자연 에너지를 활용한 발명을 생각해 볼 수 있어요.',
    exampleTopics: ['태양광 자전거 라이트', '손 흔들면 켜지는 선풍기', '운동 에너지 충전기', '빛으로 도는 장난감'],
    relatedWhats: ['environment_waste'],
  },
  {
    code: 'SDG11',
    no: 11,
    title: '지속가능한 도시와 공동체',
    color: '#FD9D24',
    icon: '🏙️',
    shortDescription:
      '모두가 안전하고 살기 좋은 마을에서 살게 하는 목표예요. 도로, 엘리베이터, 버스 같은 생활 시설의 안전 문제를 발명으로 해결해 볼 수 있어요.',
    exampleTopics: ['침수 예방 배수로 덮개', '교차로 바닥 신호등', '버스 안전 손잡이', '엘리베이터 갇힘 방지 장치'],
    relatedWhats: ['safety', 'door_access'],
  },
  {
    code: 'SDG12',
    no: 12,
    title: '책임 있는 소비와 생산',
    color: '#BF8B2E',
    icon: '🛒',
    shortDescription:
      '물건을 만들고 쓰는 과정에서 자원 낭비와 오염을 줄이고, 오래 사용할 수 있도록 하는 목표예요.',
    exampleTopics: ['분리배출 도우미 쓰레기통', '재사용·재활용 용기', '기름잡는 국자', '낭비 없는 물티슈'],
    relatedWhats: ['environment_waste', 'daily_goods'],
  },
  {
    code: 'SDG13',
    no: 13,
    title: '기후 행동',
    color: '#3F7E44',
    icon: '🌏',
    shortDescription:
      '지구 온난화 같은 기후 변화에 대응하는 목표예요. 폭우, 폭염 같은 이상 기후에 대비하는 발명이 필요해요.',
    exampleTopics: ['홍수 예방 배수로 덮개', '빗물받이 덮개', '폭염 알림 모자', '빗물 재활용 화분'],
    relatedWhats: ['environment_waste'],
  },
  {
    code: 'SDG14',
    no: 14,
    title: '해양 생태계 보존',
    color: '#0A97D9',
    icon: '🐠',
    shortDescription:
      '바다를 깨끗하게 지키고 바다 생물을 보호하는 목표예요. 바다 쓰레기와 어민의 어려움을 해결하는 발명을 생각해 볼 수 있어요.',
    exampleTopics: ['해양 쓰레기 수거 장치', '스스로 떠오르는 통발', '해안가 쓰레기 분리통', '어류 먹이 자동배합기'],
    relatedWhats: ['environment_waste'],
  },
  {
    code: 'SDG15',
    no: 15,
    title: '육상 생태계 보존',
    color: '#56C02B',
    icon: '🌳',
    shortDescription:
      '숲과 땅의 생물을 보호하는 목표예요. 농사, 산림, 토양을 지키는 발명을 생각해 볼 수 있어요.',
    exampleTopics: ['감귤 수확 가위', '식물지지대', '친환경 인공토양', '야생동물 안전 도로 표지'],
    relatedWhats: ['environment_waste'],
  },
];

export function sdgsCard(code: string): SdgsCard | undefined {
  return SDGS_CARDS.find((c) => c.code === code);
}
