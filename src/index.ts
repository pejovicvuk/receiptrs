import axios, { AxiosInstance } from 'axios';

export interface ReceiptItem {
  gtin: string;
  name: string;
  quantity: number;
  total: number;
  unitPrice: number;
  label: string;
  labelRate: number;
  taxBaseAmount: number;
  vatAmount: number;
}

export interface ReceiptMetadata {
  pib: string;
  shopFullName: string;
  address: string;
  city: string;
  municipality: string;
  buyerId?: string;
  requestedBy: string;
  invoiceType: string;
  transactionType: string;
  totalAmount: string;
  transactionTypeCounter: number;
  totalCounter: number;
  invoiceCounterExtension: string;
  invoiceNumber: string;
  signedBy: string;
  sdcDateTime: string;
}

export interface Receipt {
  success: boolean;
  items?: ReceiptItem[];
  invoiceNumber?: string;
  totalAmount?: number;
  itemCount?: number;
  metadata?: ReceiptMetadata;
}

export interface ScanResult {
  success: boolean;
  message: string;
  data?: Receipt;
  error?: string;
}

interface ExtractedData {
  invoiceNumber: string;
  token: string;
}

class CookieManager {
  private cookies: Map<string, string> = new Map();

  parseCookies(setCookieHeader: string | string[] | undefined): void {
    if (!setCookieHeader) return;
    
    const cookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    
    cookieHeaders.forEach(cookieStr => {
      const cookieParts = cookieStr.split(';')[0].trim();
      const [name, value] = cookieParts.split('=');
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
      }
    });
    
    if (!this.cookies.has('localization')) {
      this.cookies.set('localization', 'sr-Cyrl-RS');
    }
  }

  getCookieString(): string {
    const cookieArray: string[] = [];
    this.cookies.forEach((value, name) => {
      cookieArray.push(`${name}=${value}`);
    });
    return cookieArray.length > 0 ? cookieArray.join('; ') : 'localization=sr-Cyrl-RS';
  }
}

const createAxiosInstance = (): AxiosInstance => {
  return axios.create({
    timeout: 15000,
    validateStatus: (status) => status < 400,
  });
};

const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

const extractReceiptMetadata = (htmlContent: string): ReceiptMetadata | null => {
  try {
    const extractById = (id: string): string => {
      const regex = new RegExp(`<span id="${id}"[^>]*>\\s*([^<]+)`, 'i');
      const match = htmlContent.match(regex);
      const rawText = match?.[1]?.trim() || '';
      return decodeHtmlEntities(rawText);
    };

    const extractNumberById = (id: string): number => {
      const text = extractById(id);
      const number = parseInt(text.replace(/\D/g, ''));
      return isNaN(number) ? 0 : number;
    };

    return {
      pib: extractById('tinLabel'),
      shopFullName: extractById('shopFullNameLabel'),
      address: extractById('addressLabel'),
      city: extractById('cityLabel'),
      municipality: extractById('administrativeUnitLabel'),
      buyerId: extractById('buyerIdLabel') || undefined,
      requestedBy: extractById('requestedByLabel'),
      invoiceType: extractById('invoiceTypeId'),
      transactionType: extractById('transactionTypeId'),
      totalAmount: extractById('totalAmountLabel'),
      transactionTypeCounter: extractNumberById('transactionTypeCounterLabel'),
      totalCounter: extractNumberById('totalCounterLabel'),
      invoiceCounterExtension: extractById('invoiceCounterExtensionLabel'),
      invoiceNumber: extractById('invoiceNumberLabel'),
      signedBy: extractById('signedByLabel'),
      sdcDateTime: extractById('sdcDateTimeLabel')
    };
  } catch (error) {
    return null;
  }
};

const extractInvoiceDataFromJS = async (
  refererUrl: string, 
  axiosInstance: AxiosInstance, 
  cookieManager: CookieManager
): Promise<{ extractedData: ExtractedData; metadata: ReceiptMetadata | null } | null> => {
  const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,sr;q=0.8',
    'Sec-Ch-Ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Gpc': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
  };
  
  try {
    const response = await axiosInstance.get(refererUrl, { headers });
    
    if (response.status === 200) {
      const setCookieHeader = response.headers['set-cookie'];
      cookieManager.parseCookies(setCookieHeader);
      
      const htmlContent = response.data;
      
      const invoicePattern = /viewModel\.InvoiceNumber\(['"]([^'"]+)['"]\)/;
      const tokenPattern = /viewModel\.Token\(['"]([^'"]+)['"]\)/;
      
      const invoiceMatch = htmlContent.match(invoicePattern);
      const tokenMatch = htmlContent.match(tokenPattern);
      
      const invoiceNumber = invoiceMatch?.[1];
      const token = tokenMatch?.[1];
      
      if (invoiceNumber && token) {
        const metadata = extractReceiptMetadata(htmlContent);
        
        return { 
          extractedData: { invoiceNumber, token },
          metadata
        };
      }
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to extract invoice data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const fetchSpecifications = async (
  refererUrl: string, 
  invoiceNumber: string, 
  token: string,
  axiosInstance: AxiosInstance,
  cookieManager: CookieManager
): Promise<Receipt | null> => {
  const specsUrl = "https://suf.purs.gov.rs/specifications";
  
  const headers = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,eng=0.9',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Cookie': cookieManager.getCookieString(),
    'Origin': 'https://suf.purs.gov.rs',
    'Priority': 'u=1, i',
    'Referer': refererUrl,
    'Sec-Ch-Ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Gpc': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  };
  
  const formData = `invoiceNumber=${encodeURIComponent(invoiceNumber)}&token=${encodeURIComponent(token)}`;
  
  try {
    const response = await axiosInstance.post(specsUrl, formData, { headers });
    
    if (response.status === 200) {
      const responseData = response.data;
      const parsedJson: Receipt = typeof responseData === 'string' 
        ? JSON.parse(responseData) 
        : responseData;
        
      if (parsedJson.success && parsedJson.items) {
        parsedJson.invoiceNumber = invoiceNumber;
        parsedJson.totalAmount = parsedJson.items.reduce((sum, item) => sum + item.total, 0);
        parsedJson.itemCount = parsedJson.items.length;
      }
      
      return parsedJson;
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to fetch receipt specifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export class ReceiptScanner {
  private axiosInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = createAxiosInstance();
  }

  async scanReceipt(receiptUrl: string): Promise<ScanResult> {
    try {
      if (!receiptUrl || !receiptUrl.includes('suf.purs.gov.rs')) {
        return {
          success: false,
          message: 'Invalid receipt URL. Must be from suf.purs.gov.rs',
          error: 'INVALID_URL'
        };
      }
      
      const cookieManager = new CookieManager();
      
      const extractionResult = await extractInvoiceDataFromJS(receiptUrl, this.axiosInstance, cookieManager);
      
      if (!extractionResult) {
        return {
          success: false,
          message: 'Could not extract invoice data from receipt URL',
          error: 'EXTRACTION_FAILED'
        };
      }
      
      const { extractedData, metadata } = extractionResult;
      const { invoiceNumber, token } = extractedData;
      
      const result = await fetchSpecifications(receiptUrl, invoiceNumber, token, this.axiosInstance, cookieManager);
      
      if (result && result.success) {
        result.metadata = metadata || undefined;
        
        return {
          success: true,
          message: 'Receipt scanned successfully',
          data: result
        };
      } else {
        return {
          success: false,
          message: 'Failed to fetch receipt specifications',
          error: 'FETCH_FAILED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error processing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'PROCESSING_ERROR'
      };
    }
  }
}

export const scanReceipt = async (receiptUrl: string): Promise<ScanResult> => {
  const scanner = new ReceiptScanner();
  return scanner.scanReceipt(receiptUrl);
};

export default ReceiptScanner;