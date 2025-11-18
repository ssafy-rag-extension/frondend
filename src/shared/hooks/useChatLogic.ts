import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { getSession, getMessages, sendMessage } from '@/shared/api/chat.api';
import type { UiMsg, UiRole } from '@/shared/components/chat/message/ChatMessageItem';
import type {
  ChatRole,
  MessageItem,
  MessagePage,
  SendMessageRequest,
  SendMessageResult,
} from '@/shared/types/chat.types';
import {
  useDerivedSessionNo,
  useEnsureSession,
  useThinkingTicker,
} from '@/domains/user/hooks/useChatHelpers';
import { useChatModelStore } from '@/shared/store/useChatModelStore';
import type { RagQueryProcessResult } from '@/shared/types/chat.rag.types';
import { postRagQuery } from '@/shared/api/chat.rag.api';
import { toast } from 'react-toastify';
import { useChatAskStream } from '@/shared/hooks/useChatAskStream';

const mapRole = (r: ChatRole): UiRole => (r === 'human' ? 'user' : r === 'ai' ? 'assistant' : r);

type ChatMode = 'llm' | 'rag';

export function useChatLogic() {
  const { sessionNo: paramsSessionNo } = useParams<{ sessionNo: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const derivedSessionNo = useDerivedSessionNo(location, searchParams, paramsSessionNo, 'user');

  const [currentSessionNo, setCurrentSessionNo] = useState<string | null>(derivedSessionNo);
  const [list, setList] = useState<UiMsg[]>([]);
  const [awaitingAssistant, setAwaitingAssistant] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(Boolean(derivedSessionNo));

  const ensureSession = useEnsureSession(setCurrentSessionNo, 'user');
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const { selectedModel, selectedLlmNo, setSelectedModel } = useChatModelStore();
  const [llmNo, setLlmNo] = useState<string | null>(null);

  const [mode, setMode] = useState<ChatMode>('llm');

  // 🔹 SSE 훅: 세션 기반 스트림 사용 (llm 모드에서 사용)
  const {
    isStreaming,
    answer,
    meta,
    errorText: streamError,
    startStream,
    stopStream,
  } = useChatAskStream({ urlType: 'session' });

  // 🔹 SSE answer → pending assistant 메시지에 반영
  // useEffect(() => {
  //   if (!awaitingAssistant) return;
  //   if (!answer) return;

  //   setList((prev: UiMsg[]) =>
  //     prev.map(
  //       (m: UiMsg): UiMsg =>
  //         m.messageNo === '__pending__' && m.role === 'assistant' ? { ...m, content: answer } : m
  //     )
  //   );
  // }, [answer, awaitingAssistant, setList]);

  // 🔹 SSE answer → pending assistant 메시지에 반영
  useEffect(() => {
    // if (mode !== 'llm') return;
    if (!isStreaming) return;
    if (!answer) return;

    setList((prev: UiMsg[]) =>
      prev.map(
        (m: UiMsg): UiMsg =>
          m.messageNo === '__pending__' && m.role === 'assistant' ? { ...m, content: answer } : m
      )
    );
  }, [answer, isStreaming, mode, setList]);

  // 🔹 스트림 종료 시 meta 정보로 최종 메시지 확정
  useEffect(() => {
    if (isStreaming) return;
    if (!meta) return;
    if (!answer) return;

    setList((prev: UiMsg[]) =>
      prev.map(
        (m: UiMsg): UiMsg =>
          m.messageNo === '__pending__' && m.role === 'assistant'
            ? {
                ...m,
                content: answer,
                createdAt: meta.createdAt ?? m.createdAt,
                messageNo: meta.messageNo ?? m.messageNo,
              }
            : m
      )
    );
  }, [isStreaming, meta, answer, setList]);

  // 🔹 LLM 모드일 때는 SSE 상태에 맞춰 awaitingAssistant 동기화
  useEffect(() => {
    if (mode !== 'llm') return;
    setAwaitingAssistant(isStreaming);
  }, [isStreaming, mode]);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');

  const requestIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!derivedSessionNo) {
        if (!selectedModel) setSelectedModel('Qwen3-vl:8B', selectedLlmNo);
        setInitialLoading(false);
        return;
      }

      setInitialLoading(true);
      setCurrentSessionNo(derivedSessionNo);

      try {
        const [resMsgs, resSess] = await Promise.all([
          getMessages(derivedSessionNo),
          getSession(derivedSessionNo),
        ]);

        const page = resMsgs.data.result as MessagePage;
        const sessionInfo = resSess.data.result as { llmNo?: string; llmName?: string } | undefined;
        const llmName: string = sessionInfo?.llmName ?? selectedModel ?? 'Qwen3-vl:8B';
        const llmNoFromSession = sessionInfo?.llmNo ?? selectedLlmNo;

        setSelectedModel(llmName, llmNoFromSession);
        setLlmNo(llmNoFromSession ?? null);

        const mapped: UiMsg[] =
          (page.data ?? []).map(
            (m: MessageItem): UiMsg => ({
              role: mapRole(m.role),
              content: m.content,
              createdAt: m.createdAt,
              messageNo: m.messageNo,
              referencedDocuments: m.referencedDocuments,
            })
          ) ?? [];

        if (!cancelled) {
          setList(mapped);
        }
      } catch {
        if (!cancelled) {
          setList([]);
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedSessionNo, setSelectedModel]);

  const getOrCreateSessionNo = async (llmName: string, firstMsg: string): Promise<string> => {
    if (currentSessionNo) return currentSessionNo;

    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = ensureSession({ llm: llmName, query: firstMsg })
        .then((sn) => {
          setCurrentSessionNo(sn);
          return sn;
        })
        .finally(() => {
          sessionPromiseRef.current = null;
        });
    }
    return sessionPromiseRef.current;
  };

  const fillPendingAssistant = (content: string, createdAt?: string, messageNo?: string) => {
    setList((prev: UiMsg[]) =>
      prev.map(
        (m: UiMsg): UiMsg =>
          m.messageNo === '__pending__'
            ? {
                role: 'assistant',
                content: content || '(응답이 없습니다)',
                createdAt: createdAt ?? m.createdAt,
                messageNo: messageNo ?? m.messageNo,
              }
            : m
      )
    );
  };

  const stopCurrentResponse = () => {
    if (!awaitingAssistant) return;

    requestIdRef.current = null;
    setAwaitingAssistant(false);

    stopStream();

    setList((prev: UiMsg[]) => prev.filter((m: UiMsg) => m.messageNo !== '__pending__'));
  };

  const handleSend = async (msg: string) => {
    if (awaitingAssistant) return;

    const myRequestId = (requestIdRef.current ?? 0) + 1;
    requestIdRef.current = myRequestId;

    setAwaitingAssistant(true);

    setList((prev) => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '', messageNo: '__pending__' },
    ]);

    try {
      const llmName: string = selectedModel ?? 'Qwen3-vl:8B';
      const sessionNo: string = await getOrCreateSessionNo(llmName, msg);

      if (mode === 'rag') {
        const effectiveLlmNo = llmNo ?? selectedLlmNo;
        if (!effectiveLlmNo) {
          toast.error('LLM 정보가 없습니다. 세션 정보를 다시 불러와 주세요.');
          throw new Error('LLM 정보가 없습니다.');
        }

        const res = await postRagQuery({
          llmNo: effectiveLlmNo,
          sessionNo,
          query: msg,
        });
        const result = res.data.result as RagQueryProcessResult;

        if (requestIdRef.current !== myRequestId) return;

        fillPendingAssistant(
          result.content ?? '(응답이 없습니다)',
          result.createdAt,
          result.messageNo
        );
      } else {
        // const body: SendMessageRequest = { content: msg, model: llmName };
        // const res = await sendMessage(sessionNo, body);
        // const result = res.data.result as SendMessageResult;

        // if (requestIdRef.current !== myRequestId) return;

        // const content = result.content ?? '(응답이 없습니다)';
        // const createdAt = result?.createdAt ?? undefined;
        // const messageNo = result?.messageNo ?? undefined;

        // fillPendingAssistant(content, createdAt, messageNo);
        // 🔹 LLM 모드: SSE 스트림으로 전환
        const body: SendMessageRequest = { content: msg, model: llmName, sessionNo };
        startStream(body);
        // 나머지 응답 채우기는 위에서 만든 useEffect(answer/meta)에서 처리
      }
    } catch (e) {
      console.error(e);
      if (requestIdRef.current === myRequestId) {
        setList((prev: UiMsg[]) => prev.filter((m: UiMsg) => m.messageNo !== '__pending__'));
      }
    } finally {
      if (requestIdRef.current === myRequestId) {
        setAwaitingAssistant(false);
        requestIdRef.current = null;
      }
    }
  };

  const startReask = (idx: number, content: string) => {
    setEditingIdx(idx);
    setEditingDraft(content);
  };
  const cancelReask = () => {
    setEditingIdx(null);
    setEditingDraft('');
  };
  const submitReask = async (value: string) => {
    await handleSend(value);
    setEditingIdx(null);
    setEditingDraft('');
    toast.success('수정된 질문으로 다시 보냈습니다.');
  };

  const thinkingSubtitle = useThinkingTicker(awaitingAssistant);

  return {
    // 상태
    list,
    mode,
    setMode,
    initialLoading,
    awaitingAssistant,
    thinkingSubtitle,
    editingIdx,
    editingDraft,
    currentSessionNo,

    // 메시지 액션
    handleSend,
    startReask,
    cancelReask,
    submitReask,

    // 리스트 setter (스크롤 훅에서 과거 메시지 붙일 때 사용)
    setList,

    stopCurrentResponse,
  };
}
