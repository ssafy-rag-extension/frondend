import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * DuplicateFilenameDialog
 *
 * 파일 업로드/이동 시 동일한 파일명이 이미 존재할 때 사용자에게
 * 1) 덮어쓰기 또는 2) 다른 이름으로 저장(이름 변경)의 UI를 제공합니다.
 *
 * ✅ 특징
 * - 확장자 분리 표시: baseName만 수정하도록 유도하고, 확장자는 고정
 * - 기존 이름 목록과의 중복 즉시 검증 및 에러 메시지
 * - 기본 제안 이름: "파일명 (1).ext", 이미 있으면 (2), (3) … 자동 증가
 * - Enter 키 동작: 현재 탭의 기본 액션 실행(덮어쓰기/이름변경)
 * - ESC / 오버레이 클릭으로 닫기
 * - 브랜드 색상(hebees / retina) 지원
 */

export type Brand = 'hebees' | 'retina';

export interface DuplicateFilenameDialogProps {
  /** 중복이 감지된 원본 파일명 (예: "보고서.pdf") */
  name: string;
  /** 현재 위치(폴더) 내의 기존 파일명 전체 리스트 */
  existingNames: string[];
  /** 열림 제어 */
  open: boolean;
  /** 닫기 */
  onClose: () => void;
  /** 덮어쓰기 선택 시 호출 */
  onOverwrite: (finalName: string) => void;
  /** 이름 변경 선택 시 호출 */
  onRename: (newName: string) => void;
  /** hebees 또는 retina (기본: hebees) */
  brand?: Brand;
}

function splitName(name: string) {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, lastDot), ext: name.slice(lastDot) };
}

function suggestNextName(base: string, ext: string, existing: Set<string>) {
  // "파일명 (1).ext" 형태로 증가
  let n = 1;
  let candidate = `${base} (${n})${ext}`;
  while (existing.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}

export default function DuplicateFilenameDialog({
  name,
  existingNames,
  open,
  onClose,
  onOverwrite,
  onRename,
  brand = 'hebees',
}: DuplicateFilenameDialogProps) {
  const { base, ext } = useMemo(() => splitName(name), [name]);
  const existing = useMemo(() => new Set(existingNames), [existingNames]);

  const [tab, setTab] = useState<'overwrite' | 'rename'>('overwrite');
  const [renameBase, setRenameBase] = useState(base);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // 다이얼로그 열릴 때 상태 초기화
    setTab('overwrite');
    setRenameBase(base);
  }, [open, base]);

  useEffect(() => {
    if (tab === 'rename') {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [tab]);

  // 브랜드 스타일 토큰
  const brandText =
    brand === 'hebees' ? 'text-[var(--color-hebees)]' : 'text-[var(--color-retina)]';
  const brandBg =
    brand === 'hebees' ? 'bg-[var(--color-hebees-bg)]' : 'bg-[var(--color-retina-bg)]';
  const brandBorder =
    brand === 'hebees' ? 'border-[var(--color-hebees)]' : 'border-[var(--color-retina)]';

  const proposed = useMemo(() => suggestNextName(base, ext, existing), [base, ext, existing]);
  const renameFull = `${renameBase.trim()}${ext}`;
  const isSameAsOriginal = renameFull === name;
  const isDuplicate = existing.has(renameFull);
  const isEmpty = renameBase.trim().length === 0;

  const renameError = isEmpty
    ? '이름을 입력해주세요.'
    : isSameAsOriginal
      ? '원본 이름과 동일합니다.'
      : isDuplicate
        ? '이미 동일한 이름이 있어요.'
        : '';

  const canConfirmRename = !renameError;

  // 키보드 핸들링 (Enter/ESC)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (tab === 'overwrite') {
          onOverwrite(name);
        } else if (tab === 'rename' && canConfirmRename) {
          onRename(renameFull);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, tab, canConfirmRename, onClose, onOverwrite, onRename, renameFull, name]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dup-title"
      aria-describedby="dup-desc"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px] rounded-t-2xl bg-white shadow-2xl md:top-1/2 md:bottom-auto md:translate-y-[-50%] md:rounded-2xl">
        <div className="p-5 md:p-6">
          {/* 헤더 */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="dup-title" className="text-lg font-semibold text-gray-900">
                동일한 이름의 파일이 있어요
              </h2>
              <p id="dup-desc" className="mt-1 text-sm text-gray-500">
                <span className="font-medium text-gray-700">{name}</span> 과(와) 같은 이름의 파일이
                이미 존재합니다. 아래 옵션 중 하나를 선택하세요.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              aria-label="닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 탭 */}
          <div className="mb-4 inline-flex rounded-xl bg-gray-100 p-1 text-sm">
            <button
              onClick={() => setTab('overwrite')}
              className={`min-w-[120px] rounded-lg px-3 py-2 transition ${
                tab === 'overwrite' ? `${brandBg} ${brandText}` : 'text-gray-600 hover:bg-white'
              }`}
            >
              덮어쓰기
            </button>
            <button
              onClick={() => setTab('rename')}
              className={`min-w-[120px] rounded-lg px-3 py-2 transition ${
                tab === 'rename' ? `${brandBg} ${brandText}` : 'text-gray-600 hover:bg-white'
              }`}
            >
              다른 이름으로 저장
            </button>
          </div>

          {/* 내용 */}
          {tab === 'overwrite' ? (
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-700">
                현재 파일을 <span className={`font-medium ${brandText}`}>{name}</span> 으로 그대로
                저장하고 기존 파일을 대체합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700">새 파일 이름</label>

              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                    renameError
                      ? 'border-red-300 focus:ring-red-200'
                      : `border-gray-300 focus:ring-[rgba(0,0,0,0.08)]`
                  }`}
                  value={renameBase}
                  onChange={(e) => setRenameBase(e.target.value)}
                  placeholder={splitName(proposed).base}
                  aria-invalid={!!renameError}
                />
                <span className="shrink-0 text-sm text-gray-500">{ext || ''}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <div className={renameError ? 'text-red-600' : 'text-gray-500'}>
                  {renameError ? (
                    <>{renameError}</>
                  ) : (
                    <>
                      예: <span className="font-medium text-gray-700">{proposed}</span>
                    </>
                  )}
                </div>
                {renameBase.trim() !== base && !renameError && (
                  <span
                    className={`rounded-md border px-2 py-1 ${brandBorder} ${brandBg} ${brandText}`}
                  >
                    사용 가능
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 푸터 액션 */}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>

            {tab === 'overwrite' ? (
              <button
                onClick={() => onOverwrite(name)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  brand === 'hebees'
                    ? 'bg-[var(--color-hebees)] hover:brightness-95'
                    : 'bg-[var(--color-retina)] hover:brightness-95'
                }`}
              >
                덮어쓰기
              </button>
            ) : (
              <button
                disabled={!canConfirmRename}
                onClick={() => onRename(renameFull)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  canConfirmRename
                    ? brand === 'hebees'
                      ? 'bg-[var(--color-hebees)] hover:brightness-95'
                      : 'bg-[var(--color-retina)] hover:brightness-95'
                    : 'cursor-not-allowed bg-gray-300'
                }`}
              >
                새 이름으로 저장
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 사용 예시
 *
 * const [conflict, setConflict] = useState<{open:boolean; name:string}|null>(null)
 * const existingNames = docs.map(d => d.name)
 *
 * async function handleUpload(file: File) {
 *   if (existingNames.includes(file.name)) {
 *     setConflict({ open: true, name: file.name })
 *     return
 *   }
 *   // 업로드 진행…
 * }
 *
 * <DuplicateFilenameDialog
 *   open={!!conflict?.open}
 *   name={conflict?.name ?? ''}
 *   existingNames={existingNames}
 *   brand={brand}
 *   onClose={() => setConflict(null)}
 *   onOverwrite={(finalName) => {
 *     setConflict(null)
 *     // finalName으로 덮어쓰기 업로드 로직 수행
 *   }}
 *   onRename={(newName) => {
 *     setConflict(null)
 *     // newName으로 이름 변경하여 업로드 로직 수행
 *   }}
 * />
 */
