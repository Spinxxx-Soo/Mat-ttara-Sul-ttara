import { useState } from 'react';

interface CopyLinkButtonProps {
    linkUrl: string;
}

export default function CopyLinkButton({ linkUrl }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(linkUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            alert('링크 복사에 실패했습니다.');
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-colors ${copied
                    ? 'text-green-800 bg-green-100 hover:bg-green-200'
                    : 'text-gray-900 bg-gray-200 hover:bg-gray-300'
                }`}
        >
            {copied ? '링크 복사됨 ✓' : '링크 복사하기'}
        </button>
    );
}
