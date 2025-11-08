import { fastApi } from '@/shared/lib/apiInstance';
import type { ApiEnvelope } from '@/shared/lib/api.types';
import type {
  collectionType,
  dataType,
  getDocumentsInCollection,
} from '@/domains/admin/types/documents.types';

// 컬렉션 목록 조회(일반,관리자)
export const getCollections = async () => {
  const { data } = await fastApi.get<ApiEnvelope<dataType>>('/api/v1/collections');
  return data.result;
};

// 컬렉션 내 문서 목록 조회
export const getDocInCollections = async (collectionNo: string) => {
  const { data } = await fastApi.get<ApiEnvelope<getDocumentsInCollection>>(
    `/api/v1/collections/${collectionNo}/files`
  );
  return data.result;
};
