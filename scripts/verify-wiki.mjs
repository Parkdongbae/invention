// 한국어 위키백과 문서 존재 검증 → inventors.json에 wiki 필드 주입
// - 외국인: 한글 표기로 문서 타이틀 직접 조회(redirects 포함)
// - 동명이인 위험 인물은 후보 타이틀을 수동 지정하거나 제외(빈 배열 = 링크 생략)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'app', 'src', 'data', 'inventors.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 동명이인으로 오링크 위험이 있는 인물: 후보 타이틀 수동 지정 ([] = 의도적으로 링크 없음)
const CANDIDATES = {
  'Lee Sung-gi': ['이승기 (과학자)'],
  'Kim Dae-jung': ['김대중 (공학자)', '김대중 (보안 전문가)'],
  'Hong Gil-dong': [],
  'Kim Seok-jin': [],
  'Yoo Sang-chul': [],
  'Kim Jun-ho': [],
  'Han Sang-joon': [],
  'Park Jong-hwan': [],
  'Cho Hyun-sang': [],
  'Koo Bon-joon': [],
  'Park Soo-jin': [],
  'Park Hyeon-joo': ['박현주 (기업인)'],
  'Kim Ki-hoon': ['김기훈 (기업인)'],
  'Oh Se-jeong': ['오세정 (과학자)'],
  'Kim Beom-su': ['김범수 (기업인)'],
  'Kim Taek-jin': ['김택진 (기업인)', '김택진'],
  'Kim Jeong-ho': ['김정호 (지도 제작자)', '김정호'],
  'Edwin Land': ['에드윈 랜드', '에드윈 H. 랜드'],
  'André-Marie Ampère': ['앙드레마리 앙페르', '앙드레-마리 앙페르', '앙페르'],
  'Jan Ingenhousz': ['얀 인겐하우스', '얀 인겐호우스'],
  'Johann Gutenberg': ['요한 구텐베르크', '요하네스 구텐베르크'],
};

async function probe(titles) {
  const q = titles.map((t) => t.replace(/ /g, '_')).join('|');
  const url = `https://ko.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(q)}&redirects=1&format=json&formatversion=2`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'invention-helper-edu/1.0 (contact: teacher)' } });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 8000 * (attempt + 1);
      console.log(`  ⏳ 429 속도 제한 — ${Math.round(wait / 1000)}초 대기...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      await sleep(2000);
      continue;
    }
    const j = await res.json();
    const pages = j.query?.pages ?? [];
    return pages.find((p) => !p.missing)?.title ?? null;
  }
  return null;
}

const inventors = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let linked = 0;
let checked = 0;
for (const inv of inventors) {
  checked++;
  // 이미 검증된 인물은 유지(증분), CANDIDATES가 빈 배열로 지정된 경우는 의도적 제외
  if (inv.wiki) {
    linked++;
    continue;
  }
  const cands = CANDIDATES[inv.name] ?? (inv.nameKo ? [inv.nameKo] : []);
  let title = null;
  if (cands.length > 0) {
    title = await probe(cands);
    await sleep(700);
    if (title) inv.wiki = title;
  }
  if (title) linked++;
  if (checked % 10 === 0) console.log(`  ${checked}/${inventors.length} 처리... (현재 ${linked}명)`);
}

fs.writeFileSync(FILE, JSON.stringify(inventors), 'utf8');
console.log(`완료: ${inventors.length}명 중 위키 문서 확인 ${linked}명`);
console.log('--- 링크 목록 ---');
for (const inv of inventors) {
  if (inv.wiki) console.log(`${inv.flag} ${inv.nameKo || inv.name} → ${inv.wiki}`);
}
