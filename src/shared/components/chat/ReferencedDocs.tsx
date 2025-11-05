import { useState, useMemo } from 'react';
import {
  FileText,
  File,
  FileSearch,
  Download,
  ExternalLink,
  ChevronDown,
  Link as LinkIcon,
} from 'lucide-react';
import Tooltip from '@/shared/components/Tooltip';
import clsx from 'clsx';

export interface ReferencedDocument {
  fileNo: string;
  name: string;
  title?: string;
  type?: string;
  index: number;
  downloadUrl: string;
  snippet?: string;
}

type Props = {
  docs: ReferencedDocument[];
  collapsedByDefault?: boolean;
  className?: string;
};

const getIconByType = (type?: string) => {
  const t = (type || '').toLowerCase();
  if (['pdf'].includes(t)) return <FileText size={16} className="text-gray-500" />;
  if (['doc', 'docx', 'md', 'txt', 'rtf'].includes(t))
    return <FileText size={16} className="text-gray-500" />;
  if (['xls', 'xlsx', 'csv'].includes(t)) return <FileText size={16} className="text-gray-500" />;
  if (['ppt', 'pptx'].includes(t)) return <FileText size={16} className="text-gray-500" />;
  return <File size={16} className="text-gray-500" />;
};

export default function ReferencedDocs({ docs, collapsedByDefault = false, className }: Props) {
  const [open, setOpen] = useState(!collapsedByDefault);

  const sorted = useMemo(() => {
    // index 기준 오름차순
    return [...docs].sort((a, b) => a.index - b.index);
  }, [docs]);

  if (!docs || docs.length === 0) return null;

  return (
    <div className={clsx('mt-3 rounded-lg border bg-gray-50', className)}>
      {/* header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2"
        aria-expanded={open}
      >
        <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
          <FileSearch size={16} className="text-gray-500" />
          참조 문서 <span className="text-gray-400">({sorted.length})</span>
        </div>
        <ChevronDown
          size={16}
          className={clsx(
            'text-gray-500 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>

      {/* list */}
      {open && (
        <ul className="px-3 pb-2 pt-0 space-y-2">
          {sorted.map((d) => {
            const title = d.title?.trim() || d.name || `문서 #${d.index}`;
            return (
              <li key={d.fileNo} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5 shrink-0">{getIconByType(d.type)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="line-clamp-1 text-sm font-medium text-gray-800">
                          {title}
                        </div>
                        {d.type ? (
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                            {d.type}
                          </span>
                        ) : null}
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          #{d.index}
                        </span>
                      </div>

                      {d.snippet ? (
                        <Tooltip content={d.snippet} side="bottom" shiftX={10}>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{d.snippet}</p>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip content="새 탭에서 열기" side="bottom">
                      <a
                        href={d.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 hover:bg-gray-100"
                        aria-label="open"
                      >
                        <ExternalLink size={16} className="text-gray-600" />
                      </a>
                    </Tooltip>
                    <Tooltip content="URL 복사" side="bottom">
                      <button
                        onClick={() => navigator.clipboard.writeText(d.downloadUrl)}
                        className="rounded p-1 hover:bg-gray-100"
                        aria-label="copy url"
                      >
                        <LinkIcon size={16} className="text-gray-600" />
                      </button>
                    </Tooltip>
                    <Tooltip content="다운로드" side="bottom">
                      <a
                        href={d.downloadUrl}
                        download
                        className="rounded p-1 hover:bg-gray-100"
                        aria-label="download"
                      >
                        <Download size={16} className="text-gray-600" />
                      </a>
                    </Tooltip>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
