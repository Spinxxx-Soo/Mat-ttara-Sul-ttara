# Frontend Project

이 프로젝트는 Vite(React + TypeScript)를 기반으로 구축된 프론트엔드 환경입니다.

## 🚀 개발 환경 실행 방법

1. **의존성 설치**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **환경 변수 설정**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   - `.env` 파일에 발급받은 지도, 소셜, 서버 API 키 등을 입력해주세요.

3. **개발 서버 실행**
   \`\`\`bash
   pnpm run dev
   \`\`\`

## 📌 네이밍 컨벤션 (Naming Convention)

팀 협업을 위한 기본 네이밍 규칙입니다:

- **컴포넌트 (Components)**
  - PascalCase 사용 (예: `NaverMap.tsx`, `KakaoShareButton.tsx`)
  - 컴포넌트 파일명과 내보내는(export) 함수명이 일치해야 합니다.

- ** 상태 관리 (Zustand Stores)**
  - camelCase 사용
  - 파일명: `[domain]Store.ts` (예: `authStore.ts`, `locationStore.ts`)
  - 훅 이름: `use[Domain]Store` (예: `useAuthStore`)

- **커스텀 훅 (Hooks)**
  - camelCase 사용
  - 파일명: `use[Action].ts` (예: `useDebounce.ts`)
  - 함수명: `use` 접두사로 시작할 것.

- **API 타입 (Types / Interfaces)**
  - PascalCase 지정, 인터페이스/타입은 별도 접두사(I, T) 미사용
  - \`src/types/[domain].ts\`
  - 예시 (\`Plan\` 타입):
    \`\`\`ts
    export interface Plan {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    }
    \`\`\`

## 🚀 배포 (Vercel)

Vercel 배포 시 모노레포 루트 경로(.git이 위치한 곳)에 연결한 뒤 아래 설정을 반영합니다:

- **Root Directory**: `FE`
- **Build Command**: `pnpm run build` (또는 `npm run build`)
- **Output Directory**: `dist`
- **Install Command**: `pnpm install` (사용하는 패키지 매니저에 맞게)

_(참고: `vercel.json` 파일이 세팅되어 있어 SPA 라우팅 새로고침 404 이슈가 방지됩니다.)_
