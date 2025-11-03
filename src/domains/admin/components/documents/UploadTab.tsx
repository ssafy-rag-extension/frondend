import UploadFile from '@/domains/admin/components/documents/UploadFile';
import UploadList from '@/domains/admin/components/documents/UploadList';
import ColSection from '@/domains/admin/components/documents/ColSection';
import SelectVectorization from '@/domains/admin/components/documents/SelectVectorization';
import DuplicatedModal from '@/domains/admin/components/documents/DuplicatedModal';
import type { FileType } from '@/domains/admin/types';

import { useState, useEffect } from 'react';

export default function UploadTab() {
  // 업로드된 파일 상태 관리
  const [uploadedFiles, setUploadedFiles] = useState<FileType[]>([]);
  const [duplicates, setDuplicates] = useState<FileType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 업로드 문서 선택(왼쪽)
  const [selectedFiles, setSelectedFiles] = useState<FileType[]>([]);
  // 컬렉션 선택(오른쪽)
  const [selectedCollection, setSelectedCollection] = useState<'public' | 'hebees' | null>(null);
  // 두 조건이 충족되면 생기는 최종 선택목록
  const [finalSelectedFiles, setFinalSelectedFiles] = useState<FileType[]>([]);

  const handleFilesSelected = (merged: FileType[]) => {
    setUploadedFiles(merged);
  };

  const handleDuplicateDetected = (dups: FileType[]) => {
    setDuplicates(dups);
    setIsModalOpen(true);
  };

  const confirmOverwrite = () => {
    const newNames = new Set(duplicates.map((f) => f.name));
    const filtered = uploadedFiles.filter((f) => !newNames.has(f.name));
    setUploadedFiles([...filtered, ...duplicates]);
    setIsModalOpen(false);
  };

  // 컬렉션 선택 (ColSection에서 온거)
  const handleCollectionSelect = (collectionName: 'public' | 'hebees' | null) => {
    setSelectedCollection(collectionName);
  };

  useEffect(() => {
    if (selectedFiles.length > 0 && selectedCollection) {
      const combined = selectedFiles.map((file) => ({
        ...file,
        collection: selectedCollection,
      }));

      setFinalSelectedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        return [...prev, ...combined.filter((f) => !existingNames.has(f.name))];
      });

      setSelectedFiles([]);
      setTimeout(() => setSelectedCollection(null), 0); // 2️⃣ 다음 렌더 프레임에서 컬렉션 초기화
    }
  }, [selectedFiles, selectedCollection]);

  return (
    <>
      <UploadFile
        existingFiles={uploadedFiles}
        onFilesSelected={handleFilesSelected}
        onDuplicateDetected={handleDuplicateDetected}
      />
      {isModalOpen && (
        <DuplicatedModal
          duplicates={duplicates}
          onConfirm={confirmOverwrite}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
      <div className="flex gap-4">
        <UploadList
          files={uploadedFiles}
          onFilesChange={setUploadedFiles}
          onSelectFiles={setSelectedFiles}
          selectedFiles={selectedFiles}
        />
        <ColSection
          selectedCollection={selectedCollection}
          onCollectionSelect={handleCollectionSelect}
        />
      </div>
      <SelectVectorization finalSelectedFiles={finalSelectedFiles} />
    </>
  );
}
