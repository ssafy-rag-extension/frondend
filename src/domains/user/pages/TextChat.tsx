import { useEffect, useRef, useState } from 'react';
import ChatInput from '@/shared/components/ChatInput';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function TextChat() {
  const [list, setList] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSend = async (msg: string) => {
    // 사용자 메시지 추가
    const userMsg: Msg = { role: 'user', content: msg };
    setList(prev => [...prev, userMsg]);

    // TODO: 실제 API 호출
    const assistant: Msg = { role: 'assistant', content: `(${msg}) 에 대한 응답 예시` };
    setList(prev => [...prev, assistant]);
  };

  // 새 메시지 추가될 때마다 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list]);

  const hasMessages = list.length > 0;

  return (
    <section className="h-full flex flex-col min-h-0">
      {hasMessages ? (
        <>
          {/* 스크롤 영역 */}
          <div className="flex-1 min-h-0 overflow-y-auto w-full flex justify-center">
            <div className="w-full max-w-[75%] space-y-4 px-2">
              {list.map((m, i) => (
                <div
                  key={i}
                  className={
                    'max-w-[75%] rounded-md border p-3 ' +
                    (m.role === 'user' ? 'ml-auto bg-gray-900 text-white' : 'bg-white')
                  }
                >
                  <div className="text-xs opacity-70">{m.role}</div>
                  <div>{m.content}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* 하단 입력창 */}
          <div className="w-full flex justify-center pt-6">
            <div className="w-full max-w-[75%]">
              <ChatInput onSend={handleSend} />
            </div>
          </div>
        </>
      ) : (
        /* 비어있을 때: 가운데 정렬 + 웰컴 UI + 중앙 ChatInput */
        <div className="flex-1 grid place-items-center px-4">
          <div className="w-full max-w-[75%] flex flex-col items-center gap-6 text-center">
            {/* (선택) 비어있을 때 보여줄 안내 UI */}
            <div className="text-gray-600">
              <div className="text-xl font-semibold mb-1">레티나 챗봇에 오신 걸 환영해요.</div>
              <div className="text-sm">업로드된 문서를 기반으로 무엇이든 질문해보세요.</div>
            </div>

            <ChatInput onSend={handleSend} />
          </div>
        </div>
      )}
    </section>
  );
}
