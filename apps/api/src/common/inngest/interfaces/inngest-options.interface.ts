export interface InngestModuleOptions {
  id?: string;
  apiKey?: string;
  baseUrl?: string;
  eventKey?: string;
  signingKey?: string;
  isDev?: boolean;
  logger?: {
    info?: (message: string, extra?: any) => void;
    warn?: (message: string, extra?: any) => void;
    error?: (message: string, extra?: any) => void;
    debug?: (message: string, extra?: any) => void;
  };
}
