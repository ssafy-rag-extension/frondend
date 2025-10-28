import { FolderOpen, FileText } from 'lucide-react';
export default function ColList() {
  const dummyCollections = [
    {
      id: 1,
      name: 'public',
      files: [
        { id: 101, name: '헵비스_RAG 실험 데이터셋 요약 보고서.pdf' },
        { id: 102, name: '헵비스_RAG 벡터 변환 테스트 결과.xlsx' },
      ],
    },
    {
      id: 2,
      name: 'private',
      files: [
        { id: 201, name: '내부 검증용 데이터셋 리스트.csv' },
        { id: 202, name: '내부 문서 벡터화 파이프라인 노트.docx' },
      ],
    },
    {
      id: 3,
      name: 'retina',
      files: [
        { id: 301, name: '안경점 고객 피드백 벡터 분석 결과.json' },
        { id: 302, name: '안경 프레임 분류 실험 리포트.pdf' },
      ],
    },
    {
      id: 4,
      name: 'hebees',
      files: [
        { id: 401, name: 'HEBEES 검색 질의 최적화 결과.xlsx' },
        { id: 402, name: 'HEBEES 문서 전처리 가이드라인.txt' },
      ],
    },
    {
      id: 5,
      name: 'logs',
      files: [
        { id: 501, name: 'LLM 호출 로그 기록 2025-10-21.log' },
        { id: 502, name: 'API 요청 응답 분석 메모.md' },
      ],
    },
    {
      id: 6,
      name: 'archive',
      files: [
        { id: 601, name: '이전 RAG 실험 백업 데이터.zip' },
        { id: 602, name: '2025년 상반기 모델 학습 보고서.pdf' },
      ],
    },
  ];

  return (
    <>
      <section className="flex items-center gap-2 mb-4">
        <h1 className="text-3xl font-bold bg-[linear-gradient(90deg,_#BE7DB1_10%,_#81BAFF_100%)] bg-clip-text text-transparent">
          HEBEES RAG
        </h1>
        <h1 className="text-2xl font-[600]">컬렉션 관리</h1>
      </section>
      <section>
        <div className="border rounded-lg p-3 hover:bg-[var(--color-hebees-bg)]/50 transition">
          <section className="space-y-4">
            {dummyCollections.map((col) => (
              <div
                key={col.id}
                className="border rounded-lg p-3 hover:bg-[var(--color-hebees-bg)]/50 transition"
              >
                {/* 컬렉션 헤더 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <div className="w-8 h-8 bg-[var(--color-hebees)] rounded-md flex items-center justify-center">
                      <FolderOpen className="text-[var(--color-white)] w-5 h-5" />
                    </div>
                    {col.name}
                  </div>
                  <input type="checkbox" className="accent-[var(--color-hebees)]" />
                </div>

                {/* 파일 목록 */}
                <ul className="pl-4 text-sm text-gray-700 space-y-2">
                  {col.files.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[var(--color-hebees)] rounded-md flex items-center justify-center">
                          <FileText size={15} className="text-[var(--color-white)]" />
                        </div>
                        <span className="truncate max-w-[260px]">{file.name}</span>
                      </div>
                      <input type="checkbox" className="accent-[var(--color-hebees)]" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </section>
    </>
  );
}
