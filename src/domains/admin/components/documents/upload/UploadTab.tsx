import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import FileUploader from '@/shared/components/file/FileUploader';
import UploadList from '@/domains/admin/components/documents/upload/UploadList';
import ColSection from '@/domains/admin/components/documents/upload/ColSection';
import SelectVectorization from '@/domains/admin/components/documents/upload/SelectVectorization';
import type { RawMyDoc } from '@/shared/types/file.types';
import { toast } from 'react-toastify';
import VecProcess from '@/domains/admin/components/documents/upload/VecProcess';

export default function UploadTab() {
  // 1. 업로드된 파일 / 컬렉션 매핑 상태
  const [uploadedFiles, setUploadedFiles] = useState<RawMyDoc[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<RawMyDoc[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [finalSelectedFiles, setFinalSelectedFiles] = useState<RawMyDoc[]>([]);

  const [isUploadDone, setIsUploadDone] = useState(false);
  const [runningFiles] = useState<RawMyDoc[]>([]);
  const [, setIsVectorizing] = useState(false);

  // 2. 로컬 파일 업로드 → 임시 목록에 추가
  const handleUpload = ({ files, category }: { files: File[]; category: string }) => {
    if (!files || files.length === 0) return;

    const newFiles: RawMyDoc[] = Array.from(files).map((f) => ({
      fileNo: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      bucket: '',
      path: '',
      status: 'PENDING',
      categoryNo: category,
      collectionNo: '',
      createdAt: new Date().toISOString(),
      originalFile: f,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  // 3. 컬렉션 선택 콜백 (컬렉션 ID + bucket 문자열 전달)
  const handleCollectionSelect = (collectionNo: string | null, bucket: string | null) => {
    setSelectedCollection(collectionNo);
    setSelectedBucket(bucket);
  };

  // 4. 선택한 파일 + 선택한 컬렉션을 최종 벡터화 대상 리스트로 이동
  useEffect(() => {
    if (selectedFiles.length === 0) return;
    if (!selectedCollection || !selectedBucket) return;

    const combined = selectedFiles.map((f) => ({
      ...f,
      collectionNo: selectedCollection,
      bucket: selectedBucket,
    }));

    setFinalSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.fileNo}::${f.collectionNo}`));
      const newOnes = combined.filter((f) => !existingKeys.has(`${f.fileNo}::${f.collectionNo}`));

      if (newOnes.length === 0) {
        toast.error('해당 파일은 이미 선택 목록에 존재합니다.');
        return prev;
      }

      return [...prev, ...newOnes];
    });

    setSelectedFiles([]);
    setSelectedCollection(null);
    setSelectedBucket(null);
  }, [selectedFiles, selectedCollection, selectedBucket]);

  // 5. 최종 선택 리스트에서 제거
  const handleRemoveFromFinal = (file: RawMyDoc) => {
    setFinalSelectedFiles((prev) =>
      prev.filter((f) => !(f.fileNo === file.fileNo && f.collectionNo === file.collectionNo))
    );
  };

  // 6. 업로드 완료 → 벡터화 진행 SSE 시작 트리거
  const handleUploadComplete = () => {
    setIsUploadDone(true);
  };

  return (
    <section className="my-4 flex flex-col gap-6">
      <FileUploader onUpload={handleUpload} brand="hebees" />

      <div className="flex items-center justify-between gap-4">
        {/* 7. 업로드된 원본 파일 리스트 */}
        <div className="flex-1">
          <UploadList
            files={uploadedFiles}
            selectedFiles={selectedFiles}
            onFilesChange={setUploadedFiles}
            onSelectFiles={setSelectedFiles}
          />
        </div>

        <ArrowRight className="h-6 w-6 text-[var(--color-hebees)]" />

        {/* 8. 파일을 저장할 컬렉션 선택 */}
        <div className="flex-1">
          <ColSection
            selectedCollection={selectedCollection}
            onCollectionSelect={handleCollectionSelect}
            uploadedFiles={finalSelectedFiles}
          />
        </div>

        <ArrowRight className="h-6 w-6 text-[var(--color-hebees)]" />

        {/* 9. 최종 벡터화 대상 파일 목록 + 업로드 실행 */}
        <div className="flex-1">
          <SelectVectorization
            finalSelectedFiles={finalSelectedFiles}
            onRemove={handleRemoveFromFinal}
            onUploadComplete={handleUploadComplete}
            isVectorizing={runningFiles.length > 0}
            onStartVectorizing={() => setIsVectorizing(true)}
          />
        </div>
      </div>

      {/* 10. 벡터화 진행 상황 SSE */}
      <div>
        <VecProcess isUploadDone={isUploadDone} setIsUploadDone={setIsUploadDone} />
      </div>
    </section>
  );
}
