import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { FileText, CloudUpload, Zap, Database, CircleCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { VectorizationItem } from '@/domains/admin/types/documents.types';
import type {
  IngestStreamProgress,
  IngestStreamSummary,
} from '@/domains/admin/components/rag-test/types';

import { getVectorizationProgress } from '@/domains/admin/api/documents.api';
import { useAuthStore } from '@/domains/auth/store/auth.store';
import Pagination from '@/shared/components/Pagination';
import { toast } from 'react-toastify';

const validSteps = ['UPLOAD', 'EXTRACTION', 'EMBEDDING', 'VECTOR_STORE'] as const;
type StepKey = (typeof validSteps)[number];

const isValidStep = (step: unknown): step is StepKey => {
  return typeof step === 'string' && validSteps.includes(step as StepKey);
};

export default function VecProcess({
  isUploadDone,
  setIsUploadDone,
}: {
  isUploadDone: boolean;
  setIsUploadDone: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [pageNum, setPageNum] = useState(1);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [fileStates, setFileStates] = useState<
    Record<
      string,
      {
        overall: number;
        status: VectorizationItem['status'];
        step: VectorizationItem['currentStep'];
        steps: Record<StepKey, number>;
      }
    >
  >({});

  const SPRING_API_BASE_URL = import.meta.env.VITE_SPRING_BASE_URL;
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: progressData, refetch } = useQuery({
    queryKey: ['vectorization-progress', pageNum],
    queryFn: () => getVectorizationProgress(pageNum - 1, 5),
    enabled: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isUploadDone) return;

    setFileStates({});
    setSelectedFile(null);

    queryClient.removeQueries({ queryKey: ['vectorization-progress'] });
    refetch();
  }, [isUploadDone, queryClient, refetch]);

  const items = progressData?.data ?? [];

  const fileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((it) => (map[it.fileNo] = it.fileName));
    return map;
  }, [items]);

  useEffect(() => {
    if (!progressData || !isUploadDone) return;

    const initial: typeof fileStates = {};

    items.forEach((item) => {
      if (item.status === 'COMPLETED') return;

      const steps: Record<StepKey, number> = {
        UPLOAD: 0,
        EXTRACTION: 0,
        EMBEDDING: 0,
        VECTOR_STORE: 0,
      };

      if (isValidStep(item.currentStep)) {
        const idx = validSteps.indexOf(item.currentStep);

        // 이전 단계 자동 완료
        validSteps.slice(0, idx).forEach((s) => (steps[s] = 100));

        // 현재 단계 진행률 반영
        steps[item.currentStep] = item.progressPct ?? 0;
      }

      initial[item.fileNo] = {
        overall: item.overallPct ?? 0,
        status: item.status,
        step: item.currentStep,
        steps,
      };
    });

    setFileStates(initial);
    if (!selectedFile && items.length > 0) {
      setSelectedFile(items[0].fileNo);
    }
  }, [progressData, isUploadDone, items, selectedFile]);

  useEffect(() => {
    if (!isUploadDone) return;

    const es = new EventSourcePolyfill(`${SPRING_API_BASE_URL}/api/v1/ingest/progress/stream`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const update = (payload: IngestStreamProgress) => {
      if (!payload || !payload.fileNo) return;

      setFileStates((prev) => {
        const existing = prev[payload.fileNo] ?? {
          overall: 0,
          status: 'PENDING' as VectorizationItem['status'],
          step: null,
          steps: {
            UPLOAD: 0,
            EXTRACTION: 0,
            EMBEDDING: 0,
            VECTOR_STORE: 0,
          },
        };

        const steps = { ...existing.steps };

        if (isValidStep(payload.currentStep)) {
          const step = payload.currentStep;

          const idx = validSteps.indexOf(step);
          validSteps.slice(0, idx).forEach((s) => (steps[s] = 100));

          steps[step] = payload.progressPct ?? steps[step];
        }

        return {
          ...prev,
          [payload.fileNo]: {
            overall: payload.overallPct ?? existing.overall,
            status: payload.status,
            step: payload.currentStep,
            steps,
          },
        };
      });
    };

    es.addEventListener('progress', (e) => update(JSON.parse((e as MessageEvent).data)));

    es.addEventListener('summary', (e) => {
      const payload: IngestStreamSummary = JSON.parse((e as MessageEvent).data);

      if (payload.completed === payload.total) {
        toast.success('모든 파일 벡터화 완료!');
        es.close();

        setFileStates({});
        setSelectedFile(null);
        setIsUploadDone(false);
      }
    });

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [isUploadDone, SPRING_API_BASE_URL, token, setIsUploadDone]);

  const activeItems = Object.keys(fileStates)
    .map((fileNo) => ({
      fileNo,
      fileName: fileNameMap[fileNo],
      ...fileStates[fileNo],
    }))
    .filter((it) => it.status !== 'COMPLETED');

  const totalPages = Math.ceil(activeItems.length / 5);
  const visibleItems = activeItems.slice((pageNum - 1) * 5, pageNum * 5);

  const current = selectedFile ? fileStates[selectedFile] : null;

  const STEP_ITEMS: { icon: LucideIcon; label: string; key: StepKey }[] = [
    { icon: CloudUpload, label: '업로드', key: 'UPLOAD' },
    { icon: Zap, label: '데이터 정제', key: 'EXTRACTION' },
    { icon: Database, label: '임베딩', key: 'EMBEDDING' },
    { icon: CircleCheck, label: 'Vector 저장', key: 'VECTOR_STORE' },
  ];

  return (
    <section className="grid grid-cols-[1fr_2fr] gap-6 p-6 border rounded-2xl bg-white shadow-sm">
      {/* -------- 좌측 박스 -------- */}
      <div className="bg-white border rounded-2xl p-5 min-h-[340px] flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-[var(--color-hebees)]" />
          <h3 className="text-xl font-semibold text-gray-900">진행 중인 파일</h3>
        </div>

        {activeItems.length === 0 ? (
          <div className="flex flex-col flex-1 items-center justify-center text-gray-400 text-sm">
            진행 중인 파일이 없습니다.
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3.5 overflow-y-auto pr-2">
              {visibleItems.map((item) => (
                <button
                  key={item.fileNo}
                  onClick={() => setSelectedFile(item.fileNo)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedFile === item.fileNo
                      ? 'bg-[var(--color-hebees-bg)]/60 border-[var(--color-hebees)]'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {item.fileName}
                    </span>
                    <span className="text-xs text-gray-600">{item.overall.toFixed(1)}%</span>
                  </div>

                  <div className="mt-2.5 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${item.overall}%`,
                        background: 'linear-gradient(90deg,#BE7DB1,#81BAFF)',
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-center">
              <Pagination pageNum={pageNum} totalPages={totalPages} onPageChange={setPageNum} />
            </div>
          </>
        )}
      </div>

      {/* -------- 우측 박스 -------- */}
      <div className="bg-white border rounded-2xl p-6 min-h-[380px] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-[var(--color-hebees)]" />
          <h3 className="text-xl font-semibold text-gray-900">상세 진행률</h3>
        </div>

        {!current ? (
          <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
            파일을 선택하세요.
          </div>
        ) : (
          <>
            {/* 파일명 카드 */}
            <div className="flex items-center gap-3 mb-10 px-4 py-3 bg-gray-50 border rounded-xl">
              <div className="w-9 h-9 bg-[var(--color-hebees)] rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={18} />
              </div>

              <span className="text-sm font-semibold text-gray-900 truncate max-w-[600px]">
                {selectedFile ? fileNameMap[selectedFile] : ''}
              </span>
            </div>

            {/* 스텝 진행률 */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {STEP_ITEMS.map(({ icon: Icon, label, key }) => (
                <div
                  key={key}
                  className="
        flex flex-col items-center justify-between
        w-full p-4 rounded-xl border
        bg-white hover:bg-gray-50 transition
      "
                >
                  <Icon className="w-7 h-7 text-[var(--color-hebees)] mb-2" />

                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-xs text-gray-500 mt-0.5">
                    {current.steps[key].toFixed(1)}%
                  </span>

                  <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${current.steps[key]}%`,
                        background: 'linear-gradient(90deg,#BE7DB1,#81BAFF)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 전체 진행률 */}
            <div className="mt-auto">
              <span className="text-sm font-medium text-gray-700">전체 진행률</span>

              <div className="h-2.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${current.overall}%`,
                    background: 'linear-gradient(90deg,#BE7DB1,#81BAFF)',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
