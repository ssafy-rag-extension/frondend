import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import Select from '@/shared/components/Select';
import ConfirmModal from '@/shared/components/ConfirmModal';
import { toast } from 'react-toastify';

import type { PromptType, Prompt } from '@/domains/admin/types/rag-settings/prompts.types';
import {
  getPrompts,
  getPromptDetail,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from '@/domains/admin/api/rag-settings/prompts.api';

type Props = {
  /** 외부 시그니처 유지를 위해 남겨둠 */
  storageKey: string;
  /** 서버 로딩 전 임시로 보여줄 초기 프롬프트 (선택) */
  initialPrompts?: Array<{ id: string; name: string; content: string }>;
  onChange?: (prompts: Prompt[]) => void;
};

const DEFAULT_TYPE: PromptType = 'user';
const makeDescription = (content: string, max = 120) =>
  (content ?? '').replace(/\s+/g, ' ').slice(0, max);

export default function PromptManager({ initialPrompts, onChange }: Props) {
  // 목록/선택/드래프트
  const [prompts, setPrompts] = useState<Prompt[]>(
    (initialPrompts ?? []).map((p) => ({
      promptNo: p.id,
      name: p.name,
      content: p.content,
      type: DEFAULT_TYPE,
      description: makeDescription(p.content),
    }))
  );
  const [selectedNo, setSelectedNo] = useState<string | null>(prompts[0]?.promptNo ?? null);
  const [draft, setDraft] = useState<Prompt | null>(prompts[0] ?? null);

  // 모드/상태
  const [isNew, setIsNew] = useState(false); // 신규 작성 모드
  const [isEditing, setIsEditing] = useState(false); // 편집 모드
  const [isDirty, setIsDirty] = useState(false);

  // 모달 & 로딩
  const [openDelete, setOpenDelete] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 목록 로드 + 기본 선택/상세
  const reloadList = async (selectAfter?: string | null) => {
    setListLoading(true);

    const { data } = await getPrompts({ pageNum: 1, pageSize: 100 });

    setPrompts(data);
    onChange?.(data);

    const nextId = selectAfter ?? data[0]?.promptNo ?? null;
    setSelectedNo(nextId);

    if (nextId) {
      const detail = await getPromptDetail(nextId);
      setDraft(detail);
      setIsEditing(false);
      setIsNew(false);
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsEditing(false);
      setIsNew(false);
      setIsDirty(false);
    }

    setListLoading(false);
  };

  useEffect(() => {
    reloadList(selectedNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => (selectedNo ? (prompts.find((p) => p.promptNo === selectedNo) ?? null) : null),
    [prompts, selectedNo]
  );

  const selectOptions = useMemo(
    () =>
      prompts.map((p) => ({
        label: p.name,
        value: p.promptNo,
        desc: p.description || makeDescription(p.content ?? ''),
      })),
    [prompts]
  );

  // 선택 → 보기 모드
  const handleSelect = async (id: string) => {
    setDetailLoading(true);

    const detail = await getPromptDetail(id);
    setSelectedNo(id);
    setDraft(detail);

    setIsNew(false);
    setIsEditing(false);
    setIsDirty(false);

    setDetailLoading(false);
  };

  // 새 프롬프트 → 편집 폼
  const addNew = () => {
    setDraft({
      promptNo: '',
      name: '',
      content: '',
      type: DEFAULT_TYPE,
      description: '',
    });
    setSelectedNo(null);
    setIsNew(true);
    setIsEditing(true);
    setIsDirty(true);
  };

  // 보기 → 편집
  const startEdit = () => {
    if (!selected) return;
    // draft는 이미 최신 상세이므로 모드만 전환
    setIsEditing(true);
    setIsNew(false);
  };

  // 편집/신규 → 취소
  const cancelEdit = () => {
    if (isNew) {
      // 신규 취소: 목록 기준으로 복귀
      setIsNew(false);
      setIsEditing(false);
      setIsDirty(false);
      if (prompts[0]) {
        setSelectedNo(prompts[0].promptNo);
        getPromptDetail(prompts[0].promptNo).then((d) => setDraft(d));
      } else {
        setSelectedNo(null);
        setDraft(null);
      }
      return;
    }
    // 기존 항목 편집 취소 → 상세 원복
    if (selectedNo) {
      getPromptDetail(selectedNo).then((d) => setDraft(d));
    }
    setIsEditing(false);
    setIsDirty(false);
  };

  // 삭제 확정
  const confirmDelete = async () => {
    if (!selected) return;

    setDeleting(true);
    await deletePrompt(selected.promptNo);

    toast.success('프롬프트가 삭제되었습니다.');
    setOpenDelete(false);

    await reloadList(null);
    setDeleting(false);
  };

  // 저장 (신규/수정 공용)
  const save = async () => {
    if (!(draft && (isDirty || isNew))) return;

    const payload = {
      name: draft.name?.trim(),
      type: draft.type ?? DEFAULT_TYPE,
      description:
        (draft.description && draft.description.trim()) || makeDescription(draft.content ?? ''),
      content: draft.content ?? '',
    };

    if (!payload.name) return toast.warn('이름을 입력해주세요.');
    if (!payload.content) return toast.warn('내용을 입력해주세요.');

    setSaving(true);

    if (isNew || !draft.promptNo) {
      const createdNo = await createPrompt(payload);
      toast.success('프롬프트가 생성되었습니다.');
      await reloadList(createdNo);
    } else {
      const updated = await updatePrompt(draft.promptNo, payload);
      // 로컬 목록 라벨 갱신
      setPrompts((prev) =>
        prev.map((p) => (p.promptNo === updated.promptNo ? { ...p, ...updated } : p))
      );
      setDraft(updated);
      setIsDirty(false);
      setIsEditing(false);
      toast.success('프롬프트가 저장되었습니다.');
    }

    setSaving(false);
    setIsNew(false);
  };

  return (
    <>
      {/* 상단 액션 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-xs w-full">
          <Select
            value={isNew ? null : selectedNo}
            onChange={(id) => handleSelect(id)}
            options={selectOptions}
            placeholder={listLoading ? '불러오는 중…' : '프롬프트 선택'}
            disabled={listLoading || prompts.length === 0}
          />
        </div>

        {/* 새 프롬프트 */}
        <button
          type="button"
          onClick={addNew}
          disabled={detailLoading || saving}
          className={[
            'inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-all',
            'border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-hebees)] focus-visible:ring-offset-1',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <Plus className="size-4" />새 프롬프트
        </button>

        {/* 수정 (보기 모드일 때만 노출) */}
        {!isNew && !isEditing && selected && (
          <button
            type="button"
            onClick={startEdit}
            disabled={detailLoading}
            className={[
              'inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-all',
              'border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-hebees)] focus-visible:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            수정
          </button>
        )}

        {/* 삭제 */}
        <button
          type="button"
          onClick={() => setOpenDelete(true)}
          disabled={isNew || !selected || detailLoading || deleting}
          className={[
            'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-all',
            deleting
              ? 'border border-red-300 bg-red-50 text-red-500'
              : 'border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-1',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <Trash2 className="size-4" />
          {deleting ? '삭제 중…' : '삭제'}
        </button>

        {/* 저장 (편집/신규일 때만 활성) */}
        <button
          type="button"
          onClick={save}
          disabled={
            !(draft && (isDirty || isNew)) || saving || detailLoading || !(isNew || isEditing)
          }
          className={[
            'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-all',
            saving
              ? 'bg-[var(--color-hebees)]/70 text-white'
              : 'bg-[var(--color-hebees)] text-white hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-hebees)] focus-visible:ring-offset-1',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <Save className="size-4" />
          {saving ? '저장 중…' : '저장'}
        </button>

        {/* 취소 (편집/신규일 때만 노출) */}
        {(isNew || isEditing) && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={detailLoading || saving}
            className={[
              'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all',
              'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            취소
          </button>
        )}
      </div>

      {/* 본문: 보기/편집 토글 */}
      {isNew || isEditing ? (
        // 편집/신규 폼
        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">프롬프트 이름</label>
            <input
              className="
                w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm 
                focus:border-[var(--color-hebees)] focus:bg-[var(--color-hebees-bg)]
                focus:ring-0 transition-all placeholder:text-gray-400
              "
              value={draft?.name ?? ''}
              onChange={(e) => {
                if (!draft) return;
                setDraft((d) => ({ ...(d as Prompt), name: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="예: 요약 시스템 프롬프트"
              disabled={!draft || detailLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">프롬프트 내용</label>
            <textarea
              className="
                w-full min-h-[300px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-6
                focus:border-[var(--color-hebees)] focus:bg-[var(--color-hebees-bg)]
                focus:ring-0 transition-all placeholder:text-gray-400
              "
              value={draft?.content ?? ''}
              onChange={(e) => {
                if (!draft) return;
                const content = e.target.value;
                setDraft((d) => ({
                  ...(d as Prompt),
                  content,
                  description: makeDescription(content),
                  type: d?.type ?? DEFAULT_TYPE,
                }));
                setIsDirty(true);
              }}
              placeholder="프롬프트 지시문을 입력하세요 ({{variable}} 변수를 사용할 수 있어요)"
              disabled={!draft || detailLoading}
            />
          </div>
        </div>
      ) : (
        // 보기 카드
        <div className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">프롬프트 이름</div>
              <div className="mt-0.5 text-base font-semibold text-gray-900">
                {selected?.name ?? '-'}
              </div>
            </div>
            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {(draft?.type ?? selected?.type) === 'system' ? 'SYSTEM' : 'USER'}
            </span>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-500">프롬프트 내용</div>
            <pre className="mt-1 whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
              {selected?.content || '내용이 없습니다.'}
            </pre>
          </div>
        </div>
      )}

      <ConfirmModal
        open={openDelete}
        onClose={() => !deleting && setOpenDelete(false)}
        onConfirm={confirmDelete}
        title="프롬프트를 삭제할까요?"
        message={`"${selected?.name ?? ''}" 프롬프트를 삭제하면 되돌릴 수 없습니다.`}
        confirmText={deleting ? '삭제 중…' : '삭제'}
        cancelText="취소"
        variant="danger"
      />
    </>
  );
}
