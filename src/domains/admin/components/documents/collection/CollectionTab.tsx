import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteFile, getPresignedUrl } from '@/shared/api/file.api';
import { toast } from 'react-toastify';
import ColList from '@/domains/admin/components/documents/collection/ColList';
import type { DocItem } from '@/domains/admin/components/rag-test/CollectionDocuments';
import CollectionDocumentsAdm from '@/domains/admin/components/documents/collection/CollectionDocumentsAdm';
import type { Collection } from '@/domains/admin/components/rag-test/types';
import { formatCreatedAt } from '@/shared/utils/date';

export default function CollectionTab() {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<DocItem[]>([]);
  const queryClient = useQueryClient();

  // 1. 문서 다운로드
  const handleDownload = async (fileNo: string) => {
    const doc = selectedDocs.find((m) => m.id === fileNo);
    const fallbackName = doc?.name || `${fileNo}.bin`;

    try {
      const signedUrl = await getPresignedUrl(fileNo, { inline: false });
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error('Failed to fetch file');

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fallbackName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('File download failed:', error);
      const signedUrl = await getPresignedUrl(fileNo, { inline: false });
      window.open(signedUrl, '_blank');
    }
  };

  // 2.  문서 삭제
  const handleDelete = async (ids: string[]) => {
    if (!selectedCollection) return;

    try {
      for (const id of ids) {
        const data = await deleteFile(id);
        const isSuccess = data.deleted;

        if (!isSuccess) {
          toast.error('서버에서 문서를 삭제하지 못했습니다 ❌');
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['docs', selectedCollection.id] });
      setSelectedDocs((prev) => prev.filter((d) => !ids.includes(d.id)));
      toast.success('삭제 완료 ✅');
    } catch (error) {
      toast.error('삭제 실패 ❌');
      console.error('파일 삭제 오류:', error);
    }
  };

  // 3. 문서 새로고침
  const handleRefresh = () => {
    if (!selectedCollection) return;
    queryClient.invalidateQueries({ queryKey: ['docs', selectedCollection.id] });
  };

  // 4. ColList에서 선택된 컬렉션/문서 상태 반영
  const handleCollectionSelect = useCallback((collection: Collection | null, docs: DocItem[]) => {
    setSelectedCollection(collection);

    setSelectedDocs(
      docs.map((d) => ({
        ...d,
        createdAt: d.createdAt ? formatCreatedAt(d.createdAt) : undefined,
      }))
    );
  }, []);

  return (
    <div className="flex gap-4">
      <div className="w-1/5 flex-shrink-0">
        <ColList onCollectionSelect={handleCollectionSelect} />
      </div>

      <div className="w-4/5 flex-shrink-0">
        {selectedCollection ? (
          <CollectionDocumentsAdm
            collection={selectedCollection}
            docs={selectedDocs}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="flex min-h-[400px] h-full items-center justify-center rounded-2xl border bg-white p-8 shadow-sm">
            <p className="text-center text-gray-400">컬렉션을 선택하면 문서 목록이 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
