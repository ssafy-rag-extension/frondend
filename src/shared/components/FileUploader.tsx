// components/uploader/FileDropzone.tsx
import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';

type Brand = 'hebees' | 'retina';

type Props = {
  onFiles: (files: File[]) => void;
  accept?: string; // e.g. ".pdf,.docx,.xlsx"
  multiple?: boolean;
  maxSizeMB?: number; // 초과 시 에러
  disabled?: boolean;
  className?: string;
  brand?: Brand; // 'hebees' | 'retina'
};

export default function FileDropzone({
  onFiles,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  multiple = true,
  maxSizeMB = 50,
  disabled = false,
  className = '',
  brand = 'hebees',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [dragHasFiles, setDragHasFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFileDialog = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const overs = arr.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (overs.length) {
      setError(`파일당 최대 ${maxSizeMB}MB까지 업로드할 수 있어요.`);
      return;
    }
    setError(null);
    onFiles(arr);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsOver(false);
    setDragHasFiles(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;

    const hasFiles = e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files');

    setDragHasFiles(!!hasFiles);
    setIsOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    setDragHasFiles(false);
  };

  const base =
    'relative w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 outline-none transition';
  const interactive = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

  // 기본(비드래그) 배경: 화이트 톤
  const normalBg = 'bg-white border-gray-300/60 hover:bg-gray-50';

  // 드래그 오버 + 파일일 때만 브랜드 배경 적용
  const brandOverBg = brand === 'hebees' ? 'hebees-bg' : 'retina-bg';

  const dropzoneClass = [
    base,
    interactive,
    isOver && dragHasFiles ? brandOverBg : normalBg,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // 버튼/아이콘 색상도 브랜드에 맞춰 약간 분기 (원하는 색으로 자유 변경 가능)
  const buttonBrand =
    brand === 'hebees'
      ? `
      bg-[var(--color-hebees)]
      hover:bg-[var(--color-hebees-dark)]
      focus-visible:outline-[var(--color-hebees)]
    `
      : `
      bg-[var(--color-retina)]
      hover:bg-[var(--color-retina-dark)]
      focus-visible:outline-[var(--color-retina)]
    `;

  const iconBrand =
    brand === 'hebees' ? 'text-[var(--color-hebees)]' : 'text-[var(--color-retina)]';

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={openFileDialog}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openFileDialog()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={dropzoneClass}
        aria-label="파일 업로드 영역"
      >
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
            <UploadCloud className={`size-7 ${iconBrand}`} />
          </div>

          <p className="text-sm font-semibold text-gray-800">파일 업로드 후, RAG 챗봇 학습 시작</p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, DOCX, XLSX 파일을 드래그하거나 클릭하여 업로드 하세요.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={openFileDialog}
              disabled={disabled}
              className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${buttonBrand}`}
            >
              파일 선택
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* 숨김 input */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={e => e.target.files && handleFiles(e.target.files)}
          className="sr-only"
        />
      </div>
    </div>
  );
}
