import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { fetchMyDocumentsNormalized, getPresignedUrl } from '@/shared/api/file.api';
import type { MyDoc } from '@/shared/types/file.types';
import UploadedFileList, { type UploadedDoc } from '@/shared/components/file/UploadedFileList';
import Pagination from '@/shared/components/Pagination';
import { RefreshCw } from 'lucide-react';

const PAGE_SIZE = 20;

export default function MyDocsTab() {
  const [myDocs, setMyDocs] = useState<MyDoc[]>([]);
  const [pageNum, setPageNum] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    const p = Number(q.get('p') ?? '1');
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reqSeq = useRef(0);

  useEffect(() => {
    let active = true;
    const myReqId = ++reqSeq.current;

    (async () => {
      setLoading(true);
      try {
        const { items, total, totalPages, hasNext } = await fetchMyDocumentsNormalized({
          pageNum,
          pageSize: PAGE_SIZE,
        });

        if (!active || myReqId !== reqSeq.current) return;

        setMyDocs(items);
        setTotal(total);
        setTotalPages(Math.max(1, totalPages));
        setHasNext(hasNext);
      } finally {
        if (active && myReqId === reqSeq.current) setLoading(false);
      }
    })();

    const url = new URL(window.location.href);
    url.searchParams.set('p', String(pageNum));
    window.history.replaceState({}, '', url);

    return () => {
      active = false;
    };
  }, [pageNum, refreshTick]);

  const hasPrev = pageNum > 1;

  const uploadedDocs: UploadedDoc[] = useMemo(
    () =>
      myDocs.map((d) => ({
        id: d.fileNo,
        fileNo: d.fileNo,
        name: d.name,
        sizeKB: d.sizeKB,
        uploadedAt: new Date(d.uploadedAt).toLocaleString(),
        category: d.bucket ?? '기타',
        categoryId: d.categoryNo,
        type: typeof d.type === 'string' ? d.type : 'txt',
        status: 'uploaded',
      })),
    [myDocs]
  );

  const handleDownload = async (fileNo: string) => {
    setDownloadingId(fileNo);
    const doc = myDocs.find((m) => m.fileNo === fileNo);
    const fallbackName = doc?.name || `${fileNo}.bin`;

    try {
      const url = await getPresignedUrl(fileNo, { inline: false });

      const res = await fetch(url);
      const blob = await res.blob();

      const q = new URL(url).searchParams;
      const fromQuery = extractFileName(q.get('response-content-disposition'));
      const fromHeader = extractFileName(res.headers.get('content-disposition'));
      const fileName = fromQuery || fromHeader || fallbackName;

      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl, fileName);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const url = await getPresignedUrl(fileNo, { inline: false });
      triggerDownload(url, fallbackName);
    } finally {
      setDownloadingId(null);
    }
  };

  function triggerDownload(href: string, name: string) {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function extractFileName(dispo: string | null): string {
    if (!dispo) return '';
    const m = /filename\*?=(?:utf-8''|")?([^";]+)/i.exec(decodeSafe(dispo));
    return m?.[1] ? decodeSafe(m[1]) : '';
  }

  function decodeSafe(str: string) {
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }

  return (
    <div className="mt-2">
      <div className="rounded-xl bg-white/95 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{total || '—'}</span>개 문서
          </p>

          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading}
            className={clsx(
              'flex items-center gap-1.5 text-sm rounded-md px-3 py-1',
              'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw size={16} className={clsx(loading && 'animate-spin text-gray-400')} />
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">불러오는 중…</div>
        ) : (
          <UploadedFileList
            docs={uploadedDocs}
            pageSize={Math.max(1, uploadedDocs.length || 1)}
            brand="retina"
            hideFooter
            onDownload={handleDownload}
          />
        )}

        {totalPages > 1 && (
          <Pagination
            pageNum={pageNum}
            totalPages={totalPages}
            hasPrev={hasPrev}
            hasNext={hasNext || pageNum < totalPages}
            isLoading={loading}
            onPageChange={(newPage) => {
              const isNextClick = newPage === pageNum + 1;
              if (newPage < 1) return;
              if (!isNextClick && newPage > totalPages) return;
              if (isNextClick && !(hasNext || pageNum < totalPages)) return;

              setPageNum(newPage);
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            className="mt-4"
          />
        )}
      </div>
    </div>
  );
}
