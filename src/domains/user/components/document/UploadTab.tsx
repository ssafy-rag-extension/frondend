import { useMemo, useRef, useState } from 'react';
import FileDropzone from '@/shared/components/file/FileUploader';
import UploadedFileList from '@/shared/components/file/UploadedFileList';
import FileNameConflictModal from '@/shared/components/file/FileNameConflictModal';
import type { ConflictDecision } from '@/shared/components/file/FileNameConflictModal';
import type { UploadedDoc as UDoc } from '@/shared/components/file/UploadedFileList';
import { uploadFiles } from '@/shared/api/file.api';

type UploadPayload = { files: File[]; category: string; categoryName?: string };

export default function UploadTab() {
  const [uploadedDocs, setUploadedDocs] = useState<UDoc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictTargetName, setConflictTargetName] = useState('');
  const [conflictSuggested, setConflictSuggested] = useState('');
  const resolverRef = useRef<(d: ConflictDecision) => void>();

  const splitName = (name: string) => {
    const idx = name.lastIndexOf('.');
    return idx <= 0 ? { base: name, ext: '' } : { base: name.slice(0, idx), ext: name.slice(idx) };
  };

  const suggestNextName = (name: string, existing: Set<string>) => {
    const { base, ext } = splitName(name);
    let i = 1;
    let candidate = `${base} (${i})${ext}`;
    while (existing.has(candidate)) {
      i += 1;
      candidate = `${base} (${i})${ext}`;
    }
    return candidate;
  };

  const showConflictModal = (fileName: string, suggested: string) =>
    new Promise<ConflictDecision>((resolve) => {
      resolverRef.current = resolve;
      setConflictTargetName(fileName);
      setConflictSuggested(suggested);
      setConflictOpen(true);
    });

  const resolveConflict = (d: ConflictDecision) => {
    setConflictOpen(false);
    resolverRef.current?.(d);
  };

  const renameFile = (file: File, newName: string) =>
    new File([file], newName, { type: file.type, lastModified: file.lastModified });

  const detectType = (f: File): UDoc['type'] => {
    const name = f.name.toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.md')) return 'md';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'docx';
    if (name.endsWith('.xlsx')) return 'xlsx';
    return 'txt';
  };

  const makeDoc = (f: File, category: string, categoryName?: string): UDoc => ({
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${f.name}`,
    name: f.name,
    sizeKB: f.size / 1024,
    uploadedAt: new Date().toLocaleString(),
    category: categoryName ?? category,
    categoryId: category,
    type: detectType(f),
    file: f,
  });

  const handleUpload = async ({ files, category, categoryName }: UploadPayload) => {
    const existingNames = new Set(uploadedDocs.map((d) => d.name));
    const nameToDoc = new Map(uploadedDocs.map((d) => [d.name, d]));
    const toAdd: UDoc[] = [];
    const replace = new Map<string, UDoc>();

    for (const file of files) {
      const name = file.name;

      if (!existingNames.has(name)) {
        toAdd.push(makeDoc(file, category, categoryName));
        existingNames.add(name);
        continue;
      }

      const suggestion = suggestNextName(name, existingNames);
      const decision = await showConflictModal(name, suggestion);

      if (decision.action === 'overwrite') {
        const old = nameToDoc.get(name)!;
        const updated: UDoc = {
          ...old,
          sizeKB: file.size / 1024,
          uploadedAt: new Date().toLocaleString(),
          category: categoryName ?? category,
          categoryId: category,
          type: detectType(file),
          file,
          status: undefined,
          fileNo: undefined,
        };
        replace.set(name, updated);
        continue;
      }

      if (decision.action === 'rename') {
        const newName = decision.newName.trim();
        const newFile = renameFile(file, newName);
        toAdd.push(makeDoc(newFile, category, categoryName));
        existingNames.add(newName);
        continue;
      }
    }

    setUploadedDocs((prev) => {
      const updated = prev.map((d) => (replace.has(d.name) ? (replace.get(d.name) as UDoc) : d));
      return [...toAdd, ...updated];
    });
  };

  const ingestSelected = async () => {
    const targets = uploadedDocs.filter((d) => selectedIds.includes(d.id) && d.file);
    if (targets.length === 0) return;

    setUploadedDocs((prev) =>
      prev.map((doc) =>
        selectedIds.includes(doc.id) ? ({ ...doc, status: 'pending' } as UDoc) : doc
      )
    );

    const grouped = targets.reduce<Record<string, UDoc[]>>((acc, doc) => {
      const key = doc.categoryId ?? doc.category ?? '기타';
      (acc[key] ||= []).push(doc);
      return acc;
    }, {});

    for (const [categoryNo, docs] of Object.entries(grouped)) {
      try {
        const files = docs.map((d) => d.file!).filter(Boolean);
        const { data } = await uploadFiles({ files, categoryNo });
        const fileNos: string[] = (data?.data?.fileNos ?? []).map((v: unknown) => String(v));

        setUploadedDocs((prev) => {
          const idxById = new Map(docs.map((d, i) => [d.id, i]));
          return prev.map((doc) => {
            const idx = idxById.get(doc.id);
            if (idx === undefined) return doc;
            const next: UDoc = {
              ...doc,
              status: 'uploaded',
              fileNo: fileNos[idx],
            };
            return next;
          });
        });
      } catch (err) {
        console.error('uploadFiles error (category:', categoryNo, ')', err);
        const idSet = new Set(docs.map((d) => d.id));
        setUploadedDocs((prev) =>
          prev.map((doc) => (idSet.has(doc.id) ? ({ ...doc, status: 'failed' } as UDoc) : doc))
        );
      }
    }
  };

  const handleDownload = (id: string) => {
    const doc = uploadedDocs.find((d) => d.id === id);
    if (!doc?.file) return;
    const url = URL.createObjectURL(doc.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (ids: string[]) => {
    setUploadedDocs((prev) => prev.filter((d) => !ids.includes(d.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const selectedDocs = useMemo(
    () => uploadedDocs.filter((d) => selectedIds.includes(d.id)),
    [uploadedDocs, selectedIds]
  );

  const selectedKB = useMemo(
    () => selectedDocs.reduce((s, d) => s + (d.sizeKB ?? 0), 0),
    [selectedDocs]
  );

  const selectedStr =
    selectedKB >= 1024 ? `${(selectedKB / 1024).toFixed(1)} MB` : `${selectedKB.toFixed(1)} KB`;

  const hasPending = selectedDocs.some((d) => d.status === 'pending');
  const canIngest = selectedIds.length > 0 && !hasPending;

  return (
    <>
      <FileDropzone
        onUpload={handleUpload}
        accept=".pdf,.md,.doc,.docx,.xlsx"
        maxSizeMB={100}
        className="mt-4"
        brand="retina"
        defaultCategory="기타"
      />

      <UploadedFileList
        docs={uploadedDocs}
        onDownload={handleDownload}
        onDelete={handleDelete}
        brand="retina"
        onSelectChange={setSelectedIds}
      />

      {selectedIds.length > 0 && (
        <div className="mt-6">
          <div className="mx-auto w-full rounded-xl border p-4 bg-white/95 shadow-sm backdrop-blur">
            <div className="flex justify-between items-center gap-3">
              <p className="text-sm text-gray-700">
                선택 {selectedIds.length}개 · {selectedStr}
              </p>

              <button
                type="button"
                onClick={ingestSelected}
                disabled={!canIngest}
                className={`px-4 py-2 text-sm font-semibold rounded text-white ${
                  canIngest
                    ? 'bg-[var(--color-retina)] hover:bg-[var(--color-retina)]/90'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                title={
                  !canIngest
                    ? '업로드할 파일을 선택하거나 진행 중 업로드가 끝날 때까지 기다려주세요.'
                    : undefined
                }
              >
                문서 업로드
              </button>
            </div>
          </div>
        </div>
      )}

      <FileNameConflictModal
        open={conflictOpen}
        fileName={conflictTargetName}
        suggested={conflictSuggested}
        onClose={resolveConflict}
      />
    </>
  );
}
