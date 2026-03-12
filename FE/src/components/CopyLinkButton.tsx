import { useState } from 'react';
import Button from '@/components/ui/Button';

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
        <Button
            variant={copied ? 'success' : 'secondary'}
            onClick={handleCopy}
        >
            {copied ? '링크 복사됨 ✓' : '링크 복사하기'}
        </Button>
    );
}
