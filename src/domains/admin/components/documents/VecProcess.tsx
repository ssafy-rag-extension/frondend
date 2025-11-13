import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { FileText, CloudUpload, Zap, Database, CircleCheck } from 'lucide-react';
import type { VectorizationItem } from '@/domains/admin/types/documents.types';
import { getVectorizationProgress } from '@/domains/admin/api/documents.api';
import Pagination from '@/shared/components/Pagination';
import { useAuthStore } from '@/domains/auth/store/auth.store';

// 🔥 단계별 progress 포함한 확장 구조
type FileState = {
  overall: number;
  status: VectorizationItem['status'];
  step: VectorizationItem['currentStep'];
  steps: {
    EXTRACTION: number;
    EMBEDDING: number;
    VECTOR_STORED: number;
  };
};

export default function VecProcess() {
  const [pageNum, setPageNum] = useState(1);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
  const [overallStatus, setOverallStatus] = useState<'IDLE' | 'RUNNING' | 'DONE' | 'ERROR'>('IDLE');
  const validSteps = ['EXTRACTION', 'EMBEDDING', 'VECTOR_STORED'] as const;

  const SPRING_API_BASE_URL = import.meta.env.VITE_SPRING_BASE_URL;
  const token = useAuthStore((s) => s.accessToken);

  // 타입 가드
  const isValidStep = (step: any): step is keyof FileState['steps'] => {
    return validSteps.includes(step);
  };

  // 초기 데이터 조회
  const { data: progressData, refetch } = useQuery({
    queryKey: ['vectorization-progress', pageNum],
    queryFn: () => getVectorizationProgress(pageNum - 1, pageSize),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const items = progressData?.data ?? [];

  //fileNo → fileName 매핑
  const fileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((it: VectorizationItem) => (map[it.fileNo] = it.fileName));
    return map;
  }, [items]);

  // 초기 상태 설정
  useEffect(() => {
    if (!progressData) return;

    const initial: Record<string, FileState> = {};

    items.forEach((item: VectorizationItem) => {
      initial[item.fileNo] = {
        overall: item.overallPct ?? 0,
        status: item.status,
        step: item.currentStep,
        steps: {
          EXTRACTION: item.currentStep === 'EXTRACTION' ? (item.progressPct ?? 0) : 0,
          EMBEDDING: item.currentStep === 'EMBEDDING' ? (item.progressPct ?? 0) : 0,
          VECTOR_STORED: item.currentStep === 'VECTOR_STORED' ? (item.progressPct ?? 0) : 0,
        },
      };
    });

    setFileStates((prev) => ({ ...prev, ...initial }));
    setOverallStatus('RUNNING');

    if (!selectedFile && items.length > 0) {
      setSelectedFile(items[0].fileNo);
    }
  }, [progressData]);

  // SSE 연결
  useEffect(() => {
    if (!token) {
      console.error('No auth token for SSE connection');
      return;
    }

    const eventSource = new EventSourcePolyfill(
      `${SPRING_API_BASE_URL}/api/v1/ingest/progress/stream`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const updateState = (payload: any) => {
      const fileNo = payload.fileNo;
      if (!fileNo) return;

      setFileStates((prev) => {
        const prevState = prev[fileNo] ?? {
          overall: 0,
          status: 'PENDING',
          step: null,
          steps: {
            EXTRACTION: 0,
            EMBEDDING: 0,
            VECTOR_STORED: 0,
          },
        };

        const newSteps = { ...prevState.steps };

        // 현재 단계별 진행률 값 저장
        if (isValidStep(payload.currentStep)) {
          newSteps[payload.currentStep as keyof FileState['steps']] = payload.progressPct ?? 0;
        }

        return {
          ...prev,
          [fileNo]: {
            overall: payload.overallPct ?? prevState.overall,
            status: payload.status,
            step: payload.currentStep,
            steps: newSteps,
          },
        };
      });

      refetch();
      if (payload.status === 'COMPLETED') {
        setOverallStatus('DONE');
      }
    };

    eventSource.addEventListener('heartbeat', () => {});

    eventSource.addEventListener('initial', (event: any) => {
      updateState(JSON.parse(event.data));
      refetch();
    });

    eventSource.addEventListener('progress', (event: any) => {
      updateState(JSON.parse(event.data));
      refetch();
    });

    eventSource.onerror = () => {
      console.error('SSE ERROR');
      setOverallStatus('ERROR');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [token]);

  // 완료된 파일 제거
  useEffect(() => {
    setFileStates((prev) => {
      const newState: Record<string, FileState> = {};

      Object.keys(prev).forEach((fileNo) => {
        const state = prev[fileNo];
        if (state.status !== 'COMPLETED') {
          newState[fileNo] = state;
        }
      });

      return newState;
    });
  }, [
    Object.values(fileStates)
      .map((s) => s.status)
      .join(','),
  ]);

  // 완료된 파일 제외, fileStates기반으로 보여줌
  const activeItems = Object.keys(fileStates)
    .map((fileNo) => ({
      fileNo,
      fileName: fileNameMap[fileNo],
      ...fileStates[fileNo],
    }))
    .filter((item) => item.status !== 'COMPLETED');

  const pageSize = 5;
  const totalItems = activeItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedItems = activeItems.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  const current = selectedFile ? fileStates[selectedFile] : null;

  return (
    <section className="grid grid-cols-[2fr_5fr] gap-6 mt-6 p-5 border rounded-xl bg-white">
      {/* ---------------- 왼쪽 목록 ---------------- */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-3 text-gray-800">진행 중인 파일 목록</h3>

        {activeItems.length === 0 ? (
          <div className="text-gray-400 py-10 text-sm text-center">진행중인 파일이 없습니다.</div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {paginatedItems.map((item) => {
              const state = fileStates[item.fileNo];
              const percent = state?.overall ?? 0;

              return (
                <div
                  key={item.fileNo}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedFile === item.fileNo
                      ? 'bg-[var(--color-hebees-bg)]/40 border-[var(--color-hebees)]'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFile(item.fileNo)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate">{item.fileName}</span>
                    <span className="text-xs text-gray-600">{percent.toFixed(1)}%</span>
                  </div>

                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-retina)] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex justify-center">
          <Pagination pageNum={pageNum} totalPages={totalPages} onPageChange={setPageNum} />
        </div>
      </div>

      {/* ---------------- 오른쪽 상세 ---------------- */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-4 text-gray-800">상세 진행률</h3>

        {!current ? (
          <div className="text-gray-400 text-center py-20">파일을 선택하세요.</div>
        ) : (
          <>
            {/* 파일명 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-7 h-7 bg-[var(--color-hebees)] rounded-md flex items-center justify-center">
                <FileText size={17} className="text-white" />
              </div>
              <h3 className="text-sm font-semibold">{fileNameMap[selectedFile!]}</h3>
            </div>

            {/* 단계별 아이콘 + 퍼센트 + 바 */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {/* 1. 업로드 */}
              <div className="flex flex-col items-center">
                <CloudUpload
                  className={`w-12 h-12 ${
                    current.step?.includes('UPLOAD') || current.step?.includes('MINIO')
                      ? 'text-[var(--color-hebees)]'
                      : 'text-[var(--color-hebees-blue)] opacity-50'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700 mt-1">업로드</span>
                <span className="text-xs text-gray-500">{current.overall.toFixed(1)}%</span>

                <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{
                      width: `${
                        current.step?.includes('UPLOAD') || current.step?.includes('MINIO')
                          ? current.overall
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* 2. 데이터 정제 */}
              <div className="flex flex-col items-center">
                <Zap
                  className={`w-12 h-12 ${
                    current.step === 'EXTRACTION'
                      ? 'text-[var(--color-hebees)]'
                      : 'text-[var(--color-hebees-blue)] opacity-50'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700 mt-1">데이터 정제</span>
                <span className="text-xs text-gray-500">
                  {current.steps.EXTRACTION.toFixed(1)}%
                </span>

                <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.EXTRACTION}%` }}
                  />
                </div>
              </div>

              {/* 3. 임베딩 생성 */}
              <div className="flex flex-col items-center">
                <Database
                  className={`w-12 h-12 ${
                    current.step === 'EMBEDDING'
                      ? 'text-[var(--color-hebees)]'
                      : 'text-[var(--color-hebees-blue)] opacity-50'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700 mt-1">임베딩 생성</span>
                <span className="text-xs text-gray-500">{current.steps.EMBEDDING.toFixed(1)}%</span>

                <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.EMBEDDING}%` }}
                  />
                </div>
              </div>

              {/* 4. Vector DB 저장 */}
              <div className="flex flex-col items-center">
                <CircleCheck
                  className={`w-12 h-12 ${
                    current.step === 'VECTOR_STORED'
                      ? 'text-[var(--color-hebees)]'
                      : 'text-[var(--color-hebees-blue)] opacity-50'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700 mt-1">Vector 저장</span>
                <span className="text-xs text-gray-500">
                  {current.steps.VECTOR_STORED.toFixed(1)}%
                </span>

                <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-hebees)] transition-all"
                    style={{ width: `${current.steps.VECTOR_STORED}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 전체 진행률 */}
            <div>
              <p className="text-xs text-gray-700 mb-1">전체 진행률</p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-retina)] transition-all"
                  style={{ width: `${current.overall}%` }}
                />
              </div>
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
