declare global {
  interface Window {
    naver?: {
      LoginWithNaverId?: new (options: {
        clientId: string;
        callbackUrl: string;
        isPopup: boolean;
        loginButton: {
          color: string;
          type: number;
          height: number;
        };
        callbackHandle: boolean;
      }) => {
        init: () => void;
      };
    };
  }
}

export {};
