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
