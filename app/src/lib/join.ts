// 교사 → 학생 반 연결 초대 토큰 (GAS URL·학급정보를 짧은 base64url로 인코딩)
export interface JoinInfo {
  gasUrl: string;
  classCode: string;
  className: string;
}

export function encodeJoin(info: JoinInfo): string {
  const bytes = new TextEncoder().encode(JSON.stringify(info));
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeJoin(token: string): JoinInfo | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const gasUrl = typeof o.gasUrl === 'string' ? o.gasUrl : '';
    if (!gasUrl.startsWith('http')) return null;
    return {
      gasUrl,
      classCode: typeof o.classCode === 'string' ? o.classCode : '',
      className: typeof o.className === 'string' ? o.className : '',
    };
  } catch {
    return null;
  }
}

export function buildJoinUrl(info: JoinInfo, baseUrl?: string): string {
  const token = encodeJoin(info);
  const base = normalizePublicBase(baseUrl);
  if (base) return `${base}#/join?t=${token}`;
  return `${location.origin}${location.pathname}#/join?t=${token}`;
}

/** 학생 접속 주소 끝의 슬래시를 정리 (없으면 null → 현재 브라우저 주소 사용) */
export function normalizePublicBase(baseUrl?: string): string | null {
  const trimmed = (baseUrl ?? '').trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, '') + '/';
}

/** 현재 브라우저 주소가 이 기기(127.0.0.1·localhost)만 열리는 주소인지 판정 */
export function isLoopbackLocation(): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}
