// 1. 벡터화 진행률(REST + SSE)을 함께 관리하는 커스텀 훅
import { useEffect, useMemo, useState, useRef, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/domains/auth/store/auth.store';
import { getVectorizationProgress } from '@/domains/admin/api/documents.api';
import type { VectorizationItem } from '@/domains/admin/types/documents.types';
import type {
  IngestStreamProgress,
  IngestStreamSummary,
} from '@/domains/admin/components/rag-test/types';

const validSteps = ['UPLOAD', 'EXTRACTION', 'EMBEDDING', 'VECTOR_STORE'] as const;
type Step = (typeof validSteps)[number];

type StepsState = Record<Step, number>;

export type VecOverallStatus = 'IDLE' | 'RUNNING' | 'DONE' | 'ERROR';

export type FileState = {
  overall: number;
  status: VectorizationItem['status'] | 'PENDING';
  step: VectorizationItem['currentStep'] | null;
  steps: StepsState;
};

type SummaryState = {
  completed: number;
  total: number;
};

type UseVectorizationProcessParams = {
  isUploadDone: boolean;
  // 2. 부모에서 필요하면 쓰라고 남겨두지만, 훅 내부에서는 사용하지 않음 (루프 방지)
  setIsUploadDone: Dispatch<SetStateAction<boolean>>;
};

// 3. 스텝 상태 초기값 유틸
const createEmptyStepsState = (): StepsState => ({
  UPLOAD: 0,
  EXTRACTION: 0,
  EMBEDDING: 0,
  VECTOR_STORE: 0,
});

// 4. 유효한 스텝인지 체크
const isValidStep = (step: unknown): step is Step =>
  typeof step === 'string' && (validSteps as readonly string[]).includes(step);

export const useVectorizationProcess = ({ isUploadDone }: UseVectorizationProcessParams) => {
  // 5. 페이지 / 선택 파일 / 파일 상태 / 전체 상태 / 요약 상태
  const [pageNum, setPageNum] = useState(1);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
  const [overallStatus, setOverallStatus] = useState<VecOverallStatus>('IDLE');
  const [summary, setSummary] = useState<SummaryState | null>(null);

  const prevCompletedRef = useRef<number>(0);

  const pageSize = 5;
  const SPRING_API_BASE_URL = import.meta.env.VITE_SPRING_BASE_URL;
  const token = useAuthStore((s) => s.accessToken);

  // 6. REST API로 “현재 진행중인 벡터화 목록 + 파일명” 조회
  const { data: progressData, refetch } = useQuery({
    queryKey: ['vectorization-progress', pageNum],
    queryFn: () => getVectorizationProgress(pageNum - 1, pageSize),
    staleTime: 0,
    enabled: true,
    refetchOnWindowFocus: false,
  });

  // 7. COMPLETED 는 여기서도 필터링해서 사용
  const rawItems: VectorizationItem[] = progressData?.data ?? [];

  // rawItems가 변할 때만 새 items를 만들도록 메모이제이션
  const items: VectorizationItem[] = useMemo(
    () => rawItems.filter((it) => it.status !== 'COMPLETED'),
    [rawItems]
  );

  // 8. fileNo → fileName 매핑
  const fileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((it) => {
      map[it.fileNo] = it.fileName;
    });
    return map;
  }, [items]);

  // 9. REST 응답을 기반으로 초기 스텝/진행률 상태 세팅 (한 번에 스냅샷 느낌)
  useEffect(() => {
    if (!progressData) return;

    const initial: Record<string, FileState> = {};

    items.forEach((item) => {
      const stepState: StepsState = createEmptyStepsState();

      if (isValidStep(item.currentStep)) {
        const currentIndex = validSteps.indexOf(item.currentStep);
        stepState[item.currentStep] = item.progressPct ?? 0;

        for (let i = 0; i < currentIndex; i += 1) {
          const prevStep = validSteps[i];
          stepState[prevStep] = 100;
        }
      }

      initial[item.fileNo] = {
        overall: item.overallPct ?? 0,
        status: item.status,
        step: item.currentStep ?? null,
        steps: stepState,
      };
    });

    setFileStates(initial);

    if (!selectedFile && items.length > 0) {
      setSelectedFile(items[0].fileNo);
    }

    if (items.length > 0) {
      setOverallStatus('RUNNING');
    }
  }, [items, progressData, selectedFile]);

  const completed = summary?.completed ?? 0;

  // 10. 업로드 완료 or summary.completed 증가 시 REST 재조회해서 목록을 최신화
  useEffect(() => {
    let shouldRefetch = false;

    // 업로드 전체가 끝난 경우 한 번 새로고침
    if (isUploadDone) {
      shouldRefetch = true;
    }

    // SSE summary 기준으로 completed 값이 증가했을 때도 새로고침
    if (completed > prevCompletedRef.current) {
      shouldRefetch = true;
    }

    if (!shouldRefetch) return;

    // 다음 비교를 위해 현재 completed 저장
    prevCompletedRef.current = completed;

    refetch();
  }, [isUploadDone, completed, refetch]);

  // 11. SSE로 실시간 진행률 수신 (token 만 바뀔 때 새로 연결, refetch 와는 분리)
  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSourcePolyfill(
      `${SPRING_API_BASE_URL}/api/v1/ingest/progress/stream`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // 11-1. 각 파일의 진행률 상태 업데이트
    const updateState = (payload: IngestStreamProgress) => {
      if (!payload || typeof payload !== 'object') return;
      if (!payload.fileNo) return;

      const fileNo = payload.fileNo;

      setFileStates((prev) => {
        const prevState: FileState = prev[fileNo] ?? {
          overall: 0,
          status: 'PENDING',
          step: null,
          steps: createEmptyStepsState(),
        };

        const newSteps: StepsState = { ...prevState.steps };

        if (isValidStep(payload.currentStep)) {
          const currentIndex = validSteps.indexOf(payload.currentStep);

          newSteps[payload.currentStep] = payload.progressPct ?? 0;

          for (let i = 0; i < currentIndex; i += 1) {
            const prevStep = validSteps[i];
            newSteps[prevStep] = 100;
          }
        }

        if (payload.status === 'COMPLETED' && isValidStep(payload.currentStep)) {
          newSteps[payload.currentStep] = 100;
        }

        return {
          ...prev,
          [fileNo]: {
            overall: payload.overallPct ?? prevState.overall,
            status: payload.status,
            step: payload.currentStep ?? null,
            steps: newSteps,
          },
        };
      });

      setOverallStatus('RUNNING');
    };

    // 11-2. initial(스냅샷) 이벤트
    eventSource.addEventListener('initial', (event) => {
      const msg = event as MessageEvent<string>;
      if (!msg.data) return;

      const payload: IngestStreamProgress = JSON.parse(msg.data);
      updateState(payload);
    });

    // 11-3. 진행(progress) 이벤트
    eventSource.addEventListener('progress', (event) => {
      const msg = event as MessageEvent<string>;
      if (!msg.data) return;

      const payload: IngestStreamProgress = JSON.parse(msg.data);
      updateState(payload);
    });

    // 11-4. summary 이벤트 (부분 완료/전체 완료 상태만 업데이트, 여기서 refetch 안 함 → 루프 방지)
    eventSource.addEventListener('summary', (event) => {
      const msg = event as MessageEvent<string>;
      if (!msg.data) return;

      try {
        const payload: IngestStreamSummary = JSON.parse(msg.data);
        setSummary(payload);

        if (payload.completed === payload.total) {
          toast.success('모든 파일이 업로드 되었습니다!');
          setOverallStatus('DONE');
        }
      } catch (error) {
        console.error('Error parsing summary event data:', error);
      }
    });

    // 11-5. SSE 에러 처리
    eventSource.onerror = () => {
      console.error('SSE ERROR');
      setOverallStatus('ERROR');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [SPRING_API_BASE_URL, token]);

  // 12. 진행 중 아이템만 필터링 + 페이지네이션 + 현재 선택된 파일 계산
  const activeItems = Object.keys(fileStates)
    .map((fileNo) => ({
      fileNo,
      fileName: fileNameMap[fileNo],
      ...fileStates[fileNo],
    }))
    .filter((item) => item.status !== 'COMPLETED');

  const totalItems = activeItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = activeItems.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  const current = selectedFile ? (fileStates[selectedFile] ?? null) : null;

  return {
    pageNum,
    setPageNum,
    selectedFile,
    setSelectedFile,
    fileStates,
    activeItems,
    paginatedItems,
    totalPages,
    current,
    fileNameMap,
    summary,
    overallStatus,
  };
};
