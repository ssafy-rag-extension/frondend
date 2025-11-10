import { useState } from 'react';

export type ConflictDecision = { action: 'overwrite' } | { action: 'rename'; newName: string };
interface Props {
  open: boolean;
  fileName: string;
  suggested: string;
  onClose: (d: ConflictDecision) => void;
}

export default function FileNameConflictModal({ open, fileName, suggested, onClose }: Props) {
  const [rename, setRename] = useState(suggested);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">동일한 파일명이 존재합니다</h2>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{fileName}</span> 파일이 이미 있습니다.
          </p>

          <div className="rounded-lg border bg-gray-50 px-3 py-2">
            <label className="text-xs text-gray-500">새 파일 이름</label>
            <input
              className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-retina)]"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            className="rounded-md px-3 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700"
            onClick={() => onClose({ action: 'overwrite' })}
          >
            덮어쓰기
          </button>
          <button
            className="rounded-md px-3 py-2 text-sm font-semibold text-white bg-[var(--color-retina)] hover:bg-[var(--color-retina)]/90"
            onClick={() =>
              onClose({
                action: 'rename',
                newName: (rename || suggested).trim(),
              })
            }
          >
            이름 바꿔 저장
          </button>
        </div>
      </div>
    </div>
  );
}
