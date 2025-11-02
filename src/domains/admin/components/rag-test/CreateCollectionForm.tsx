import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Card from '@/shared/components/Card';
import Select from '@/shared/components/Select';
import { ingestTemplateOptions } from '@/domains/admin/components/rag-settings/options';
import FileDropzone from '@/shared/components/FileUploader';
import type { Collection } from '@/domains/admin/components/rag-test/types';

type Props = {
  onCancel: () => void;
  onCreate: (c: Collection) => void;
};

export function CreateCollectionForm({ onCancel, onCreate }: Props) {
  const navigate = useNavigate();

  const defaultTemplate = (ingestTemplateOptions as any)?.[0]?.value ?? '';

  const [name, setName] = useState('');
  const [template, setTemplate] = useState<string>(defaultTemplate);

  const canCreate = useMemo(() => Boolean(name.trim() && template), [name, template]);

  const handleUpload = async (files: File[]) => {
    // 업로드 API 연동
    console.log(
      '업로드 파일:',
      files.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`)
    );
  };

  const genId = () => globalThis.crypto?.randomUUID?.() ?? `col_${Date.now()}`;

  const handleCreate = () => {
    if (!canCreate) return;
    const newCol = {
      id: genId(),
      name: name.trim(),
      templateId: template,
    } as unknown as Collection;

    onCreate(newCol);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Ingest 템플릿 설정"
          tip="Ingest 템플릿을 통해 테스트할 Collection을 생성하세요."
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] w-full sm:w-auto sm:min-w-[260px]">
              <Select
                value={template}
                onChange={setTemplate}
                options={ingestTemplateOptions as any}
                placeholder="선택하세요"
                aria-label="Ingest 템플릿 선택"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/rag/settings')}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium
                         text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">템플릿 추가하기</span>
            </button>
          </div>
        </Card>

        <Card title="Collection 이름 지정" tip="새 컬렉션 이름을 입력해 등록하세요.">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: HEBEES Test"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-base
                         focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-transparent"
            />
          </div>
        </Card>
      </div>

      <Card title="테스트 문서 업로드">
        <FileDropzone
          onFiles={handleUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          maxSizeMB={50}
          className="mt-4"
        />
      </Card>

      {/* 액션 영역 */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-lg border bg-white px-4 text-sm font-medium
                     text-gray-700 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canCreate}
          onClick={handleCreate}
          className="inline-flex h-9 items-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white
                     hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          생성하기
        </button>
      </div>
    </div>
  );
}
