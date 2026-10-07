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

export function buildJoinUrl(info: JoinInfo): string {
  return `${location.origin}${location.pathname}#/join?t=${encodeJoin(info)}`;
}
