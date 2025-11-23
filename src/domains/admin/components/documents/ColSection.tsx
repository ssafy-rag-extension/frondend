import { Folder, FileText, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RawMyDoc } from '@/shared/types/file.types';
import type { documentDatatype } from '@/domains/admin/types/documents.types';
import { getDocInCollections, getCollections } from '@/domains/admin/api/documents.api';
import Checkbox from '@/shared/components/controls/Checkbox';

type ColSectionProps = {
  selectedCollection: string | null;
  onCollectionSelect: (name: string | null) => void;
  uploadedFiles?: RawMyDoc[];
};

export default function ColSection({ selectedCollection, onCollectionSelect }: ColSectionProps) {
  const [openCollection, setOpenCollection] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState<Record<string, number>>({});
  const [docsByCollection, setDocsByCollection] = useState<Record<string, documentDatatype[]>>({});
  const FILES_PER_PAGE = 5;

  const { data: collectionsResult } = useQuery({
    queryKey: ['collections', { filter: true }],
    queryFn: () => getCollections({ filter: true }),
    staleTime: 1000 * 60 * 10,
  });

  const collections = collectionsResult?.data ?? [];

  const handleToggleOpen = (collectionNo: string) => {
    setOpenCollection((prev) => ({
      ...prev,
      [collectionNo]: !prev[collectionNo],
    }));
    onCollectionSelect(collectionNo);
  };

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs', selectedCollection],
    queryFn: () => getDocInCollections(selectedCollection!).then((res) => res.data),
    enabled: !!selectedCollection && !!openCollection[selectedCollection],
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (docs && selectedCollection) {
      setDocsByCollection((prev) => ({
        ...prev,
        [selectedCollection]: docs,
      }));
    }
  }, [docs, selectedCollection]);

  const handleSelectCollection = (collectionName: string) => {
    const newSelection = selectedCollection === collectionName ? null : collectionName;
    onCollectionSelect(newSelection);
  };

  return (
    <section className="flex flex-col min-h-[475px] w-full h-full p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Folder className="w-5 h-5 text-[var(--color-hebees)]" />
        <h3 className="text-xl font-semibold text-gray-900">저장할 컬렉션 선택</h3>
      </div>

      <div className="space-y-4">
        {collections.map((col) => {
          const rawDocs = docsByCollection[col.collectionNo];
          const safeDocs = Array.isArray(rawDocs) ? rawDocs : [];

          const totalPages = Math.ceil(safeDocs.length / FILES_PER_PAGE);

          const currentPage = page[col.collectionNo] || 1;
          const startIndex = (currentPage - 1) * FILES_PER_PAGE;
          const visibleFiles = safeDocs.slice(startIndex, startIndex + FILES_PER_PAGE);

          return (
            <div
              key={col.collectionNo}
              className={`border rounded-lg px-4 py-3 transition cursor-pointer ${
                selectedCollection === col.name
                  ? 'bg-[var(--color-hebees-bg)]/40 ring-1 ring-[var(--color-hebees)]'
                  : 'hover:bg-[var(--color-hebees-bg)] hover:ring-1 hover:ring-[var(--color-hebees)]'
              }`}
              onClick={() => handleSelectCollection(col.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 font-medium text-gray-800">
                  <div className="w-8 h-8 bg-[var(--color-hebees)] rounded-md flex items-center justify-center">
                    <Folder size={18} className="text-white" />
                  </div>
                  {col.name}
                </div>

                <div className="flex items-center gap-3">
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                    <Checkbox
                      checked={selectedCollection === col.name}
                      onChange={() => handleSelectCollection(col.name)}
                      brand="hebees"
                    />
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOpen(col.collectionNo);
                    }}
                    className="flex items-center text-sm text-gray-500 hover:text-[var(--color-hebees)] transition"
                  >
                    {openCollection[col.collectionNo] ? (
                      <>
                        <ChevronDown size={15} />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronRight size={15} />
                        보기
                      </>
                    )}
                  </button>
                </div>
              </div>

              {openCollection[col.collectionNo] && (
                <>
                  <ul className="pl-4 text-sm text-gray-700 space-y-2 mt-3">
                    {isLoading && selectedCollection === col.collectionNo ? (
                      <li className="text-gray-400 text-sm animate-pulse py-2">
                        문서 목록을 불러오는 중...
                      </li>
                    ) : visibleFiles.length === 0 ? (
                      <li className="text-gray-400 text-sm py-2">등록된 문서가 없습니다.</li>
                    ) : (
                      visibleFiles.map((file) => (
                        <li
                          key={file.fileNo}
                          className="flex items-center justify-between border-b border-gray-100 py-3 pr-3 last:border-none group"
                        >
                          <div className="relative flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md bg-[var(--color-hebees-bg)] flex items-center justify-center">
                              <FileText size={16} className="text-[var(--color-hebees)]" />
                            </div>

                            <span className="truncate max-w-[260px] text-[14px] font-medium text-gray-800">
                              {file.name}
                            </span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 items-center mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPage((prev) => ({
                            ...prev,
                            [col.collectionNo]: Math.max((prev[col.collectionNo] || 1) - 1, 1),
                          }));
                        }}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2 py-1 text-gray-600 text-xs hover:text-[var(--color-hebees)] disabled:opacity-40"
                      >
                        <ChevronLeft size={10} />
                        이전
                      </button>

                      <span className="text-xs font-medium">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPage((prev) => ({
                            ...prev,
                            [col.collectionNo]: Math.min(
                              (prev[col.collectionNo] || 1) + 1,
                              totalPages
                            ),
                          }));
                        }}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-2 py-1 text-gray-600 text-xs hover:text-[var(--color-hebees)] disabled:opacity-40"
                      >
                        다음
                        <ChevronRight size={10} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
