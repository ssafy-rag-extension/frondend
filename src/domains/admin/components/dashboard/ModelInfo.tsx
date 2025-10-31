export default function ModelInfo() {
  return (
    <section className="flex gap-4 space-y-2 my-3">
      <div className="flex flex-col w-1/2 items-start justify-center p-4 border border-gray-200 rounded-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-1">모델별 토큰 수</h2>
        <p className="text-xs text-gray-400">(일별, 주별, 월별)사용량을 확인할 수 있습니다.</p>
      </div>
      <div className="flex flex-col w-1/2 items-start justify-center p-4 border border-gray-200 rounded-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-1">모델별 응답 시간</h2>
        <p className="text-xs text-gray-400">(일별, 주별, 월별)사용량을 확인할 수 있습니다.</p>
      </div>
    </section>
  );
}
