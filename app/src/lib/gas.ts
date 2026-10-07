/**
 * Google Apps Script 연동
 * - 교사가 GAS 웹앱을 배포한 뒤 URL을 교사용 설정에 붙여넣으면
 *   학생 데이터(발명계획서 등)가 구글시트에 자동 기록됨
 * - CORS preflight 회피를 위해 Content-Type: text/plain 으로 전송
 */

export interface GasResult {
  ok: boolean;
  error?: string;
}

export const GAS_SCRIPT_TEMPLATE = `/**
 * 발명 도우미 - 구글시트 연동 스크립트
 * 1. Google Sheets에서 확장 프로그램 > Apps Script 열기
 * 2. 아래 코드 전체를 붙여넣기
 * 3. 배포 > 새 배포 > 유형: 웹앱
 *    - 실행: 나 / 액세스 권한: 모든 사용자
 * 4. 생성된 웹앱 URL을 발명 도우미 '교사용' 설정에 붙여넣기
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (body.classCode || 'CLASS') + '_' + (body.sheet || 'data');

    if (body.action === 'list') {
      var rows = [];
      var target = ss.getSheetByName(sheetName);
      if (target) {
        var data = target.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          rows.push({
            ts: String(data[i][0]), type: String(data[i][1]),
            studentId: String(data[i][2]), studentName: String(data[i][3]),
            className: String(data[i][4]), title: String(data[i][5]),
            payload: String(data[i][6])
          });
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, rows: rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['제출시각', '분류', '학번', '이름', '학급', '제목', '데이터(JSON)']);
    }
    sheet.appendRow([
      new Date(), body.type || '', body.studentId || '', body.studentName || '',
      body.className || '', body.title || '', JSON.stringify(body.payload || {})
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('발명 도우미 연동 준비 완료');
}`;

export async function gasPost(
  gasUrl: string,
  body: Record<string, unknown>,
  timeoutMs = 20000,
): Promise<GasResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    try {
      const data = JSON.parse(text) as GasResult;
      return data;
    } catch {
      return { ok: true }; // 일부 배포는 빈 응답을 반환
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message === 'The user aborted a request.' ? '시간 초과' : message };
  } finally {
    clearTimeout(timer);
  }
}

/** 시트에서 제출 기록 한 행 */
export interface GasSubmissionRow {
  ts: string;
  type: string;
  studentId: string;
  studentName: string;
  className: string;
  title: string;
  payload: string;
}

export interface GasListResult extends GasResult {
  rows?: GasSubmissionRow[];
}

/** 구글시트에서 제출 목록 가져오기 (sheet: 'data'=제출물, '오류신고'=오류 신고) */
export async function gasFetchSubmissions(
  gasUrl: string,
  classCode: string,
  sheet = 'data',
  timeoutMs = 30000,
): Promise<GasListResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'list', classCode, sheet }),
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    const data = JSON.parse(text) as GasListResult;
    return { ok: data.ok, rows: Array.isArray(data.rows) ? data.rows : [], error: data.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message === 'The user aborted a request.' ? '시간 초과' : message };
  } finally {
    clearTimeout(timer);
  }
}
