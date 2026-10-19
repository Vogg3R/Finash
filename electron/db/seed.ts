import bcrypt from 'bcryptjs';
import { getDb } from './index';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export async function runSeed(customDb?: ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>) {
  const db = (customDb || getDb()) as any;

  // 1. Varsayılan Araç Tipleri
  const existingVehicleTypes = await db.select().from(schema.vehicleTypes);
  if (existingVehicleTypes.length === 0) {
    await db.insert(schema.vehicleTypes).values([
      { ad: 'Binek', sira: 1 },
      { ad: 'SUV', sira: 2 },
      { ad: 'Ticari', sira: 3 },
      { ad: 'Motosiklet', sira: 4 },
    ]);
  }

  // 2. Varsayılan Kategoriler (FR-30)
  const existingCategories = await db.select().from(schema.categories);
  if (existingCategories.length === 0) {
    await db.insert(schema.categories).values([
      { ad: 'Kira', tur: 'expense', varsayilan: true },
      { ad: 'Elektrik', tur: 'expense', varsayilan: true },
      { ad: 'Su', tur: 'expense', varsayilan: true },
      { ad: 'Doğalgaz', tur: 'expense', varsayilan: true },
      { ad: 'Maaş', tur: 'expense', varsayilan: true },
      { ad: 'Malzeme', tur: 'expense', varsayilan: true },
      { ad: 'Bakım', tur: 'expense', varsayilan: true },
      { ad: 'Vergi', tur: 'expense', varsayilan: true },
      { ad: 'Diğer Gider', tur: 'expense', varsayilan: true },
      { ad: 'Yıkama Geliri', tur: 'income', varsayilan: true },
      { ad: 'Ürün Satışı', tur: 'income', varsayilan: true },
      { ad: 'Diğer Gelir', tur: 'income', varsayilan: true },
    ]);
  }

  // 3. Varsayılan Kullanıcılar (FR-42, P7 kuralı: Admin ilk girişte şifre değişimine zorlanır)
  const adminUser = await db.select().from(schema.users).where(eq(schema.users.kullanici_adi, 'admin'));
  if (adminUser.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('123456', salt);
    const cashierHash = await bcrypt.hash('1234', salt);

    await db.insert(schema.users).values([
      {
        kullanici_adi: 'admin',
        sifre_hash: adminHash,
        rol: 'admin',
        aktif: true,
        ilkgiris_sifre_degistir: true, // P7: İlk girişte şifre değişikliğine zorlanır
      },
      {
        kullanici_adi: 'kasa',
        sifre_hash: cashierHash,
        rol: 'cashier',
        aktif: true,
        ilkgiris_sifre_degistir: false,
      },
    ]);
  }

  // 4. Varsayılan Ayarlar (FR-46, FR-54)
  const existingSettings = await db.select().from(schema.settings);
  if (existingSettings.length === 0) {
    await db.insert(schema.settings).values([
      { anahtar: 'isletme_adi', deger: 'WashTrack Oto Kuaför' },
      { anahtar: 'isletme_adresi', deger: 'Oto Sanayi Sitesi No: 12' },
      { anahtar: 'isletme_telefon', deger: '0555 123 45 67' },
      { anahtar: 'smtp_host', deger: 'smtp.gmail.com' },
      { anahtar: 'smtp_port', deger: '587' },
      { anahtar: 'smtp_user', deger: '' },
      { anahtar: 'patron_email', deger: '' },
      { anahtar: 'otomatik_ciro_mail', deger: '0' },
      { anahtar: 'indirim_ust_limit', deger: '10' }, // %10 kasa indirim limiti
    ]);
  }
}

// Komut satırından çalıştırılırsa
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seed verileri başarıyla yüklendi.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed yükleme hatası:', err);
      process.exit(1);
    });
}
