import { useParams, Link } from 'react-router-dom';

export default function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();

  return (
    <div className="p-8 max-w-2xl mx-auto text-center mt-12">
      <h1 className="text-3xl font-bold mb-4">Plan Detail</h1>
      <p className="text-lg text-gray-600 mb-8">현재 확인 중인 Plan ID: <span className="font-semibold text-blue-600">{planId}</span></p>
      <Link to="/" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">홈으로 돌아가기</Link>
    </div>
  );
}
