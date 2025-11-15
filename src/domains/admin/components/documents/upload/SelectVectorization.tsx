import { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { RawMyDoc } from '@/shared/types/file.types';
import { useCategoryStore } from '@/shared/store/useCategoryMap';
import { getCollections } from '@/domains/admin/api/documents.api';
import { uploadFiles } from '@/shared/api/file.api';
import { toast } from 'react-toastify';
import Pagination from '@/shared/components/Pagination';

type SelectVectorizationProps = {
  finalSelectedFiles: RawMyDoc[];
  onRemove?: (file: RawMyDoc) => void;
  onUploadComplete: () => void;
  isVectorizing: boolean;
  onStartVectorizing: () => void;
};

type CollectionsApiResponse = {
  data: {
    collectionNo: string;
    name: string;
    ingestGroupNo?: string | null;
  }[];
  pagination: unknown;
};

export default function SelectVectorization({
  finalSelectedFiles,
  onRemove,
  onUploadComplete,
  isVectorizing,
  onStartVectorizing,
}: SelectVectorizationProps) {
  // 1. 로컬 파일 상태 및 페이징/선택 상태
  const [localFiles, setLocalFiles] = useState<RawMyDoc[]>(finalSelectedFiles);
  const [selectedFile, setSelectedFile] = useState<RawMyDoc | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isUploading, setIsUploading] = useState(false);

  // 2. 컬렉션 목록 조회 (저장 위치 표시용)
  const { data: collectionsResult } = useQuery<CollectionsApiResponse, Error>({
    queryKey: ['collections', { filter: true }],
    queryFn: () =>
      getCollections({
        filter: true,
      }),
    staleTime: 1000 * 60 * 10,
  });
  const collections = collectionsResult?.data ?? [];

  // 3. 상위에서 넘어온 finalSelectedFiles가 변경되면 로컬 상태 동기화
  useEffect(() => {
    setLocalFiles(finalSelectedFiles);
    setCurrentPage(1);
    setSelectedFile(null);
  }, [finalSelectedFiles]);

  // SelectVectorization.tsx 안 handleUpload 일부

  // 4. 파일 업로드 + 벡터화 트리거
  async function handleUpload(filesForUpload: RawMyDoc[]) {
    if (filesForUpload.length === 0) return;

    try {
      onStartVectorizing();
      setIsUploading(true);

      const groupedByCategory = filesForUpload.reduce<Record<string, RawMyDoc[]>>((acc, file) => {
        const category = file.categoryNo ?? 'default';
        if (!acc[category]) acc[category] = [];
        acc[category].push(file);
        return acc;
      }, {});

      const uploadPromises = Object.entries(groupedByCategory).map(([categoryNo, files]) => {
        const bucket = files[0].bucket;

        if (bucket !== 'public' && bucket !== 'hebees') {
          console.error('잘못된 bucket 값:', bucket);
          throw new Error("bucket 값은 'public' 또는 'hebees'만 허용됩니다.");
        }

        return uploadFiles({
          bucket,
          categoryNo,
          files: files.map((f) => f.originalFile as File),
        });
      });

      await Promise.all(uploadPromises);

      toast.success('업로드가 완료되었습니다.');
      setLocalFiles([]);
      setSelectedFile(null);
      setCurrentPage(1);
      onUploadComplete();
    } catch (err: unknown) {
      console.error('업로드 실패 에러 객체:', err);
      const anyErr = err as { response?: { data?: { message?: string } } };
      const message = anyErr.response?.data?.message;
      toast.error(message ?? '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  // 5. 파일 제거 핸들러 (상위/로컬 동기)
  const handleRemove = (fileToRemove: RawMyDoc) => {
    onRemove?.(fileToRemove);

    setLocalFiles((prev) =>
      prev.filter(
        (file) =>
          !(file.fileNo === fileToRemove.fileNo && file.collectionNo === fileToRemove.collectionNo)
      )
    );

    if (
      selectedFile &&
      selectedFile.fileNo === fileToRemove.fileNo &&
      selectedFile.collectionNo === fileToRemove.collectionNo
    ) {
      setSelectedFile(null);
    }
  };

  // 6. 페이지네이션 및 파생 값 계산
  const totalPages = Math.ceil(localFiles.length / itemsPerPage) || 1;
  const safePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentFiles = localFiles.slice(startIndex, startIndex + itemsPerPage);

  const categoryMap = useCategoryStore((s) => s.categoryMap);

  return (
    <section className="flex min-h-[475px] w-full flex-col rounded-xl border bg-white p-4">
      <h3 className="mb-3 w-fit bg-[linear-gradient(90deg,#BE7DB1_10%,#81BAFF_100%)] bg-clip-text text-xl font-bold text-transparent">
        벡터화 대상 파일 목록
      </h3>

      <div className="flex flex-1 flex-col">
        <div className="mt-2 grid h-[40px] grid-cols-8 border-b text-sm font-semibold text-gray-800">
          <span className="col-span-3 text-center">파일명</span>
          <span className="col-span-2 text-center">크기</span>
          <span className="col-span-2 text-center">카테고리</span>
          <span className="col-span-1 text-center">저장위치</span>
        </div>

        <div
          className={`flex-1 ${
            currentFiles.length > 0
              ? 'h-[270px] overflow-y-auto'
              : 'flex h-[270px] items-center justify-center'
          }`}
        >
          {currentFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-sm text-gray-400">
              선택된 파일이 없습니다.
            </div>
          ) : (
            currentFiles.map((file) => {
              const categoryName =
                (file.categoryNo && categoryMap[file.categoryNo]) || file.categoryNo || '기타';

              const collectionLabel =
                collections.find((c) => c.collectionNo === file.collectionNo)?.name || '-';

              const isActive =
                selectedFile?.fileNo === file.fileNo &&
                selectedFile.collectionNo === file.collectionNo;

              return (
                <div
                  key={`${file.fileNo}::${file.collectionNo}`}
                  onClick={() => {
                    if (isUploading) return;
                    setSelectedFile(file);
                  }}
                  className={`grid grid-cols-8 items-center border-b p-2 text-sm last:border-none transition
                    ${
                      isUploading
                        ? 'cursor-default'
                        : 'cursor-pointer hover:bg-[var(--color-hebees-bg)]/40'
                    }
                    ${isActive ? 'bg-gray-200 ring-1 ring-[var(--color-hebees)]' : ''}`}
                >
                  <div className="col-span-3 flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(file);
                      }}
                      className="transition hover:opacity-80"
                    >
                      <X size={16} className="text-[var(--color-hebees)]" />
                    </button>
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-hebees)]">
                      <FileText size={16} className="text-[var(--color-white)]" />
                    </div>
                    <span className="max-w-[150px] truncate">{file.name}</span>
                  </div>

                  <span className="col-span-2 text-center text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>

                  <span className="col-span-2 text-center text-xs">{categoryName}</span>

                  <span className="col-span-1 text-center text-xs">{collectionLabel}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {localFiles.length > 0 && (
        <Pagination
          pageNum={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-4"
        />
      )}

      <div className="mb-4 mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => handleUpload(localFiles)}
          disabled={isUploading || localFiles.length === 0}
          className={`cursor-pointer rounded-md px-10 py-2 font-semibold text-white shadow-md transition ${
            isUploading
              ? 'cursor-not-allowed bg-gray-300'
              : 'bg-[linear-gradient(90deg,#BE7DB1_10%,#81BAFF_100%)] hover:opacity-90'
          }`}
        >
          {isUploading ? '업로드 중...' : isVectorizing ? '벡터화 진행 중...' : '벡터화 실행'}
        </button>
      </div>
    </section>
  );
}
