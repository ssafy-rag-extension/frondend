import { useState } from 'react';
import clsx from 'clsx';
import type { Collection } from '@/domains/admin/components/rag-test/types';
import { Folder, RefreshCw } from 'lucide-react';
import UploadedFileList from '@/shared/components/file/UploadedFileList';

export type DocItem = {
  id: string;
  name: string;
  sizeKB: number;
  createdAt?: string;
  categoryNo?: string;
  type: string;
  status: string;
};

type Props = {
  collection: Collection;
  docs: DocItem[];
  onUpload?: (files: File[]) => void;
  onDownload?: (id: string) => void;
  onReindex?: (id: string) => void;
  onDelete?: (ids: string[]) => void;
  onRefresh?: () => void | Promise<void>;
};

export default function CollectionDocumentsAdm({
  collection,
  docs,
  onDownload,
  onDelete,
  onRefresh,
}: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. 새로고침 버튼 클릭 핸들러
  const handleRefreshClick = async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="mb-2 text-xl font-bold text-gray-900 sm:mb-0">Collection 문서 목록</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={clsx(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm',
              'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
            {isRefreshing ? '불러오는 중...' : '새로고침'}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-lg bg-[var(--color-hebees)] p-4 text-white">
            <Folder size={24} />
          </div>
          <span className="text-xl font-semibold text-gray-900">{collection.name}</span>
        </div>
      </div>

      <p className="mt-4 mb-2 inline-flex items-center gap-2 rounded-md bg-[var(--color-hebees-bg)] px-3 py-1 text-sm font-normal text-[var(--color-hebees)]">
        <span className="font-bold">TIP</span>
        선택한 문서만 업데이트/다운로드/삭제할 수 있어요.
      </p>

      <UploadedFileList
        docs={docs}
        onDownload={onDownload}
        onDelete={onDelete}
        brand="hebees"
        showStatus
      />
    </div>
  );
}
