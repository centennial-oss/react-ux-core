// English defaults of the codes entry point's strings (QRCode and Barcode).
import { useEntryMessages } from '../provider/context';
import type { CoreMessages } from '../provider/messages';
import type { BarcodeFormat } from './barcodeEncode';

/** Strings for `/codes`. */
export interface CodesMessages {
  /** Names a QR code that has no `aria-label` and doesn't hold a URL. */
  qrCodeLabel: string;
  /** Names a QR code that holds a URL, with the address. */
  qrCodeUrlLabel: (params: { url: string }) => string;
  /** Labels the text alternative under a QR code (the encoded text, with a copy button). */
  qrCodeText: string;
  /** Shown instead of a QR code whose value is too long to encode. */
  qrCodeTooLong: string;
  /** Display names of the barcode formats, used in barcode names and errors. */
  barcodeFormatNames: Record<BarcodeFormat, string>;
  /** Names a barcode by its format and value, such as "UPC-A barcode 036000291452". */
  barcodeLabel: (params: { format: string; value: string }) => string;
  /** Shown instead of a barcode whose value can't be encoded in its format. */
  barcodeInvalid: (params: { format: string }) => string;
  /** Shown instead of a barcode whose check digit is wrong. */
  barcodeWrongCheckDigit: (params: { format: string; expected: string }) => string;
}

export const defaultCodesMessages: CodesMessages = {
  qrCodeLabel: 'QR code',
  qrCodeUrlLabel: ({ url }) => `QR code for ${url}`,
  qrCodeText: 'Encoded text',
  qrCodeTooLong: 'This text is too long for a QR code.',
  barcodeFormatNames: {
    'upc-a': 'UPC-A',
    'upc-e': 'UPC-E',
    'ean-13': 'EAN-13',
    'ean-8': 'EAN-8',
    code128: 'Code 128',
  },
  barcodeLabel: ({ format, value }) => `${format} barcode ${value}`,
  barcodeInvalid: ({ format }) => `This value can’t be shown as a ${format} barcode.`,
  barcodeWrongCheckDigit: ({ format, expected }) =>
    `The ${format} check digit is wrong; it should be ${expected}.`,
};

/** The strings `/codes` components read: the core strings and `/codes`'s own. */
export type CodesStrings = CoreMessages & CodesMessages;

/** `/codes`'s strings, with the app's overrides from `UIProvider`. */
export function useCodesMessages(): CodesStrings {
  return useEntryMessages(defaultCodesMessages);
}
