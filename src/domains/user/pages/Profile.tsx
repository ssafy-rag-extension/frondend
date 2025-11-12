import { useEffect, useState } from 'react';
import { springApi } from '@/shared/lib/apiInstance';
import {
  Loader2,
  UserCog,
  Mail,
  Shield,
  Building2,
  Hash,
  UserSquare2,
  Images,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import ProfileInfoCard from '@/shared/components/ProfileInfoCard';
import ImageAlbum from '@/domains/user/components/image/ImageAlbum';
import FooterInfo from '@/shared/components/FooterInfo';
import { toast } from 'react-toastify';

type UserInfo = {
  userNo: string;
  email: string;
  name: string;
  role: number; // 1: 사용자, 2: 관리자
  offerNo?: string;
  businessType?: number;
};

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ GPT-4o API Key 상태
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('gpt4o_key') || '');
  const [tempKey, setTempKey] = useState(openaiKey);
  const [editingKey, setEditingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await springApi.get<{ result: UserInfo }>('/api/v1/user/me');
        setUser(data.result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const getRoleLabel = (role: number) =>
    role === 2 ? '관리자' : role === 1 ? '사용자' : '알 수 없음';

  const getBusinessTypeLabel = (type?: number) =>
    type === 0 ? '개인안경원' : type === 1 ? '체인안경원' : type === 2 ? '제조유통사' : '-';

  const maskedKey = openaiKey ? `${openaiKey.slice(0, 4)}••••••••••••${openaiKey.slice(-4)}` : '-';

  // ✅ Key 저장(지금은 localStorage, 나중에 API 변경 가능)
  const saveKey = async () => {
    try {
      // 🔥 나중에 API 연결 위치 (예시)
      // await springApi.post('/api/v1/user/openai-key', { key: tempKey });

      localStorage.setItem('gpt4o_key', tempKey);
      setOpenaiKey(tempKey);
      setEditingKey(false);
      toast.success('GPT-4o API Key가 저장되었습니다.');
    } catch (err) {
      toast.error('키 저장 실패. 다시 시도해주세요.');
    }
  };

  const clearKey = () => {
    localStorage.removeItem('gpt4o_key');
    setOpenaiKey('');
    setTempKey('');
    setEditingKey(false);
    toast.success('GPT-4o API Key가 삭제되었습니다.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 space-y-8 px-4 mb-20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[var(--color-retina-bg)] flex items-center justify-center">
            <UserCog size={28} className="text-[var(--color-retina)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">내 정보</h1>
            <p className="text-sm text-gray-600">내 계정 정보를 확인하고 관리할 수 있습니다.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 size={18} className="animate-spin mr-2" />
              정보를 불러오는 중입니다...
            </div>
          ) : user ? (
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ProfileInfoCard
                brand="retina"
                icon={<UserSquare2 size={20} strokeWidth={1.8} />}
                label="이름"
                value={<span className="text-base font-semibold text-gray-900">{user.name}</span>}
              />

              <ProfileInfoCard
                brand="retina"
                icon={<Mail size={20} strokeWidth={1.8} />}
                label="이메일"
                value={<span className="text-base font-medium text-gray-900">{user.email}</span>}
              />

              <ProfileInfoCard
                brand="retina"
                icon={<Shield size={20} strokeWidth={1.8} />}
                label="역할"
                value={
                  <span className="text-base font-medium text-gray-900">
                    {getRoleLabel(user.role)}
                  </span>
                }
              />

              <ProfileInfoCard
                brand="retina"
                icon={<Hash size={20} strokeWidth={1.8} />}
                label="사업자 번호"
                value={
                  <span className="text-base font-medium text-gray-800">{user.offerNo || '-'}</span>
                }
              />

              <ProfileInfoCard
                brand="retina"
                icon={<Building2 size={20} strokeWidth={1.8} />}
                label="사용자 유형"
                value={
                  <span className="text-base font-medium text-gray-900">
                    {getBusinessTypeLabel(user.businessType)}
                  </span>
                }
              />

              {/* ✅ GPT-4o Key Card */}
              <ProfileInfoCard
                brand="retina"
                icon={<KeyRound size={20} strokeWidth={1.8} />}
                label="GPT-4o API Key"
                value={
                  editingKey ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex gap-2 items-center">
                        <input
                          type={showKey ? 'text' : 'password'}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-[var(--color-hebees)] focus:border-[var(--color-hebees)]"
                          placeholder="sk-..."
                          value={tempKey}
                          onChange={(e) => setTempKey(e.target.value)}
                        />

                        <button
                          onClick={() => setShowKey((v) => !v)}
                          className="border rounded-md px-2 py-1 text-gray-500 hover:bg-gray-50"
                        >
                          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={saveKey}
                          className="rounded-md bg-[var(--color-hebees)] text-white px-3 py-1.5 text-sm hover:opacity-90 w-full"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setEditingKey(false);
                            setTempKey(openaiKey);
                          }}
                          className="rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 w-full"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base font-medium text-gray-900">
                        {openaiKey ? maskedKey : '-'}
                      </span>

                      <div className="flex gap-2">
                        {openaiKey && (
                          <button
                            onClick={clearKey}
                            className="text-sm text-red-500 hover:underline"
                          >
                            삭제
                          </button>
                        )}
                        <button
                          onClick={() => setEditingKey(true)}
                          className="text-sm text-[var(--color-hebees)] hover:underline"
                        >
                          {openaiKey ? '수정' : '등록'}
                        </button>
                      </div>
                    </div>
                  )
                }
              />
            </dl>
          ) : (
            <div className="py-10 text-center text-gray-500">
              사용자 정보를 불러오지 못했습니다.
            </div>
          )}
        </div>

        {/* 이미지 앨범 */}
        <section>
          <div className="mb-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[var(--color-retina-bg)] flex items-center justify-center">
              <Images size={28} className="text-[var(--color-retina)]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">내 이미지 앨범</h1>
              <p className="text-sm text-gray-600">생성한 이미지를 한눈에 확인할 수 있습니다.</p>
            </div>
          </div>

          <ImageAlbum />
        </section>
      </main>

      <FooterInfo brand="hebees" />
    </div>
  );
}
