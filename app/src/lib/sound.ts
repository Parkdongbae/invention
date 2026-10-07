// WebAudio 신디사이저 효과음 — 오디오 파일 없이 톤을 합성 (오프라인 동작)
// 스토어에 의존하지 않고 setSoundEnabled로만 음소거 상태를 동기화받는다 (순환 참조 방지)
type SfxName =
  | 'blip'
  | 'success'
  | 'oops'
  | 'stamp'
  | 'levelup'
  | 'correct'
  | 'wrong'
  | 'spark'
  | 'click';

let enabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'sine',
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function sweep(c: AudioContext, from: number, to: number, dur: number, vol: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t0 = c.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.04);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.06);
}

export function playSfx(name: SfxName): void {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  switch (name) {
    case 'blip':
      tone(c, 740, 0, 0.08, 0.05, 'triangle');
      break;
    case 'success':
      tone(c, 659, 0, 0.1, 0.07);
      tone(c, 880, 0.08, 0.16, 0.07);
      break;
    case 'oops':
      tone(c, 240, 0, 0.13, 0.06, 'triangle');
      break;
    case 'stamp':
      tone(c, 523, 0, 0.22, 0.08);
      tone(c, 659, 0.07, 0.22, 0.08);
      tone(c, 784, 0.14, 0.3, 0.08);
      break;
    case 'levelup':
      tone(c, 523, 0, 0.24, 0.08);
      tone(c, 659, 0.09, 0.24, 0.08);
      tone(c, 784, 0.18, 0.24, 0.08);
      tone(c, 1047, 0.27, 0.4, 0.09);
      break;
    case 'correct':
      tone(c, 880, 0, 0.09, 0.09, 'triangle');
      tone(c, 1175, 0.07, 0.2, 0.09);
      break;
    case 'wrong':
      tone(c, 196, 0, 0.16, 0.07, 'square');
      tone(c, 147, 0.1, 0.2, 0.06, 'square');
      break;
    case 'spark':
      sweep(c, 320, 940, 0.14, 0.07);
      break;
    case 'click':
      tone(c, 1250, 0, 0.04, 0.04, 'square');
      break;
  }
}
