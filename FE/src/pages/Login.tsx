import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const navigate = useNavigate();

  const handleLogin = () => {
    setTokens('dummy-access-token', 'dummy-refresh-token');
    alert('로그인 처리 완료!');
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-lg w-96 text-center border">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">테스트 로그인</h1>
        <button
          onClick={handleLogin}
          className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Mock 로그인 버튼
        </button>
      </div>
    </div>
  );
}
