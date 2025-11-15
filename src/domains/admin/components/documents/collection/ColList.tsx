import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { getCollections, getDocInCollections } from '@/domains/admin/api/documents.api';
import type { documentDatatype } from '@/domains/admin/types/documents.types';
import type { Collection } from '@/domains/admin/components/rag-test/types';
import type { DocItem } from '@/domains/admin/components/rag-test/CollectionDocuments';

type ColListProps = {
  onCollectionSelect?: (collection: Collection | null, docs: DocItem[]) => void;
};

// 1. 컬렉션 API 응답 타입
type CollectionsApiResponse = {
  data: {
    collectionNo: string;
    name: string;
    ingestGroupNo?: string | null;
  }[];
  pagination: unknown;
};

export default function ColList({ onCollectionSelect }: ColListProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // 2. 컬렉션 목록 불러오기
  const { data: collectionsResult } = useQuery<CollectionsApiResponse, Error>({
    queryKey: ['collections'],
    queryFn: () =>
      getCollections({
        pageNum: 0,
        pageSize: 100,
        filter: false,
      }),
  });

  const collections = useMemo(() => collectionsResult?.data ?? [], [collectionsResult]);

  // 3. 선택된 컬렉션의 문서 불러오기
  const { data: docsResult } = useQuery<{ data: unknown }, Error, documentDatatype[]>({
    queryKey: ['docs', selectedCollectionId],
    queryFn: () => getDocInCollections(selectedCollectionId ?? ''),
    enabled: !!selectedCollectionId,
    select: (root) => {
      const d = root.data;

      if (Array.isArray(d)) return d as documentDatatype[];

      const nested1 = (d as { data?: unknown })?.data;
      if (Array.isArray(nested1)) return nested1 as documentDatatype[];

      const nested2 = (d as { items?: unknown })?.items;
      if (Array.isArray(nested2)) return nested2 as documentDatatype[];

      return [];
    },
  });

  const selectedDocs: DocItem[] = useMemo(
    () =>
      (docsResult ?? []).map((doc) => ({
        id: doc.fileNo,
        name: doc.name,
        sizeKB: Number(doc.size) / 1024,
        createdAt: doc.createdAt,
        categoryNo: doc.categoryNo ?? undefined,
        type: doc.type ?? 'txt',
        status: doc.status,
      })),
    [docsResult]
  );

  // 4. 부모에 선택된 컬렉션 정보 전달
  useEffect(() => {
    if (!onCollectionSelect) return;

    if (!selectedCollectionId) {
      onCollectionSelect(null, []);
      return;
    }

    const col = collections.find((c) => c.collectionNo === selectedCollectionId);
    if (!col) {
      onCollectionSelect(null, []);
      return;
    }

    const mappedCollection: Collection = {
      id: col.collectionNo,
      name: col.name,
      ingestTemplate: col.ingestGroupNo ?? undefined,
    };

    onCollectionSelect(mappedCollection, selectedDocs);
  }, [selectedCollectionId, collections, selectedDocs, onCollectionSelect]);

  return (
    <section className="flex w-full flex-col space-y-3 rounded-xl bg-white">
      {collections.map((col) => {
        const colId = col.collectionNo;
        const isSelected = selectedCollectionId === colId;

        return (
          <button
            key={colId}
            type="button"
            onClick={() => setSelectedCollectionId((prev) => (prev === colId ? null : colId))}
            className={`flex cursor-pointer flex-col rounded-lg border p-3 text-left transition ${
              isSelected
                ? 'bg-[var(--color-hebees-bg)] ring-2 ring-[var(--color-hebees)]'
                : 'hover:bg-[var(--color-hebees-bg)]/50 hover:ring-1 hover:ring-[var(--color-hebees)]'
            }`}
          >
            <div className="flex items-center gap-2 font-medium text-gray-800 truncate">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-hebees)]">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              {col.name}
            </div>
          </button>
        );
      })}
    </section>
  );
}
