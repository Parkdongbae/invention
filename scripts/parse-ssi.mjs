// SSI 수상작 데이터 파서: inven10.md + 5w1h.md → app/src/data/ssiAwards.json
// - 두 파일은 동일한 순서(1,202개 헤더)를 가지므로 인덱스 기반 머지
// - HTML 엔티티 정제, 다중 공백 축소
// - WHO/WHERE/WHAT 카테고리 자동 태깅 (invertion.md 카테고리 체계)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function decodeEntities(input) {
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ldquo;/gi, '\u201C')
    .replace(/&rdquo;/gi, '\u201D')
    .replace(/&lsquo;/gi, '\u2018')
    .replace(/&rsquo;/gi, '\u2019')
    .replace(/&middot;/gi, '·')
    .replace(/&hellip;/gi, '…')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFile(file) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  const entries = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) {
      if (current) entries.push(current);
      current = { header: decodeEntities(line.slice(3)), body: [] };
    } else if (current && line.trim()) {
      current.body.push(line.trim().replace(/^[-*]\s+/, ''));
    }
  }
  if (current) entries.push(current);
  return entries;
}

// 헤더: "{year}년 {award} – {title} ({school...} {name...})"
function parseHeader(header) {
  const dash = header.indexOf('–');
  const left = header.slice(0, dash).trim();
  const right = header.slice(dash + 1).trim();
  const year = Number(left.match(/(\d{4})년/)[1]);
  const award = left.replace(/^\d{4}년\s*/, '').trim();
  const paren = right.match(/^(.*)\s*\(([^()]*)\)\s*$/);
  let title = paren ? paren[1].trim() : right;
  let tail = paren ? paren[2].trim() : '';
  return { year, award, title, tail };
}

// (학교 이름) / (학생 지도교사) / (이름 수상명) 세 가지 테일 패턴 처리
const AWARDS_SET = ['대통령상', '국무총리상', '최우수상', '특상', '우수상', '장려상', '동상'];
function splitTail(tail) {
  // 패턴 B: "(이름 수상명)" → 제목 자리가 학교명, 실제 제목 없음
  const b = tail.match(/^(.+?)\s+(대통령상|국무총리상|최우수상|특상|우수상|장려상|동상)$/);
  if (b) return { school: '', student: b[1].trim(), teacher: '', titleMissing: true };
  const m = tail.match(/^(.+?(?:교육대학교부설초등학교|대학교사범대학부설초등학교|대학교교육대학부설초등학교|부설초등학교|부설중학교|부설고등학교|[가-힣]*학교))\s+(.+)$/);
  if (m) return { school: m[1].trim(), student: m[2].trim(), teacher: '', titleMissing: false };
  // 패턴 A: "(학생이름 지도교사이름)" — 학교 정보 없음 (주로 2019)
  const parts = tail.split(' ').filter(Boolean);
  if (parts.length === 2) return { school: '', student: parts[0].trim(), teacher: parts[1].trim(), titleMissing: false };
  return { school: parts.slice(0, -1).join(' ').trim(), student: parts.at(-1)?.trim() ?? '', teacher: '', titleMissing: false };
}

const CMD_RE = /^(\d+)\.\s*(.+)$/;
const INTERP_RE = /^해석:\s*(.+)$/;

function parseCommandments(body) {
  const numLine = body.find((l) => l.startsWith('적용된 발명 10계명 번호:'));
  if (!numLine) return [];
  const nos = numLine.replace('적용된 발명 10계명 번호:', '').split(',').map((s) => Number(s.trim()));
  const titles = [];
  const interps = [];
  for (const l of body) {
    const t = l.match(/^(\d+)\.\s*(.+)$/);
    if (t) titles.push({ no: Number(t[1]), title: t[2].trim() });
    const i = l.match(INTERP_RE);
    if (i) interps.push(i[1].trim());
  }
  return nos.map((no, idx) => {
    const found = titles.find((t) => t.no === no);
    return {
      no,
      title: found ? found.title : `${no}번 계명`,
      interpretation: interps[idx] ?? interps[0] ?? '',
    };
  });
}

function parse5W1H(body) {
  const get = (key) => {
    const re = new RegExp(`^${key}[(（][^)）]*[?？][)）]\\s*[:：]\\s*(.*)$`);
    const line = body.find((l) => re.test(l));
    if (!line) return '';
    return line.match(re)[1].trim();
  };
  return {
    who: get('WHO'),
    when: get('WHEN'),
    where: get('WHERE'),
    what: get('WHAT'),
    why: get('WHY'),
    how: get('HOW'),
  };
}

// --- WHO/WHERE/WHAT 카테고리 자동 태깅 ---
const WHO_RULES = [
  ['disabled', /장애|휠체어|시각장애|청각|점자|보행이 어렵|거동이 불편|몸이 불편/],
  ['teacher', /교사|선생님|지도/],
  ['child', /어린이|유아|아기|영유아|아이들/],
  ['pedestrian', /보행자|횡단보도|길을 걷|도로를 걷|지나가는 사람/],
  ['student', /학생|학습|수업|공부|숙제|책가방/],
];
const WHERE_RULES = [
  ['school_classroom', /학교|교실|사물함|책상|칠판|복도|매점|운동장|급식/],
  ['home', /집|가정|주방|부엌|욕실|화장실|현관|거실|침실|싱크대|안방|베란다/],
  ['street_infra', /길|도로|횡단보도|맨홀|배수로|엘리베이터|지하철|버스|주차|지하차도|교차로|아파트|건물|계단|소방|대피|터널|다리/],
  ['lab_science', /실험실|과학실|실험|화학|물리|기구/],
];
const WHAT_RULES = [
  ['safety', /안전|사고|화재|지진|충돌|낙하|넘어짐|미끄러|부상|탈출|소화|재해|재난|감전|추락|침수|홍수|화상|찔|베이는|막힘/],
  ['door_access', /출입|도어|잠금|손잡이|개폐|문틈|문밑|문짝|문고리|자동문|회전문|철문|방화문|화장실 문|\s문(\s|$|,|·)/],
  ['environment_waste', /쓰레기|분리|배수|홍수|침수|재활용|재사용|업사이클|플라스틱|에너지|태양광|빗물|친환경|오염|자연분해|기후|탄소|수거/],
  ['daily_goods', /우산|휴지|물티슈|샤워|국자|컵|텀블러|볼펜|연필|가방|신발|수납|정리|옷|물감|도시락|젓가락|스마트폰|이어폰|멀티탭|밴드|양말|모자|시계|안경|돗자리|우유|병|캔|바구니|밀대|걸레|수세미|도마|키보드|마우스/],
  ['health_sense', /건강|헬스|복약|혈당|점자|인공와우|감각|자세|교정|스트레칭|운동|병원|환자|알레르기|질병|소독|위생/],
];

function tag(text, rules) {
  const tags = [];
  for (const [id, re] of rules) if (re.test(text)) tags.push(id);
  return tags.length ? tags : ['others'];
}

// 템플릿 문구(분석 실패 엔트리의 기본값)는 태깅에서 제외
const TEMPLATE_RE = /해당 발명품을 사용하는 학생 또는 일반 사용자|작품 제목에서 암시하는 불편이나 위험|발명품 사용 환경|발명품을 사용할 때|발명품을 사용하는 학생|일반 사용자/g;

// --- 메인 ---
const ten = parseFile('inven10.md');
const five = parseFile('5w1h.md');
if (ten.length !== five.length) {
  console.error(`헤더 수 불일치: inven10=${ten.length}, 5w1h=${five.length}`);
  process.exit(1);
}

// 명세서에서 확인된 특수 케이스 (인천과학고 대통령상 — 헤더에 제목 누락)
const SPECIAL = new Map([
  ['2019-001|작품명', null], // 플레이스홀더 (아래에서 처리)
]);
const knownFirst = { title: '지진발생시 자동 탈출 가능한 이중 문', school: '인천과학고등학교', student: '이정민' };

const awards = [];
const dropped = [];
ten.forEach((e10, i) => {
  const e5 = five[i];
  if (e10.header !== e5.header) {
    console.error(`순서 불일치 ${i}: [${e10.header}] vs [${e5.header}]`);
    process.exit(1);
  }
  const { year, award, title, tail } = parseHeader(e10.header);
  // 표 헤더 아티팩트 제거 (수상 이름이 아닌 것 / 플레이스홀더)
  const VALID_AWARDS = ['대통령상', '국무총리상', '최우수상', '특상', '우수상', '장려상', '동상', '수상'];
  const junk =
    !VALID_AWARDS.includes(award) ||
    title === '분 야' ||
    title === '작품명' ||
    /지도교사|수상자/.test(tail);
  if (junk) {
    dropped.push(e10.header);
    return;
  }
  let school, student, teacher, finalTitle = title, titleMissing = false;
  if (i === 0 && /학교$/.test(title)) {
    finalTitle = knownFirst.title;
    school = knownFirst.school;
    student = knownFirst.student;
    teacher = '';
  } else {
    const sp = splitTail(tail);
    school = sp.school;
    student = sp.student;
    teacher = sp.teacher;
    titleMissing = sp.titleMissing;
    if (titleMissing) {
      school = title; // 제목 자리에 학교명이 온 경우
      finalTitle = '(제목 미상)';
    }
  }
  const w5 = parse5W1H(e5.body);
  const hay = `${finalTitle} ${w5.who} ${w5.where} ${w5.what}`.replace(TEMPLATE_RE, ' ');
  awards.push({
    id: `${year}-${String(awards.filter((a) => a.year === year).length + 1).padStart(3, '0')}`,
    year,
    award,
    title: finalTitle,
    titleMissing,
    school,
    student,
    teacher: teacher || undefined,
    commandments: parseCommandments(e10.body),
    fiveW1H: w5,
    tags: {
      who: tag(hay, WHO_RULES),
      where: tag(hay, WHERE_RULES),
      what: tag(hay, WHAT_RULES),
    },
  });
});

// 통계
const stat = (key) => {
  const m = {};
  for (const a of awards) m[a[key]] = (m[a[key]] ?? 0) + 1;
  return m;
};
const tagStat = (dim) => {
  const m = {};
  for (const a of awards) for (const t of a.tags[dim]) m[t] = (m[t] ?? 0) + 1;
  return m;
};
const stats = {
  total: awards.length,
  byYear: stat('year'),
  byAward: stat('award'),
  who: tagStat('who'),
  where: tagStat('where'),
  what: tagStat('what'),
};

const outDir = path.join(ROOT, 'app', 'src', 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'ssiAwards.json'), JSON.stringify(awards), 'utf8');
fs.writeFileSync(path.join(outDir, 'ssiStats.json'), JSON.stringify(stats, null, 2), 'utf8');

console.log(`완료: ${awards.length}작 저장 (제외 ${dropped.length}건)`);
for (const d of dropped) console.log(`  제외: ${d}`);
console.log('연도별:', JSON.stringify(stats.byYear));
console.log('수상별:', JSON.stringify(stats.byAward));
console.log('WHO:', JSON.stringify(stats.who));
console.log('WHERE:', JSON.stringify(stats.where));
console.log('WHAT:', JSON.stringify(stats.what));
console.log('10계명 매핑 건수:', awards.filter((a) => a.commandments.length > 0).length);
console.log('5W1H 완성 건수:', awards.filter((a) => a.fiveW1H.who && a.fiveW1H.how).length);
