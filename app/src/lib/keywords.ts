// 한국어 간이 키워드 추출: 조사 제거 + 불용어 필터
const JOSA =
  /(을|를|이|가|은|는|의|에|에서|에게|으로|로|와|과|도|만|부터|까지|보다|처럼|마다|조차|밖에|커녕|이나|나|이든|든|이라|라|이라도|라도|입니다|입니다|하다|되다)$/;

const STOPWORDS = new Set([
  '그리고','그런데','하지만','때문','위해','정말','너무','아주','많이','조금','가끔','자주','항상',
  '있는','없는','하는','되는','좋은','나쁜','큰','작은','새로운','오래된','이런','저런','무엇',
  '문제','불편','개선','발명','아이디어','사람','사용','것','수','때','경우','또','더','덜','다시',
  '장치','도구','물건','제품','용품','기구','도우미','기계',
  // 조사 제거 후 남기 어려운 한 글자 어간
  '많','같','빨','좋','없','있','몇','각','및','등','즉',
]);

export function extractKeywords(text: string, limit = 8): string[] {
  const tokens = text
    .replace(/[^\p{L}\p{N}\s·,]/gu, ' ')
    .split(/[\s·,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const result: string[] = [];
  for (const token of tokens) {
    let word = token;
    // 연속된 조사 제거 (최대 2회) — '문' 같은 한 글자 명사도 허용
    for (let i = 0; i < 2; i++) {
      const stripped = word.replace(JOSA, '');
      if (stripped !== word && stripped.length >= 1) word = stripped;
      else break;
    }
    // 한 글자 키워드는 조사가 떨어져 나온 경우('문이'→'문')만 허용
    if (word.length < 2 && word === token) continue;
    if (word.length < 1 || word.length > 12) continue;
    if (STOPWORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    if (!result.includes(word)) result.push(word);
    if (result.length >= limit) break;
  }
  return result;
}

/** 카테고리 → 추천 검색 키워드 매핑 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  student: ['학생', '교실'],
  disabled: ['장애인', '보조기구'],
  teacher: ['교사', '교구'],
  child: ['어린이', '유아'],
  pedestrian: ['보행자', '도로'],
  school_classroom: ['교실', '사물함'],
  home: ['주방', '욕실'],
  street_infra: ['도로', '배수로', '엘리베이터'],
  lab_science: ['실험기구'],
  safety: ['안전'],
  door_access: ['문', '잠금'],
  environment_waste: ['분리배출', '재활용'],
  daily_goods: ['생활용품'],
  health_sense: ['헬스케어'],
  others: [],
};

export function buildKeywordSet(base: string[], categories: string[]): string[] {
  const set = [...base];
  for (const c of categories) {
    for (const k of CATEGORY_KEYWORDS[c] ?? []) if (!set.includes(k)) set.push(k);
  }
  return set;
}
