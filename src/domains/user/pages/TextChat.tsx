import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ChatInput from '@/shared/components/chat/ChatInput';
import ChatMessageItem from '@/shared/components/chat/ChatMessageItem';
import type { UiMsg, UiRole } from '@/shared/components/chat/ChatMessageItem';
import { getMessages, sendMessage, createSession } from '@/shared/api/chat.api';
import ScrollToBottomButton from '@/shared/components/chat/ScrollToBottomButton';
import Select, { type Option } from '@/shared/components/Select';

import type {
  ChatRole,
  MessageItem,
  MessagePage,
  SendMessageRequest,
  SendMessageResult,
  CreateSessionResult,
} from '@/shared/types/chat.types';

const mapRole = (r: ChatRole): UiRole => (r === 'human' ? 'user' : r === 'ai' ? 'assistant' : r);

const deriveSessionNo = (
  pathname: string,
  searchParams: URLSearchParams,
  paramsSessionNo?: string
) => {
  if (paramsSessionNo) return paramsSessionNo;
  const byQuery = searchParams.get('session');
  if (byQuery) return byQuery;
  const legacy = pathname.match(/\/chat\/text:session=([^/]+)/);
  return legacy?.[1] ?? null;
};

type ModelId = 'qwen3-v1:8b' | 'gpt-4o' | 'gemini-1.5 flash' | 'claude-sonnet 3.5';

const MODEL_OPTIONS: Option[] = [
  { value: 'qwen3-v1:8b', label: 'Qwen3-v1:8B', desc: '경량·빠른 추론, 비용 절약형' },
  { value: 'gpt-4o', label: 'GPT-4o', desc: '균형형 멀티모달·고품질' },
  { value: 'gemini-1.5 flash', label: 'Gemini 1.5 Flash', desc: '대용량 컨텍스트·실시간 응답' },
  { value: 'claude-sonnet 3.5', label: 'Claude Sonnet 3.5', desc: '긴 문맥·정교한 추론' },
];

export default function TextChat() {
  const { sessionNo: paramsSessionNo } = useParams<{ sessionNo: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const derivedSessionNo = useMemo(
    () => deriveSessionNo(location.pathname, searchParams, paramsSessionNo),
    [location.pathname, searchParams, paramsSessionNo]
  );

  const [currentSessionNo, setCurrentSessionNo] = useState<string | null>(derivedSessionNo);
  const [list, setList] = useState<UiMsg[]>([]);
  const [awaitingAssistant, setAwaitingAssistant] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const forceScrollRef = useRef(false);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');

  const [model, setModel] = useState<ModelId>('gpt-4o');

  const isAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
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

  useEffect(() => {
    if (!derivedSessionNo) return;
    setCurrentSessionNo(derivedSessionNo);

    const saved = localStorage.getItem(`chat:model:${derivedSessionNo}`) as ModelId | null;
    if (saved && MODEL_OPTIONS.some((o) => o.value === saved)) {
      setModel(saved);
    } else {
      localStorage.setItem(`chat:model:${derivedSessionNo}`, 'gpt-4o');
      setModel('gpt-4o');
    }

    (async () => {
      try {
        const res = await getMessages(derivedSessionNo);
        const page: MessagePage = res.data.result;

        const mapped: UiMsg[] =
          page.data?.map((m: MessageItem) => ({
            role: mapRole(m.role),
            content: m.content,
            createdAt: m.createdAt,
            messageNo: m.messageNo,
            referencedDocuments: m.referencedDocuments,
          })) ?? [];

        setList(mapped);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [derivedSessionNo]);

  useEffect(() => {
    if (!derivedSessionNo) return;

    const needNormalize =
      location.pathname.includes('text:session=') || location.search.includes('session=');

    const targetPath = `/user/chat/text/${derivedSessionNo}`;
    const currentFull = location.pathname + location.search;

    if (needNormalize && currentFull !== targetPath) {
      window.history.replaceState(history.state, '', targetPath);
    }
  }, [derivedSessionNo, location.pathname, location.search]);

  useEffect(() => {
    if (forceScrollRef.current) {
      forceScrollRef.current = false;
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      return;
    }
    if (isAtBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [list.length]);

  const ensureSession = async () => {
    if (currentSessionNo) return currentSessionNo;
    const created = await createSession({});
    const data: CreateSessionResult = created.data.result;
    setCurrentSessionNo(data.sessionNo);
    window.history.replaceState(history.state, '', `/user/chat/text/${data.sessionNo}`);
    localStorage.setItem(`chat:model:${data.sessionNo}`, model);
    return data.sessionNo;
  };

  const handleSend = async (msg: string) => {
    forceScrollRef.current = true;

    setList((prev) => [...prev, { role: 'user', content: msg }]);
    setAwaitingAssistant(true);
    setList((prev) => [...prev, { role: 'assistant', content: '', messageNo: '__pending__' }]);

    try {
      const sessionNo = await ensureSession();
      localStorage.setItem(`chat:model:${sessionNo}`, model);

      const body: SendMessageRequest = { content: msg, model };
      const res = await sendMessage(sessionNo, body);
      const result: SendMessageResult = res.data.result;

      forceScrollRef.current = true;

      setList((prev) =>
        prev.map((it) =>
          it.messageNo === '__pending__'
            ? {
                role: 'assistant',
                content: result.content ?? '(응답이 없습니다)',
                createdAt: result.timestamp,
                // messageNo: result.messageNo,
                // referencedDocuments: result.referencedDocuments,
              }
            : it
        )
      );
    } catch (e) {
      console.error(e);
      toast.error('메시지 전송에 실패했어요.');
      setList((prev) => prev.filter((it) => it.messageNo !== '__pending__'));
    } finally {
      setAwaitingAssistant(false);
    }
  };

  const hasMessages = list.length > 0;

  const thinkingMessages = [
    '문서를 분석하고 있습니다…',
    '핵심 정보를 정리하는 중입니다…',
    '관련 내용을 탐색하고 있습니다…',
    '가장 적절한 답을 구성하고 있습니다…',
    '자료를 기반으로 답변을 조합하고 있습니다…',
    '근거를 기반으로 답변을 다듬고 있습니다…',
    'HEBEES RAG 답변 생성 중입니다…',
  ] as const;

  const [thinkingIdx, setThinkingIdx] = useState(0);

  useEffect(() => {
    if (!awaitingAssistant) {
      setThinkingIdx(0);
      return;
    }
    const t = setInterval(() => {
      setThinkingIdx((i) => (i + 1) % thinkingMessages.length);
    }, 2000);
    return () => clearInterval(t);
  }, [awaitingAssistant, thinkingMessages.length]);

  const handleChangeModel = (next: string) => {
    if (!MODEL_OPTIONS.some((o) => o.value === next)) return;
    const typed = next as ModelId;
    setModel(typed);
    if (currentSessionNo) {
      localStorage.setItem(`chat:model:${currentSessionNo}`, typed);
    }
  };

  return (
    <section className="flex flex-col min-h-[calc(100vh-62px)] z-0 h-full">
      <div className="sticky top-0 z-10 w-full border-b bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[75%] px-12 py-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600">모델</span>
            <Select
              value={model}
              onChange={handleChangeModel}
              options={MODEL_OPTIONS}
              className="w-[260px]"
              placeholder="모델을 선택하세요"
            />
          </div>
        </div>
      </div>

      {hasMessages ? (
        <>
          <div
            ref={scrollRef}
            className="relative flex-1 min-h-0 w-full flex justify-center overflow-y-auto no-scrollbar"
          >
            <div className="w-full max-w-[75%] space-y-10 px-12 py-4">
              {list.map((m, i) => (
                <ChatMessageItem
                  key={m.messageNo ?? i}
                  msg={m}
                  index={i}
                  currentSessionNo={currentSessionNo}
                  isEditing={m.role === 'user' && editingIdx === i}
                  editingDraft={editingDraft}
                  onStartReask={startReask}
                  onCancelReask={cancelReask}
                  onSubmitReask={submitReask}
                  isPendingAssistant={awaitingAssistant && m.role === 'assistant' && !m.content}
                  pendingSubtitle={thinkingMessages[thinkingIdx]}
                  brand="retina"
                />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="sticky bottom-0 shrink-0 w-full flex flex-col items-center">
            <div className="relative w-full flex justify-center mb-4">
              <ScrollToBottomButton
                containerRef={scrollRef}
                watch={list.length}
                className="absolute bottom-0"
              />
            </div>
            <div className="w-full max-w-[75%] pb-6 bg-white">
              <ChatInput onSend={handleSend} variant="retina" />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-[calc(100vh-62px)] flex items-center justify-center px-4">
          <div className="w-full max-w-[75%] flex flex-col items-center gap-6 text-center">
            <ChatInput onSend={handleSend} variant="retina" />
          </div>
        </div>
      )}
    </section>
  );
}
