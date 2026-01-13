declare module 'vietqr' {
  export interface VietQROptions {
    clientID: string;
    apiKey: string;
  }

  export interface GenQuickLinkOptions {
    bank: string;
    accountNumber: string;
    accountName?: string;
    amount?: string;
    memo?: string;
    template?: string;
    media?: string;
  }

  export interface GenQuickLinkResponse {
    code?: string;
    desc?: string;
    data?: {
      qrDataURL?: string;
      qrCode?: string;
    };
  }

  export class VietQR {
    constructor(options: VietQROptions);
    genQuickLink(options: GenQuickLinkOptions): Promise<GenQuickLinkResponse>;
  }
}
