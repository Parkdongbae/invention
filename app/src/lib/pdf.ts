import type { PlanEntry } from '../types';

const PLAN_URL = import.meta.env.BASE_URL ?? './';

/**
 * 발명계획서 PDF 내보내기
 * - html2canvas로 DOM을 캔버스에 렌더링 → jsPDF로 A4 다중 페이지 구성
 * - 한글 폰트 임베딩 문제를 우회하기 위해 캔버스 방식 사용
 * - 파일명 규칙: 학번이름_발명계획서.pdf
 */
export async function exportPlanToPdf(plan: PlanEntry): Promise<void> {
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  holder.style.top = '0';
  holder.style.width = '794px'; // A4 @96dpi
  holder.appendChild(renderPlanDocument(plan));
  document.body.appendChild(holder);

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(holder.firstElementChild as HTMLElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // 캔버스를 페이지 높이 단위로 분할
    const pageCanvasH = (canvas.width * pageH) / pageW;
    let rendered = 0;
    let pageIndex = 0;
    while (rendered < canvas.height) {
      const sliceH = Math.min(pageCanvasH, canvas.height - rendered);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext('2d');
      if (!ctx) throw new Error('canvas 2d context unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, (sliceH * imgW) / canvas.width);
      rendered += sliceH;
      pageIndex++;
    }
    if (imgH === 0) throw new Error('empty document');

    const filename = `${plan.studentId}${plan.studentName || ''}_발명계획서.pdf`;
    pdf.save(filename);
  } finally {
    holder.remove();
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string): string {
  return `<tr><th>${esc(label)}</th><td>${esc(value).replace(/\n/g, '<br/>')}</td></tr>`;
}

export function renderPlanDocument(plan: PlanEntry): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `
  <div style="font-family:Pretendard,'Malgun Gothic',sans-serif;color:#111;padding:48px 56px;background:#fff;">
    <div style="text-align:center;border-bottom:3px solid #1f2430;padding-bottom:16px;margin-bottom:24px;">
      <div style="font-size:13px;letter-spacing:4px;color:#666;">중학교 기술·가정 발명 수업</div>
      <div style="font-size:26px;font-weight:800;margin-top:6px;">발 명 계 획 서</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <tr>
        <th style="border:1px solid #999;background:#f3f4f6;padding:8px;width:16%;">학번</th>
        <td style="border:1px solid #999;padding:8px;width:17%;">${esc(plan.studentId)}</td>
        <th style="border:1px solid #999;background:#f3f4f6;padding:8px;width:16%;">이름</th>
        <td style="border:1px solid #999;padding:8px;width:17%;">${esc(plan.studentName)}</td>
        <th style="border:1px solid #999;background:#f3f4f6;padding:8px;width:16%;">학급</th>
        <td style="border:1px solid #999;padding:8px;">${esc(plan.className)}</td>
      </tr>
    </table>
    <div style="border:2px solid #4F46E5;background:#EEF2FF;padding:12px 16px;font-size:16px;font-weight:700;margin-bottom:20px;">
      발명 제목 : ${esc(plan.inventionTitle || '(제목을 입력하세요)')}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${row('발명 목적', plan.purpose)}
      ${row('누구를 위해 (WHO)', plan.who)}
      ${row('어디서 (WHERE)', plan.where)}
      ${row('문제 상황', plan.problemSituation)}
      ${row('왜 필요한가 (WHY)', plan.why)}
      ${row('아이디어 요약', plan.ideaSummary)}
      ${row('작동 원리 · 구조', plan.mechanismDescription)}
      ${row('재료 및 도구', plan.materialsTools)}
      ${row('사용 시나리오', plan.usageScenario)}
      ${row('제작 계획 단계', plan.planSteps.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n'))}
      ${row('예상 일정', plan.expectedSchedule)}
      ${row('기대 효과', plan.expectedEffects)}
      ${row('평가 계획', plan.evaluationPlan)}
      ${row('학생 소감', plan.studentReflection)}
    </table>
    <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:11px;color:#888;">작성일: ${new Date(plan.updatedAt || plan.createdAt).toLocaleDateString('ko-KR')} · 발명 도우미 웹앱</div>
      <div style="width:86px;height:86px;border:3px double #B45309;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#B45309;font-weight:800;font-size:12px;transform:rotate(-8deg);">
        <span style="font-size:22px;">✔</span>
        <span>발명가 인증</span>
      </div>
    </div>
  </div>`;
  return el;
}

/** PDF용 문서 미리보기 이미지 URL (선택) */
export { PLAN_URL };
