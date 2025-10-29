import { CloudUpload } from 'lucide-react';
import { useRef } from 'react';

interface UploadFileProps {
  onFilesSelected: (mergedFiles: File[]) => void; // 최종 병합 결과
  onDuplicateDetected?: (duplicates: File[]) => void; // 중복 파일 모달 띄우기 용
  existingFiles: File[]; // 부모가 가진 기존 파일 목록
}

export default function UploadFile({
  onFilesSelected,
  onDuplicateDetected,
  existingFiles,
}: UploadFileProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 🔹 클릭 시 input 실행
  const handleClick = () => inputRef.current?.click();

  // 🔹 업로드 이벤트
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const existingNames = new Set(existingFiles.map((f) => f.name));

    // ✅ 중복 감지
    const duplicates = newFiles.filter((f) => existingNames.has(f.name));
    const uniqueFiles = newFiles.filter((f) => !existingNames.has(f.name));

    // ✅ 중복 있으면 모달 표시
    if (duplicates.length > 0 && onDuplicateDetected) {
      onDuplicateDetected(duplicates);
    }

    // ✅ 새 파일은 기존 목록에 추가
    const merged = [...existingFiles, ...uniqueFiles];

    onFilesSelected(merged); // 부모에 전달
    e.target.value = ''; // input 초기화
  };
  return (
    <section className="space-y-2 my-3">
      <div
        onClick={handleClick}
        className="cursor-pointer flex flex-col items-center justify-center w-full rounded-xl border border-gray-200 py-10 bg-white"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-hebees-bg)] mb-3">
          <CloudUpload size={30} className="text-[var(--color-hebees)]" />
        </div>
        <p className="text-m font-medium text-gray-800 mb-1">파일 업로드</p>
        <p className="text-xs text-gray-400">PDF, 엑셀파일(xlsx) 업로드가 가능합니다.</p>
        <input
          type="file"
          multiple
          accept=".pdf,.xlsx"
          ref={inputRef}
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </section>
  );
}
