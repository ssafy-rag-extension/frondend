export default function ChatbotUsage() {
  return (
    <section className="flex gap-4 space-y-2 my-3">
      <div className="flex flex-col w-full items-start justify-center p-4 border border-gray-200 rounded-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-1">챗봇 사용량</h2>
        <p className="text-xs text-gray-400">(일별, 주별, 월별)사용량을 확인할 수 있습니다.</p>
      </div>
    </section>
  );
}
