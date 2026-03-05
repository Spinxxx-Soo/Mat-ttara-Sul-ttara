interface KakaoShareButtonProps {
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl: string;
}

export default function KakaoShareButton({ title, description, imageUrl, linkUrl }: KakaoShareButtonProps) {
  const shareToKakao = () => {
    // @ts-ignore
    if (window.Kakao && window.Kakao.isInitialized()) {
      // @ts-ignore
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl: imageUrl || 'https://via.placeholder.com/800x400',
          link: {
            mobileWebUrl: linkUrl,
            webUrl: linkUrl,
          },
        },
        buttons: [
          {
            title: '웹으로 보기',
            link: {
              mobileWebUrl: linkUrl,
              webUrl: linkUrl,
            },
          },
        ],
      });
    } else {
      alert('Kakao SDK가 초기화되지 않았습니다. 환경 변수를 확인해주세요.');
    }
  };

  return (
    <button
      onClick={shareToKakao}
      className="px-4 py-2 font-semibold text-gray-900 bg-[#FEE500] rounded-md shadow-sm hover:bg-[#E5CD00] transition-colors"
    >
      카카오톡 공유하기
    </button>
  );
}
