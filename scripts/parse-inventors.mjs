// 발명가 데이터 파서: inventors_with_flags_education.md(119명) + inventors_detailed_10.md(심화 10인)
// → app/src/data/inventors.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const FIELD_KO = {
  'General Technology': '일반 기술',
  'Korea / Policy / Local': '한국 · 정책',
  'AI / Machine Learning': 'AI',
  'AI': 'AI',
  'Robotics': '로봇',
  'Robotics / AI': '로봇 · AI',
  'Robotics / Education': '로봇 · 교육',
  'Environmental / Energy': '환경 · 에너지',
  'Environmental / Activism': '환경 운동',
  'Biotechnology / Genetics': '바이오 · 유전자',
  'Biotechnology / CRISPR': '바이오 · CRISPR',
  'IT / Security': 'IT 보안',
  'IT / Software': 'IT 소프트웨어',
  'IT / Mobile': 'IT 모바일',
  'IT / Internet': 'IT 인터넷',
  'IT / Gaming': 'IT 게임',
  'IT / Portal': 'IT 포털',
  'IT / AI': 'IT · AI',
  'IT / Cloud': 'IT 클라우드',
  'IT / Startup': 'IT 스타트업',
  'IT / UX Design': 'IT UX 디자인',
  'Human-Computer Interaction': '사람·컴퓨터 상호작용',
  'Design / Usability': '디자인',
};

function fieldKo(field) {
  return FIELD_KO[field] ?? field;
}

// 원본에 한국어 표기가 없는 외국 발명가들의 표준 한글 표기
const NAME_KO = {
  'Thomas Edison': '토머스 에디슨',
  'Nikola Tesla': '니콜라 테슬라',
  'James Watt': '제임스 와트',
  'Alexander Graham Bell': '알렉산더 그레이엄 벨',
  'Guglielmo Marconi': '굴리엘모 마르코니',
  'Johannes Gutenberg': '요하네스 구텐베르크',
  'Louis Pasteur': '루이 파스퇴르',
  'Marie Curie': '마리 퀴리',
  'Benjamin Franklin': '벤저민 프랭클린',
  'Leonardo da Vinci': '레오나르도 다 빈치',
  'Isaac Newton': '아이작 뉴턴',
  'Michael Faraday': '마이클 패러데이',
  'Humphry Davy': '험프리 데이비',
  'Samuel Morse': '새뮤얼 모스',
  'Eli Whitney': '엘리 휘트니',
  'Robert Fulton': '로버트 풀턴',
  'George Stephenson': '조지 스티븐슨',
  'Karl Benz': '카를 벤츠',
  'Henry Ford': '헨리 포드',
  'Rudolf Diesel': '루돌프 디젤',
  'Enrico Fermi': '엔리코 페르미',
  'John Bardeen': '존 바딘',
  'William Shockley': '윌리엄 쇼클리',
  'Jack Kilby': '잭 킬비',
  'Tim Berners-Lee': '팀 버너스리',
  'Vint Cerf': '빈트 서프',
  'Alan Turing': '앨런 튜링',
  'John von Neumann': '존 폰 노이만',
  'Steve Jobs': '스티브 잡스',
  'Steve Wozniak': '스티브 워즈니악',
  'Bill Gates': '빌 게이츠',
  'Grace Hopper': '그레이스 호퍼',
  'Ada Lovelace': '에이다 러브레이스',
  'Hedy Lamarr': '헤디 라마르',
  'Philo Farnsworth': '필로 판즈워스',
  'John Logie Baird': '존 로지 베어드',
  'Konrad Zuse': '콘라트 추제',
  'Gottlieb Daimler': '고틀리프 다임러',
  'Wilhelm Röntgen': '빌헬름 뢴트겐',
  'Otto Hahn': '오토 한',
  'Fritz Zwicky': '프리츠 즈비키',
  'Alexander Fleming': '알렉산더 플레밍',
  'Jonas Salk': '조나스 소크',
  'Edward Jenner': '에드워드 제너',
  'Rene Laennec': '르네 라에넥',
  'Wilhelm Maybach': '빌헬름 마이바흐',
  'Joseph Swan': '조지프 스완',
  'Hans von Ohain': '한스 폰 오하인',
  'Frank Whittle': '프랭크 휘틀',
  'Igor Sikorsky': '이고르 시코르스키',
  'Alessandro Volta': '알레산드로 볼타',
  'André-Marie Ampère': '앙드레마리 앙페르',
  'Herman Hollerith': '허먼 홀러리스',
  'George Eastman': '조지 이스트먼',
  'Edwin Land': '에드윈 랜드',
  'Ray Dolby': '레이 돌비',
  'Masaru Ibuka': '이부카 마사루',
  'Akio Morita': '모리타 아키오',
  'Soichiro Honda': '혼다 소이치로',
  'Shigeo Shingo': '신고 시게오',
  'Charles Babbage': '찰스 배비지',
  'Johann Gutenberg': '요한 구텐베르크',
  'Rube Goldberg': '루브 골드버그',
  'OTL Aicher': '오틀 아이허',
  'Peter Molyneux': '피터 몰리뉴',
  'Linus Torvalds': '리누스 토르발스',
  'Ken Thompson': '켄 톰프슨',
  'Dennis Ritchie': '데니스 리치',
  'Guido van Rossum': '귀도 반 로섬',
  'James Gosling': '제임스 고슬링',
  'Mark Zuckerberg': '마크 저커버그',
  'Larry Page': '래리 페이지',
  'Sergey Brin': '세르게이 브린',
  'Jeff Bezos': '제프 베이조스',
  'Elon Musk': '일론 머스크',
  'James Dyson': '제임스 다이슨',
  'Norman Borlaug': '노먼 보로그',
  'Jan Ingenhousz': '얀 인겐하우스',
  'Joseph Lister': '조지프 리스터',
  'Niels Bohr': '닐스 보어',
  'Satoshi Nakamoto': '사토시 나카모토',
};

// 국기(Regional Indicator 2개) 또는 일반 이모지를 분리 — 다중 국기·구분자 잔재도 정리
function splitFlag(nm) {
  let s = nm.trim();
  const flags = [];
  s = s.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, (m) => {
    flags.push(m);
    return '';
  });
  if (flags.length === 0) {
    const m = s.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
    if (m) {
      flags.push(m[1]);
      s = m[2];
    }
  }
  s = s.replace(/^[\s/·,]+/, '').trim();
  return { flag: flags.join('') || '🌐', nation: s || nm.trim() };
}

function parseBig(file) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  const inventors = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    const head = line.match(/^## (\d+)\.\s*(.+)$/);
    if (head) {
      if (cur) inventors.push(cur);
      const full = head[2].trim();
      const ko = full.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      cur = {
        name: (ko ? ko[1] : full).trim(),
        nameKo: ko ? ko[2].trim() : '',
        field: '',
        flag: '',
        nation: '',
        education: '',
        life: '',
        birthYear: null,
        inventions: '',
        summary: '',
      };
      continue;
    }
    if (!cur) continue;
    let m;
    if ((m = line.match(/^- 분야:\s*(.+)$/))) cur.field = m[1].trim();
    else if ((m = line.match(/^- 국가:\s*(.+)$/))) {
      Object.assign(cur, splitFlag(m[1].trim()));
    } else if ((m = line.match(/^- 학력[^:]*:\s*(.+)$/))) {
      cur.education = m[1].replace(/^교육\s*배경:\s*/, '').trim();
    } else if ((m = line.match(/^- 생몰연도:\s*(.+)$/))) {
      cur.life = m[1].trim();
      const by = cur.life.match(/(\d{3,4})/);
      if (by) cur.birthYear = Number(by[1]);
    } else if ((m = line.match(/^- 주요 발명품\/업적:\s*(.+)$/))) {
      cur.inventions = m[1].trim();
    } else if ((m = line.match(/^- 약력 요약:\s*(.+)$/))) {
      cur.summary = m[1].trim();
    }
  }
  if (cur) inventors.push(cur);
  return inventors;
}

function parseDeep(file) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  const stories = new Map();
  let cur = null; // { name, nameKo, nation, flag, life, inventions, sections }
  let inStory = false;
  let secTitle = '';
  let secBody = [];

  const flushSection = () => {
    if (cur && secTitle) {
      const text = secBody.join(' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      if (text) cur.sections.push({ title: secTitle, text });
    }
    secTitle = '';
    secBody = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const head = line.match(/^## (\d+)\.\s*(.+)$/);
    if (head) {
      flushSection();
      if (cur) stories.set(cur.name.toLowerCase(), cur);
      const full = head[2].trim();
      const ko = full.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      cur = {
        name: (ko ? ko[1] : full).trim(),
        nameKo: ko ? ko[2].trim() : '',
        nation: '',
        flag: '',
        life: '',
        inventions: '',
        sections: [],
      };
      inStory = false;
      continue;
    }
    if (!cur) continue;
    let m;
    if ((m = line.match(/^-\s*국가:\s*(.+)$/))) {
      Object.assign(cur, splitFlag(m[1].trim()));
    } else if ((m = line.match(/^-\s*생몰연도:\s*(.+)$/))) {
      cur.life = m[1].trim();
    } else if ((m = line.match(/^-\s*주요 발명품\/업적:\s*(.+)$/))) {
      cur.inventions = m[1].trim();
    } else if (/^###\s+.*심화 스토리/.test(line)) {
      inStory = true;
      flushSection();
    } else if (inStory && /^#{1,6}\s/.test(line)) {
      flushSection();
    } else if (inStory) {
      const numbered = line.match(/^(\d+)\.\s+(.+)$/);
      if (numbered && line.startsWith(numbered[1] + '.')) {
        flushSection();
        secTitle = numbered[2].trim();
      } else if (secTitle && line.trim()) {
        secBody.push(line.trim());
      }
    }
  }
  flushSection();
  if (cur) stories.set(cur.name.toLowerCase(), cur);
  return stories;
}

// --- 메인 ---
const base = parseBig('inventors_with_flags_education.md');
const deep = parseDeep('inventors_detailed_10.md');

const inventors = base.map((inv, idx) => {
  const key = inv.name.toLowerCase();
  const d = deep.get(key);
  if (d) deep.delete(key);
  const nameKo = inv.nameKo || NAME_KO[inv.name] || d?.nameKo || '';
  return {
    id: `inv-${String(idx + 1).padStart(3, '0')}`,
    ...inv,
    nameKo,
    fieldKo: fieldKo(inv.field),
    isKorean: /대한민국|조선/.test(inv.nation),
    story: d
      ? {
          nation: d.nation,
          flag: d.flag,
          life: d.life,
          inventions: d.inventions,
          sections: d.sections,
        }
      : undefined,
  };
});

if (deep.size > 0) {
  console.warn('⚠️ 심화 스토리 매칭 실패:', [...deep.keys()].join(', '));
}

const stats = {
  total: inventors.length,
  korean: inventors.filter((v) => v.isKorean).length,
  withStory: inventors.filter((v) => v.story).length,
  byNation: {},
  byField: {},
};
for (const v of inventors) {
  const nat = `${v.flag} ${v.nation}`;
  stats.byNation[nat] = (stats.byNation[nat] ?? 0) + 1;
  stats.byField[v.fieldKo] = (stats.byField[v.fieldKo] ?? 0) + 1;
}

const outDir = path.join(ROOT, 'app', 'src', 'data');
fs.writeFileSync(path.join(outDir, 'inventors.json'), JSON.stringify(inventors), 'utf8');
fs.writeFileSync(path.join(outDir, 'inventorStats.json'), JSON.stringify(stats, null, 2), 'utf8');

console.log(`완료: ${inventors.length}명 (한국 ${stats.korean}, 심화 스토리 ${stats.withStory})`);
console.log('국가 상위:', Object.entries(stats.byNation).sort((a, b) => b[1] - a[1]).slice(0, 8));
console.log('심화 섹션 샘플:', JSON.stringify(inventors.find((v) => v.story)?.story.sections.map((s) => s.title)));
const ko = fs.statSync(path.join(outDir, 'inventors.json')).size;
console.log('JSON 크기:', (ko / 1024).toFixed(0) + 'KB');
