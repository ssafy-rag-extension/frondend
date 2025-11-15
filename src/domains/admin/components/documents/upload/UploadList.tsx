import { useState } from 'react';
import { Trash2, FileText } from 'lucide-react';
import type { RawMyDoc } from '@/shared/types/file.types';
import { useCategoryStore } from '@/shared/store/useCategoryMap';
import Pagination from '@/shared/components/Pagination';
import Checkbox from '@/shared/components/controls/Checkbox';

type UploadListProps = {
  files: RawMyDoc[];
  onFilesChange?: (nextFiles: RawMyDoc[]) => void;
  onSelectFiles: (selected: RawMyDoc[]) => void;
  selectedFiles: RawMyDoc[];
};

export default function UploadList({
  files,
  onFilesChange,
  onSelectFiles,
  selectedFiles,
}: UploadListProps) {
  // 1. 페이지네이션 상태
  const FILES_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(files.length / FILES_PER_PAGE) || 1;

  const safePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (safePage - 1) * FILES_PER_PAGE;
  const visibleFiles = files.slice(startIndex, startIndex + FILES_PER_PAGE);

  const categoryMap = useCategoryStore((s) => s.categoryMap);

  const allSelected = selectedFiles.length === files.length && files.length > 0;

  // 3. 선택 토글
  const handleToggleAll = () => {
    allSelected ? onSelectFiles([]) : onSelectFiles(files);
  };

  const handleToggleFile = (file: RawMyDoc) => {
    const exists = selectedFiles.some((f) => f.fileNo === file.fileNo);
    if (exists) onSelectFiles(selectedFiles.filter((f) => f.fileNo !== file.fileNo));
    else onSelectFiles([...selectedFiles, file]);
  };

  // 4. 삭제
  const handleDelete = () => {
    const selectedIds = new Set(selectedFiles.map((f) => f.fileNo));
    const next = files.filter((f) => !selectedIds.has(f.fileNo));
    onFilesChange?.(next);
    onSelectFiles([]);
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  return (
    <section className="flex w-full min-h-[475px] flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 w-fit bg-[linear-gradient(90deg,#BE7DB1_10%,#81BAFF_100%)] bg-clip-text text-xl font-extrabold text-transparent">
        업로드 할 문서
      </h3>

      <div className="mb-3 flex items-center justify-end gap-4 text-sm text-gray-600">
        <div
          className="flex items-center gap-1 cursor-pointer select-none"
          onClick={handleToggleAll}
        >
          <Checkbox checked={allSelected} brand="hebees" />
          <span>모두 선택</span>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={selectedFiles.length === 0}
          className="flex items-center gap-1 text-[var(--color-hebees)] transition disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          <span>삭제</span>
        </button>
      </div>

      <div className="min-h-[260px] border-t border-gray-100 pt-2">
        {visibleFiles.length > 0 ? (
          <ul className="space-y-1">
            {visibleFiles.map((file) => {
              const checked = selectedFiles.some((f) => f.fileNo === file.fileNo);
              const categoryName =
                (file.categoryNo && categoryMap[file.categoryNo]) || file.categoryNo || '기타';

              return (
                <li
                  key={file.fileNo}
                  className={`flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition ${
                    checked
                      ? 'bg-[var(--color-hebees-bg)]/70 ring-1 ring-[var(--color-hebees)]'
                      : 'hover:bg-[var(--color-hebees-bg)]/40 hover:ring-1 hover:ring-[var(--color-hebees)]'
                  }`}
                  onClick={() => handleToggleFile(file)}
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-[var(--color-hebees)]">
                      <FileText size={20} className="text-white" />
                    </div>

                    <div className="flex w-full justify-between items-center">
                      <span className="max-w-[220px] truncate text-sm font-medium text-gray-800">
                        {file.name}
                      </span>

                      <div className="flex items-center gap-4 text-xs text-gray-500 whitespace-nowrap">
                        <span>{categoryName}</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      brand="hebees"
                      onChange={() => handleToggleFile(file)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-sm text-gray-400">
            업로드된 문서가 없습니다.
          </div>
        )}
      </div>

      {files.length > 0 && (
        <Pagination
          pageNum={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-2"
        />
      )}
    </section>
  );
}
