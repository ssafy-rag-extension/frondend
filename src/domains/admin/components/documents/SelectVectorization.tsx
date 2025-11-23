import { FileText, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RawMyDoc } from '@/shared/types/file.types';
import { useCategoryStore } from '@/shared/store/useCategoryMap';
import { getCollections } from '@/domains/admin/api/documents.api';
import { uploadFiles } from '@/shared/api/file.api';
import { toast } from 'react-toastify';
import Pagination from '@/shared/components/Pagination';

export default function SelectVectorization({
  finalSelectedFiles,
  onRemove,
  onUploadComplete,
  isVectorizing,
  onStartVectorizing,
}: {
  finalSelectedFiles: RawMyDoc[];
  onRemove?: (file: RawMyDoc) => void;
  onUploadComplete: () => void;
  isVectorizing: boolean;
  onStartVectorizing: () => void;
}) {
  const [localFiles, setLocalFiles] = useState<RawMyDoc[]>(finalSelectedFiles);
  const [selectedFile, setSelectedFile] = useState<RawMyDoc | null>(null);

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentFiles = localFiles.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(localFiles.length / itemsPerPage);

  const [isUploading, setIsUploading] = useState(false);

  const { data: collectionsResult } = useQuery({
    queryKey: ['collections', { filter: true }],
    queryFn: () => getCollections({ filter: true }),
    staleTime: 1000 * 60 * 10,
  });
  const collections = collectionsResult?.data ?? [];

  const categoryMap = useCategoryStore((s) => s.categoryMap);

  useEffect(() => {
    setLocalFiles(finalSelectedFiles);
  }, [finalSelectedFiles]);

  const handleRemove = (fileToRemove: RawMyDoc) => {
    onRemove?.(fileToRemove);

    setLocalFiles((prev) =>
      prev.filter(
        (file) =>
          !(file.name === fileToRemove.name && file.collectionNo === fileToRemove.collectionNo)
      )
    );

    if (
      selectedFile &&
      selectedFile.name === fileToRemove.name &&
      selectedFile.collectionNo === fileToRemove.collectionNo
    ) {
      setSelectedFile(null);
    }
  };

  async function handleUpload(finalSelectedFiles: RawMyDoc[]) {
    try {
      onStartVectorizing();
      setIsUploading(true);

      // 카테고리 + bucket 그룹화
      const grouped = finalSelectedFiles.reduce<Record<string, RawMyDoc[]>>((acc, file) => {
        const key = `${file.categoryNo}__${file.collectionNo}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(file);
        return acc;
      }, {});

      // 그룹별 업로드 요청
      const promises = Object.values(grouped).map((files) => {
        const categoryNo = files[0].categoryNo;
        const bucket = files[0].collectionNo;

        return uploadFiles({
          categoryNo,
          bucket,
          files: files.map((f) => f.originalFile as File),
        });
      });

      await Promise.all(promises);

      toast.success('파일이 업로드 되었습니다.');

      // 초기화
      setLocalFiles([]);
      setSelectedFile(null);
      setCurrentPage(1);
      onUploadComplete();
    } catch (err) {
      console.error('업로드 실패', err);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="flex flex-col w-full p-6 border border-gray-200 rounded-2xl bg-white min-h-[475px] shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="w-5 h-5 text-[var(--color-hebees)]" />
        <h3 className="text-xl font-semibold text-gray-900">벡터화 대상 파일 목록</h3>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-8 text-sm font-medium text-gray-500 px-2 pb-2 border-b border-gray-100">
          <span className="col-span-3">파일명</span>
          <span className="col-span-2 text-center">크기</span>
          <span className="col-span-2 text-center">카테고리</span>
          <span className="col-span-1 text-center">저장위치</span>
        </div>

        <div
          className={`flex-1 ${
            currentFiles.length > 0
              ? 'h-[270px] overflow-y-auto mt-1'
              : 'h-[270px] flex items-center justify-center'
          }`}
        >
          {currentFiles.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 text-sm">
              선택된 파일이 없습니다.
            </div>
          ) : (
            <ul className="space-y-2 mt-2">
              {currentFiles.map((file) => {
                const categoryName = categoryMap[file.categoryNo] || file.categoryNo || '기타';

                const isSelected =
                  selectedFile &&
                  selectedFile.name === file.name &&
                  selectedFile.collectionNo === file.collectionNo;

                return (
                  <li
                    key={`${file.name}::${file.collectionNo}`}
                    onClick={() => isUploading && setSelectedFile(file)}
                    className={`
                  grid grid-cols-8 items-center px-4 py-3 rounded-xl border 
                  transition
                  ${
                    isSelected
                      ? 'border-[var(--color-hebees)] bg-[var(--color-hebees-bg)]/50'
                      : 'border-gray-100 bg-white hover:bg-gray-50'
                  }
                  ${isUploading ? 'cursor-pointer' : 'cursor-default'}
                `}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(file);
                        }}
                        className="hover:opacity-80 transition"
                      >
                        <X size={16} className="text-[var(--color-hebees)]" />
                      </button>

                      <div className="w-8 h-8 bg-[var(--color-hebees-bg)] rounded-lg flex items-center justify-center">
                        <FileText size={18} className="text-[var(--color-hebees)]" />
                      </div>

                      <span className="truncate max-w-[200px] text-[14px] font-medium text-gray-800">
                        {file.name}
                      </span>
                    </div>

                    <span className="col-span-2 text-center text-[12px] text-gray-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="col-span-2 text-center text-[12px] text-gray-600">
                      {categoryName}
                    </span>
                    <span className="col-span-1 text-center text-[12px] text-gray-600">
                      {collections.find((c) => c.name === file.collectionNo)?.name || '-'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {localFiles.length > 0 && (
        <Pagination
          pageNum={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-4"
        />
      )}

      <div className="flex justify-center mt-8 mb-2">
        {isUploading ? (
          <button className="px-6 py-2.5 rounded-lg text-base font-medium bg-gray-200 text-gray-400 cursor-not-allowed flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            업로드 중...
          </button>
        ) : isVectorizing ? (
          <button className="px-6 py-2.5 rounded-lg text-base font-semibold bg-gray-200 text-gray-500 cursor-not-allowed">
            벡터화 진행 중...
          </button>
        ) : localFiles.length > 0 ? (
          <button
            onClick={() => handleUpload(localFiles)}
            className="px-6 py-2.5 rounded-lg text-base font-semibold text-white shadow-sm gradient-move-bg hover:opacity-90 transition"
          >
            <span className="relative z-10">벡터화 실행</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
