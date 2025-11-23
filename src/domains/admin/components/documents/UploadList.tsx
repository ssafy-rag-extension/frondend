import { Trash2, FileText, ArrowUpCircle } from 'lucide-react';
import { useState } from 'react';
import type { RawMyDoc } from '@/shared/types/file.types';
import { useCategoryStore } from '@/shared/store/useCategoryMap';
import Checkbox from '@/shared/components/controls/Checkbox';
import Pagination from '@/shared/components/Pagination';

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
  const FILES_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(files.length / FILES_PER_PAGE);
  const startIndex = (currentPage - 1) * FILES_PER_PAGE;
  const visibleFiles = files.slice(startIndex, startIndex + FILES_PER_PAGE);

  const categoryMap = useCategoryStore((s) => s.categoryMap);

  const allSelected = selectedFiles.length === files.length && files.length > 0;

  const handleToggleAll = () => {
    if (allSelected) onSelectFiles([]);
    else onSelectFiles(files);
  };

  const handleToggleFile = (file: RawMyDoc) => {
    const isSelected = selectedFiles.some((f) => f.fileNo === file.fileNo);
    if (isSelected) {
      onSelectFiles(selectedFiles.filter((f) => f.fileNo !== file.fileNo));
    } else {
      onSelectFiles([...selectedFiles, file]);
    }
  };

  const handleDelete = () => {
    const selectedIds = new Set(selectedFiles.map((f) => f.fileNo));
    const remaining = files.filter((f) => !selectedIds.has(f.fileNo));
    onFilesChange?.(remaining);
    onSelectFiles([]);
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  return (
    <section className="flex flex-col w-full p-6 min-h-[475px] border border-gray-200 rounded-2xl bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <ArrowUpCircle className="w-6 h-6 text-[var(--color-hebees)]" />
        <h3 className="text-xl font-semibold text-gray-900">업로드할 문서</h3>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div />

        <div className="flex items-center gap-5 text-sm text-gray-600">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={allSelected} onChange={handleToggleAll} brand="hebees" />
            <span className="text-gray-700 font-medium">모두 선택</span>
          </label>

          <button
            onClick={handleDelete}
            disabled={selectedFiles.length === 0}
            className="flex items-center gap-1 text-[var(--color-hebees)] disabled:opacity-40 font-medium"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 h-[270px]">
        {visibleFiles.length > 0 ? (
          <ul className="space-y-2">
            {visibleFiles.map((file) => {
              const isChecked = selectedFiles.some((f) => f.fileNo === file.fileNo);

              const categoryName =
                (file.categoryNo && categoryMap[file.categoryNo]) || file.categoryNo || '기타';

              return (
                <li
                  key={file.fileNo}
                  onClick={() => handleToggleFile(file)}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl border
                    transition cursor-pointer
                    ${
                      isChecked
                        ? 'bg-[var(--color-hebees-bg)]/60 border-[var(--color-hebees)]'
                        : 'border-gray-100 hover:border-[var(--color-hebees)] hover:bg-[var(--color-hebees-bg)]'
                    }
                  `}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-9 h-9 bg-[var(--color-hebees)] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <FileText size={18} className="text-white" />
                    </div>

                    <div className="flex flex-col w-full">
                      <span className="truncate text-sm font-medium text-gray-800 max-w-[250px]">
                        {file.name}
                      </span>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{categoryName}</span>
                        <span className="opacity-40">•</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      onChange={() => handleToggleFile(file)}
                      brand="hebees"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col h-full items-center justify-center text-gray-400 text-sm py-14">
            업로드된 문서가 없습니다.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          pageNum={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          className="mt-4"
        />
      )}
    </section>
  );
}
