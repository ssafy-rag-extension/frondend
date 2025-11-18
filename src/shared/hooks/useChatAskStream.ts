import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source';
import { useAuthStore } from '@/domains/auth/store/auth.store';
import type { SendMessageRequest } from '@/shared/types/chat.types';
import { parseData } from '@/shared/utils/sse';

const base = import.meta.env.VITE_SPRING_BASE_URL;

type ChatInitEvent = {
  messageNo: string;
  role: 'ai';
  createdAt: string;
};

type ChatUpdateEvent = {
  content: string;
};

type UseChatAskStreamOptions = {
  sessionNo?: string;
  urlType?: 'session' | 'plain' | 'rag';
  withCredentials?: boolean;
};

export function useChatAskStream(opts: UseChatAskStreamOptions = {}) {
  const token = useAuthStore.getState().accessToken;
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState('');
  const [meta, setMeta] = useState<ChatInitEvent | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef(0);

  const resolveUrl = useCallback(
    (body: SendMessageRequest) => {
      const urlType = opts.urlType ?? (opts.sessionNo ? 'session' : 'plain');

      if (urlType === 'session') {
        const sessionNo = body.sessionNo ?? opts.sessionNo;
        if (!sessionNo) throw new Error('sessionUrl 사용 시 sessionNo는 필수입니다.');
        console.log('[chat-stream] sessionNo', sessionNo);
        console.log('[chat-stream] urlType', urlType);
        return `${base}/api/v1/chat/sessions/${sessionNo}/ask/stream`;
      }

      if (urlType === 'rag') {
        console.log('[chat-stream] urlType', urlType);
        return `${base}/api/v1/rag/query/process/stream`;
      }

      console.log('[chat-stream] urlType', 'plain');
      return `${base}/api/v1/chat/ask/stream`;
    },
    [opts.sessionNo, opts.urlType]
  );

  const startStream = useCallback(
    (body: SendMessageRequest) => {
      if (!token) {
        setErrorText('로그인이 필요합니다.');
        return;
      }

      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }

      streamIdRef.current += 1;
      const currentStreamId = streamIdRef.current;

      setIsStreaming(true);
      setAnswer('');
      setMeta(null);
      setErrorText(null);

      let url: string;
      try {
        url = resolveUrl(body);
        console.log('[SSE DEBUG] URL:', url);
        console.log('[SSE DEBUG] BODY:', body);
      } catch (e) {
        if (currentStreamId !== streamIdRef.current) {
          return;
        }
        setIsStreaming(false);
        setErrorText(e instanceof Error ? e.message : '요청 URL 생성 실패');
        return;
      }

      const payload: Record<string, unknown> = {};
      if (body.query != null) payload.query = body.query;
      if (body.content != null) payload.content = body.content;
      if (body.llmNo != null) payload.llmNo = body.llmNo;
      if (body.model != null) payload.model = body.model;
      if (body.sessionNo != null) payload.sessionNo = body.sessionNo;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      };

      const controller = new AbortController();
      controllerRef.current = controller;

      const credentials: RequestCredentials = opts.withCredentials ? 'include' : 'same-origin';

      console.log(
        '[SSE DEBUG] fetchEventSource OPTIONS:',
        JSON.stringify(
          {
            url,
            headers,
            credentials,
            payload,
          },
          null,
          2
        )
      );

      void fetchEventSource(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials,
        async onopen(response) {
          if (currentStreamId !== streamIdRef.current) {
            // console.log('[SSE DEBUG] stale onopen, ignore');
            return;
          }

          console.log('[SSE DEBUG] onopen status:', response.status);
          if (response.ok) {
            return;
          }

          if (response.status === 401) {
            setErrorText('로그인이 만료되었어요. 다시 로그인해 주세요.');
          } else {
            setErrorText(`응답 스트림 연결 실패 (status: ${response.status})`);
          }

          setIsStreaming(false);
          controller.abort();
        },
        onmessage(msg: EventSourceMessage) {
          if (currentStreamId !== streamIdRef.current) {
            // console.log('[SSE DEBUG] stale message, ignore');
            return;
          }

          const event = msg.event || 'update';

          if (event === 'init') {
            console.log('[SSE DEBUG] INIT RAW:', msg);
            const data = parseData<ChatInitEvent>(msg.data);
            console.log('[SSE DEBUG] INIT PARSED:', data);
            if (!data) return;
            setMeta(data);
            setErrorText(null);
            return;
          }

          if (event === 'update' || event === 'message') {
            console.log('[SSE DEBUG] UPDATE RAW:', msg);
            const data = parseData<ChatUpdateEvent>(msg.data);
            console.log('[SSE DEBUG] UPDATE PARSED:', data);
            if (!data || !data.content) return;
            setAnswer((prev) => prev + data.content);
          }
        },
        onerror(err) {
          if (currentStreamId !== streamIdRef.current) {
            // console.log('[SSE DEBUG] stale onerror, ignore');
            return;
          }

          console.error('[chat-stream] onerror', err);
          if (controller.signal.aborted) {
            return;
          }
          setIsStreaming(false);
          setErrorText('응답 스트림 처리 중 오류가 발생했어요.');
          controller.abort();
        },
      }).finally(() => {
        if (currentStreamId !== streamIdRef.current) {
          //   console.log('[SSE DEBUG] stale finally, ignore');
          return;
        }

        if (!controller.signal.aborted) {
          setIsStreaming(false);
        }
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        console.log('[SSE DEBUG] stream finished');
      });
    },
    [opts.withCredentials, resolveUrl, token]
  );

  const stopStream = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    // 🔹 stopStream이 호출되면, 더 이상 이 스트림은 최신이 아님
    streamIdRef.current += 1;

    setIsStreaming(false);
    setAnswer(''); // 필요 없으면 여기 지워도 됨
    setMeta(null);
  }, []);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      // 언마운트 시에도 스트림 id 증가시켜서 이후 이벤트 무시
      streamIdRef.current += 1;
    };
  }, []);

  return {
    isStreaming,
    answer,
    meta,
    errorText,
    startStream,
    stopStream,
  };
}
