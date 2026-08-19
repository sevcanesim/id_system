import Iyzipay from "iyzipay";
import { iyzicoConfig } from "./config";

export function getIyzicoClient() {
  return new Iyzipay({
    apiKey: iyzicoConfig.apiKey,
    secretKey: iyzicoConfig.secretKey,
    uri: iyzicoConfig.baseUrl,
  });
}

export function initializeCheckout(request: Record<string, unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    getIyzicoClient().checkoutFormInitialize.create(request, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

export function retrieveCheckout(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    getIyzicoClient().checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}
