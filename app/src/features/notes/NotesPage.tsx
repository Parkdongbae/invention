import { useEffect, useMemo, useState } from 'react';
import { XP_TABLE, uid, useAppStore } from '../../store/useAppStore';
import type { NoteEntry } from '../../types';
import { downloadText } from '../../lib/csv';
import { ConfirmButton, EmptyState, Modal, Section, toast } from '../../components/ui';

interface EditorState {
  id: string;
  title: string;
  content: string;
}

const fmtDateTime = (ts: number): string => new Date(ts).toLocaleString('ko-KR');
const fmtDateOnly = (ts: number): string =>
  new Date(ts).toLocaleDateString('ko-KR').replace(/\.\s?/g, '').trim();

/** 노트 → 마크다운 문자열 */
const noteToMd = (n: { title: string; content: string }): string =>
  `# ${n.title.trim() || '무제 노트'}\n\n${n.content}\n`;

/** 여러 노트 → 마크다운 모음 */
const allNotesToMd = (list: NoteEntry[]): string =>
  `# 발명 노트 모음\n\n> ${list.length}개의 노트 · 내보낸 날짜: ${new Date().toLocaleDateString('ko-KR')}\n\n` +
  list
    .map((n) => `---\n\n${noteToMd(n)}\n<small>마지막 수정: ${fmtDateTime(n.updatedAt)}</small>\n`)
    .join('\n');

/** 파일명으로 쓸 수 없는 문자 제거 */
const safeName = (title: string): string =>
  title.trim().replace(/[\\/:*?"<>|]/g, '') || '발명노트';

export default function NotesPage() {
  const notes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const removeNote = useAppStore((s) => s.removeNote);
  const addXp = useAppStore((s) => s.addXp);
  const earnStamp = useAppStore((s) => s.earnStamp);

  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [autosaved, setAutosaved] = useState(false);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return sorted;
    return sorted.filter((n) => n.title.includes(q) || n.content.includes(q));
  }, [sorted, query]);

  // 편집 중 800ms 디바운스 자동 임시저장
  useEffect(() => {
    if (!editor) return;
    setAutosaved(false);
    const t = setTimeout(() => {
      updateNote(editor.id, { title: editor.title, content: editor.content });
      setAutosaved(true);
    }, 800);
    return () => clearTimeout(t);
  }, [editor, updateNote]);

  const createNote = () => {
    const now = Date.now();
    const entry: NoteEntry = { id: uid(), createdAt: now, updatedAt: now, title: '', content: '' };
    addNote(entry);
    addXp(XP_TABLE.note);
    if (earnStamp('note_created')) toast('발명 노트 도장을 획득했어요!', '📓');
    setQuery('');
    setEditor({ id: entry.id, title: '', content: '' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast('클립보드에 복사했어요!', '📋'))
      .catch(() => toast('복사에 실패했어요. 브라우저 설정을 확인해 주세요.', '😅'));
  };

  const exportOne = (n: EditorState) => {
    downloadText(`${safeName(n.title)}.md`, noteToMd(n), 'text/markdown;charset=utf-8');
    toast('마크다운 파일로 저장했어요!', '💾');
  };

  const exportAll = () => {
    if (sorted.length === 0) {
      toast('내보낼 노트가 아직 없어요.', '⚠️');
      return;
    }
    downloadText(
      `발명노트_모음_${fmtDateOnly(Date.now())}.md`,
      allNotesToMd(sorted),
      'text/markdown;charset=utf-8',
    );
    toast(`${sorted.length}개 노트를 마크다운으로 저장했어요!`, '💾');
  };

  const removeCurrent = () => {
    if (!editor) return;
    removeNote(editor.id);
    setEditor(null);
    toast('노트를 삭제했어요.', '🗑️');
  };

  return (
    <div>
      <Section
        title="📓 발명 노트"
        sub="관찰한 것, 조사한 것, 떠오른 생각을 자유롭게 기록해요."
        right={
          <button className="btn btn-sm btn-primary" onClick={createNote}>
            ＋ 새 노트
          </button>
        }
      >
        <div className="row" style={{ marginBottom: 16 }}>
          <input
            className="input"
            value={query}
            placeholder="🔍 제목이나 내용에서 찾아보세요"
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <div className="spacer" />
          <button className="btn btn-sm" onClick={exportAll}>
            📤 전체 .md 내려받기
          </button>
        </div>

        {notes.length === 0 ? (
          <EmptyState
            icon="📓"
            title="아직 노트가 없어요"
            sub="발명을 향한 첫 기록을 시작해 볼까요?"
          >
            <button className="btn btn-primary" onClick={createNote}>
              ＋ 첫 노트 만들기
            </button>
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🔍" title="검색 결과가 없어요" sub={`'${query}'와 맞는 노트가 없어요`} />
        ) : (
          <div className="grid grid-3">
            {filtered.map((n) => (
              <div
                key={n.id}
                className="card card-tight"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditor({ id: n.id, title: n.title, content: n.content })}
              >
                <strong style={{ display: 'block', marginBottom: 4, fontSize: 15 }}>
                  {n.title.trim() || '무제 노트'}
                </strong>
                <p className="muted" style={{ marginBottom: 10, minHeight: 42 }}>
                  {n.content.trim()
                    ? n.content.length > 90
                      ? `${n.content.slice(0, 90)}…`
                      : n.content
                    : '(내용 없음)'}
                </p>
                <div className="row">
                  <span className="tiny">{fmtDateTime(n.updatedAt)}</span>
                  <div className="spacer" />
                  <span className="tiny">{n.content.length}자</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 노트 편집 모달 */}
      <Modal open={editor !== null} onClose={() => setEditor(null)} title="📓 노트 편집" wide>
        {editor && (
          <div className="col">
            <input
              className="input"
              value={editor.title}
              placeholder="노트 제목"
              onChange={(e) => setEditor({ ...editor, title: e.target.value })}
            />
            <textarea
              className="textarea"
              style={{ minHeight: 220 }}
              value={editor.content}
              placeholder="발명 아이디어, 관찰한 점, 조사한 내용을 자유롭게 적어 보세요."
              onChange={(e) => setEditor({ ...editor, content: e.target.value })}
            />
            <div className="row">
              <span className="tiny">
                {autosaved ? '자동 저장됨 ✓' : '입력을 멈추면 0.8초 후 자동 저장돼요'}
              </span>
              <div className="spacer" />
              <button className="btn btn-sm" onClick={() => exportOne(editor)}>
                💾 .md 내려받기
              </button>
              <button className="btn btn-sm" onClick={() => copyToClipboard(noteToMd(editor))}>
                📋 복사
              </button>
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <ConfirmButton onConfirm={removeCurrent}>🗑️ 노트 삭제</ConfirmButton>
              <div className="spacer" />
              <button className="btn btn-primary" onClick={() => setEditor(null)}>
                ✓ 완료
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
