declare module "iyzipay" {
  class Iyzipay {
    static LOCALE: { TR: string; EN: string };
    static CURRENCY: { TRY: string };
    static PAYMENT_GROUP: { PRODUCT: string; SUBSCRIPTION: string };
    constructor(options: { apiKey: string; secretKey: string; uri: string });
    checkoutFormInitialize: {
      create(request: Record<string, unknown>, callback: (error: unknown, result: any) => void): void;
    };
    checkoutForm: {
      retrieve(request: Record<string, unknown>, callback: (error: unknown, result: any) => void): void;
    };
  }
  export = Iyzipay;
}
