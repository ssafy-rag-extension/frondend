import type { FileType } from '@/domains/admin/types';
export default function DuplicatedModal({
  duplicates,
  onConfirm,
  onCancel,
}: {
  duplicates: FileType[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <h2>중복 파일 발견</h2>
      <ul>
        {duplicates.map((file) => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>
      <button onClick={onConfirm}>덮어쓰기</button>
      <button onClick={onCancel}>취소</button>
    </div>
  );
}
