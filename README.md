# ReceiptRS - Biblioteka za skeniranje srpskih fiskalnih računa

TypeScript/JavaScript biblioteka za skeniranje i obradu QR kodova sa srpskih fiskalnih računa.

## 📋 Opis

ReceiptRS omogućava lako skeniranje i obradu fiskalnih računa izdatih u Srbiji. Biblioteka automatski izvlači sve podatke sa računa uključujući stavke, cene, poreze i metapodatke o prodajnom mestu.

## 🚀 Instalacija

```bash
npm install receiptrs
yarn add receiptrs
```

## 💡 Korišćenje

```javascript
const { scanReceipt } = require('receiptrs');

async function skenirajRacun() {
  const url = 'https://suf.purs.gov.rs/v/?vl=...'; // URL sa QR koda
  
  const rezultat = await scanReceipt(url);
  
  if (rezultat.success) {
    console.log('✅ Račun uspešno skeniran!');
    console.log('Podaci:', rezultat.data);
  } else {
    console.log('❌ Greška:', rezultat.message);
  }
}

skenirajRacun();
```
## Return primer
```json
Podaci: {
  success: true,
  items: [
    {
      gtin: '',
      name: 'Kesa CC KESA M-UNI',
      quantity: 1,
      total: 30,
      unitPrice: 30,
      label: 'Ђ',
      labelRate: 20,
      taxBaseAmount: 25,
      vatAmount: 5
    },
    {
      gtin: '8432936760246',
      name: 'Muške cipele CCK100998-003-44',
      quantity: 1,
      total: 13293,
      unitPrice: 13293,
      label: 'Ђ',
      labelRate: 20,
      taxBaseAmount: 11077.5,
      vatAmount: 2215.5
    }
  ],
  invoiceNumber: 'Z9BR74H2-Z9BR74H2-7281',
  totalAmount: 13323,
  itemCount: 2,
  metadata: {
    pib: '100973862',
    shopFullName: '1249582-CAMPER GALERIJA',
    address: 'БУЛЕВАР ВУДРОА ВИЛСОНА 14 ЛОК.ФФ108',
    city: 'БЕОГРАД (САВСКИ ВЕНАЦ)',
    municipality: 'Београд-Савски Венац',
    buyerId: undefined,
    requestedBy: 'Z9BR74H2',
    invoiceType: 'Промет',
    transactionType: 'Продаја',
    totalAmount: '13.323,00',
    transactionTypeCounter: 7054,
    totalCounter: 7281,
    invoiceCounterExtension: 'ПП',
    invoiceNumber: 'Z9BR74H2-Z9BR74H2-7281',
    signedBy: 'Z9BR74H2',
    sdcDateTime: '29.12.2024. 12:32:47'
  }
}
```
