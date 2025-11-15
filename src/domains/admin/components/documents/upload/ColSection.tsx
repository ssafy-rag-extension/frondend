import { FolderOpen, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RawMyDoc } from '@/shared/types/file.types';
import { getCollections, getDocInCollections } from '@/domains/admin/api/documents.api';
import Pagination from '@/shared/components/Pagination';
import Checkbox from '@/shared/components/controls/Checkbox';
import type { documentDatatype } from '@/domains/admin/types/documents.types';

type ColSectionProps = {
  selectedCollection: string | null;
  onCollectionSelect: (collectionNo: string | null, bucket: string | null) => void;
  uploadedFiles?: RawMyDoc[];
};

type CollectionsApiItem = {
  collectionNo: string;
  name: string;
  bucket?: string | null;
  ingestGroupNo?: string | null;
};

type CollectionsApiResponse = {
  data: CollectionsApiItem[];
  pagination: unknown;
};

type DocsApiResponse = { data: documentDatatype[] };

export default function ColSection({
  selectedCollection,
  onCollectionSelect,
  uploadedFiles: _uploadedFiles,
}: ColSectionProps) {
  const [openCollection, setOpenCollection] = useState<Record<string, boolean>>({});
  const [pageNum, setPageNum] = useState<Record<string, number>>({});
  const FILES_PER_PAGE = 5;

  // 1. 컬렉션 목록 조회
  const { data: collectionsResult } = useQuery<CollectionsApiResponse, Error>({
    queryKey: ['collections', { filter: true }],
    queryFn: () =>
      getCollections({
        filter: true,
      }),
    staleTime: 1000 * 60 * 10,
  });

  const collections: CollectionsApiItem[] = collectionsResult?.data ?? [];

  // 2. 선택된 컬렉션의 문서 목록 조회
  const { data: docsResult } = useQuery<DocsApiResponse, Error, documentDatatype[]>({
    queryKey: ['docs', selectedCollection],
    queryFn: () => getDocInCollections(selectedCollection ?? '').then((res) => res.data),
    enabled: Boolean(selectedCollection),
    staleTime: 1000 * 60 * 10,
    select: (root) => root.data ?? [],
  });

  const docs = docsResult ?? [];

  const toggleOpen = (collectionNo: string) => {
    setOpenCollection((prev) => ({
      ...prev,
      [collectionNo]: !prev[collectionNo],
    }));
  };

  // 3. 서버 bucket 문자열 → 'public' | 'hebees' 로 보정
  const toBucket = (rawBucket?: string | null): string => {
    if (rawBucket === 'public') return 'public';
    return 'hebees';
  };

  const handleSelectCollection = (collectionNo: string) => {
    const col = collections.find((c) => c.collectionNo === collectionNo);
    if (!col) return;

    const isSame = selectedCollection === col.collectionNo;

    if (isSame) {
      onCollectionSelect(null, null);
      return;
    }

    const bucket = toBucket(col.name);
    onCollectionSelect(col.collectionNo, bucket);
  };

  return (
    <section className="flex h-full min-h-[475px] w-full flex-col rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 w-fit bg-[linear-gradient(90deg,#BE7DB1_10%,#81BAFF_100%)] bg-clip-text text-xl font-bold text-transparent">
        저장할 컬렉션 선택
      </h3>

      <div className="space-y-4">
        {collections.map((col) => {
          const colId = col.collectionNo;
          const isSelected = selectedCollection === colId;
          const isOpen = openCollection[colId] ?? false;

          const totalPages = Math.max(1, Math.ceil(docs.length / FILES_PER_PAGE));
          const currentPage = pageNum[colId] ?? 1;
          const safePage = Math.min(Math.max(1, currentPage), totalPages);
          const startIndex = (safePage - 1) * FILES_PER_PAGE;
          const visibleDocs = docs.slice(startIndex, startIndex + FILES_PER_PAGE);

          return (
            <div
              key={colId}
              className={`cursor-pointer rounded-lg border p-3 transition ${
                isSelected
                  ? 'bg-[var(--color-hebees-bg)]/40 ring-1 ring-[var(--color-hebees)]'
                  : 'hover:bg-[var(--color-hebees-bg)]/40 hover:ring-1 hover:ring-[var(--color-hebees)]'
              }`}
              onClick={() => handleSelectCollection(colId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-hebees)]">
                    <FolderOpen className="h-5 w-5 text-[var(--color-white)]" />
                  </div>
                  <span className="truncate">{col.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                    <Checkbox
                      checked={isSelected}
                      brand="hebees"
                      onChange={() => handleSelectCollection(colId)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOpen(colId);
                    }}
                    className="flex items-center gap-1 text-sm text-gray-500 transition hover:text-[var(--color-hebees)]"
                  >
                    {isOpen ? (
                      <>
                        <ChevronDown size={15} />
                        <span>접기</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight size={15} />
                        <span>보기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isOpen && isSelected && (
                <div className="mt-2 space-y-2">
                  <ul className="mt-1 space-y-1 pl-4 text-sm text-gray-700">
                    {docs.length === 0 ? (
                      <li className="text-xs text-gray-400">등록된 문서가 없습니다.</li>
                    ) : (
                      visibleDocs.map((file) => (
                        <li
                          key={file.fileNo}
                          className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-none"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-hebees)]">
                              <FileText size={14} className="text-[var(--color-white)]" />
                            </div>
                            <span className="max-w-[220px] truncate text-xs">{file.name}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>

                  {docs.length > FILES_PER_PAGE && (
                    <Pagination
                      pageNum={safePage}
                      totalPages={totalPages}
                      onPageChange={(next) =>
                        setPageNum((prev) => ({
                          ...prev,
                          [colId]: next,
                        }))
                      }
                      className="mt-1"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
