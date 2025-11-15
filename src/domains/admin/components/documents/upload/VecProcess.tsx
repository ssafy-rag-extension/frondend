import type { Dispatch, SetStateAction } from 'react';
import { FileText, CloudUpload, Zap, Database, CircleCheck } from 'lucide-react';
import Pagination from '@/shared/components/Pagination';
import { useVectorizationProcess } from '@/domains/admin/hooks/useVecProcess';

type VecProcessProps = {
  isUploadDone: boolean;
  setIsUploadDone: Dispatch<SetStateAction<boolean>>;
};

export default function VecProcess({ isUploadDone, setIsUploadDone }: VecProcessProps) {
  // 1. 벡터화 SSE/진행 상태는 커스텀 훅에서 관리
  const {
    pageNum,
    setPageNum,
    selectedFile,
    setSelectedFile,
    paginatedItems,
    totalPages,
    current,
    fileNameMap,
    summary,
    overallStatus,
    activeItems,
  } = useVectorizationProcess({ isUploadDone, setIsUploadDone });

  const showPagination = totalPages > 1 && activeItems.length > 0;

  return (
    <section className="mt-6 grid grid-cols-[3fr_7fr] gap-6 rounded-xl border bg-white p-5">
      {/* 왼쪽: 파일 리스트 + 전체 진행률 */}
      <div className="rounded-lg p-4">
        <h3 className="mb-3 font-bold text-gray-800">진행 중인 파일 목록</h3>

        {activeItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">진행중인 파일이 없습니다.</div>
        ) : (
          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {paginatedItems.map((item) => {
              const percent = item.overall ?? 0;

              return (
                <button
                  type="button"
                  key={item.fileNo}
                  className={`w-full cursor-pointer rounded-lg border p-3 text-left transition ${
                    selectedFile === item.fileNo
                      ? 'bg-[var(--color-hebees-bg)]/40 border-[var(--color-hebees)]'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFile(item.fileNo)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{item.fileName}</span>
                    <span className="text-xs text-gray-600">{percent.toFixed(1)}%</span>
                  </div>

                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-[var(--color-retina)] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {showPagination && (
          <div className="mt-3 flex justify-center">
            <Pagination pageNum={pageNum} totalPages={totalPages} onPageChange={setPageNum} />
          </div>
        )}
      </div>

      {/* 오른쪽: 선택된 파일의 단계별 진행률 */}
      <div className="rounded-lg p-4">
        <h3 className="mb-4 font-bold text-gray-800">상세 진행률</h3>

        {!current ? (
          <div className="py-20 text-center text-gray-400">파일을 선택하세요.</div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-hebees)]">
                <FileText size={17} className="text-white" />
              </div>
              <h3 className="text-sm font-semibold">
                {selectedFile ? fileNameMap[selectedFile] : ''}
              </h3>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-6">
              <div className="flex flex-col items-center">
                <CloudUpload className="h-12 w-12 text-[var(--color-hebees-blue)]" />
                <span className="mt-1 text-sm font-medium text-gray-700">업로드</span>
                <span className="text-xs text-gray-500">{current.steps.UPLOAD.toFixed(1)}%</span>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.UPLOAD}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <Zap className="h-12 w-12 text-[var(--color-hebees-blue)]" />
                <span className="mt-1 text-sm font-medium text-gray-700">데이터 정제</span>
                <span className="text-xs text-gray-500">
                  {current.steps.EXTRACTION.toFixed(1)}%
                </span>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.EXTRACTION}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <Database className="h-12 w-12 text-[var(--color-hebees-blue)]" />
                <span className="mt-1 text-sm font-medium text-gray-700">임베딩 생성</span>
                <span className="text-xs text-gray-500">{current.steps.EMBEDDING.toFixed(1)}%</span>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.EMBEDDING}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <CircleCheck className="h-12 w-12 text-[var(--color-hebees-blue)]" />
                <span className="mt-1 text-sm font-medium text-gray-700">Vector 저장</span>
                <span className="text-xs text-gray-500">
                  {current.steps.VECTOR_STORE.toFixed(1)}%
                </span>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.VECTOR_STORE}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-700">전체 진행률</p>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-[var(--color-retina)] transition-all"
                  style={{ width: `${current.overall}%` }}
                />
              </div>
              {summary && (
                <div className="mt-1 text-xs text-gray-700">
                  {summary.completed} / {summary.total} 완료
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          {overallStatus === 'RUNNING' && '벡터화가 진행 중입니다...'}
          {overallStatus === 'DONE' && '벡터화가 모두 완료되었습니다!'}
          {overallStatus === 'ERROR' && '진행 중 오류가 발생했습니다.'}
        </div>
      </div>
    </section>
  );
}
