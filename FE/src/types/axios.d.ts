import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    meta?: {
      dedupe?: 'replace-prev';
    };
  }
}
