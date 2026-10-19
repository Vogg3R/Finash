import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 1. Users
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kullanici_adi: text('kullanici_adi').notNull().unique(),
  sifre_hash: text('sifre_hash').notNull(),
  rol: text('rol', { enum: ['admin', 'cashier', 'washer'] }).notNull(),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  ilkgiris_sifre_degistir: integer('ilkgiris_sifre_degistir', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 2. Staff (Yıkama personeli)
export const staff = sqliteTable('staff', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull(),
  telefon: text('telefon'),
  prim_orani: integer('prim_orani').notNull().default(0), // yüzde olarak örn. 10 = %10
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 3. Customers
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull(),
  telefon: text('telefon'),
  notlar: text('notlar'),
  veresiye_bakiye_kurus: integer('veresiye_bakiye_kurus').notNull().default(0),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 5. Vehicle Types (Tanım önce gelmeli, vehicles FK kullanıyor)
export const vehicleTypes = sqliteTable('vehicle_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull().unique(), // Binek, SUV, Ticari, Motosiklet
  sira: integer('sira').notNull().default(0),
});

// 4. Vehicles
export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plaka: text('plaka').notNull(),
  plaka_normalized: text('plaka_normalized').notNull().unique(),
  marka: text('marka'),
  model: text('model'),
  renk: text('renk'),
  vehicle_type_id: integer('vehicle_type_id').notNull().references(() => vehicleTypes.id),
  customer_id: integer('customer_id').references(() => customers.id),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_vehicles_plaka_norm').on(table.plaka_normalized),
]);

// 6. Services
export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull(),
  aciklama: text('aciklama'),
  sure_dk: integer('sure_dk').notNull().default(30),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 7. Service Prices (Araç Tipi × Hizmet Fiyat Matrisi)
export const servicePrices = sqliteTable('service_prices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hizmet_id: integer('hizmet_id').notNull().references(() => services.id),
  arac_tipi_id: integer('arac_tipi_id').notNull().references(() => vehicleTypes.id),
  fiyat_kurus: integer('fiyat_kurus').notNull(),
  gecerlilik_baslangici: text('gecerlilik_baslangici').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('idx_service_vehicle_type').on(table.hizmet_id, table.arac_tipi_id),
]);

// 8. Work Orders (İş Emri / Yıkama Kaydı)
export const workOrders = sqliteTable('work_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no: text('no').notNull().unique(),
  arac_id: integer('arac_id').notNull().references(() => vehicles.id),
  durum: text('durum', { enum: ['pending', 'washing', 'completed', 'delivered', 'cancelled'] }).notNull().default('pending'),
  iptal_gerekcesi: text('iptal_gerekcesi'),
  stok_dusuldu_at: text('stok_dusuldu_at'),
  giris_zamani: text('giris_zamani').notNull().default(sql`CURRENT_TIMESTAMP`),
  teslim_zamani: text('teslim_zamani'),
  toplam_kurus: integer('toplam_kurus').notNull().default(0),
  indirim_kurus: integer('indirim_kurus').notNull().default(0),
  user_id: integer('user_id').notNull().references(() => users.id),
}, (table) => [
  index('idx_work_orders_durum').on(table.durum),
  index('idx_work_orders_giris').on(table.giris_zamani),
]);

// 9. Work Order Items (İş emri satırları)
export const workOrderItems = sqliteTable('work_order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  work_order_id: integer('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  hizmet_id: integer('hizmet_id').notNull().references(() => services.id),
  birim_fiyat_kurus: integer('birim_fiyat_kurus').notNull(),
  miktar: integer('miktar').notNull().default(1),
  staff_id: integer('staff_id').references(() => staff.id),
});

// 10. Payments (Tahsilatlar)
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  work_order_id: integer('work_order_id').notNull().references(() => workOrders.id),
  tutar_kurus: integer('tutar_kurus').notNull(),
  yontem: text('yontem', { enum: ['cash', 'card', 'transfer'] }).notNull(),
  zaman: text('zaman').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 11. Products (Stok Ürün Kartı)
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull(),
  kategori: text('kategori'),
  birim: text('birim', { enum: ['lt', 'kg', 'piece'] }).notNull(),
  mevcut_miktar: real('mevcut_miktar').notNull().default(0), // Önbellek
  kritik_seviye: real('kritik_seviye').notNull().default(0),
  ort_maliyet_kurus: integer('ort_maliyet_kurus').notNull().default(0),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 12. Service Recipes (Hizmet başına malzeme tüketimi)
export const serviceRecipes = sqliteTable('service_recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hizmet_id: integer('hizmet_id').notNull().references(() => services.id),
  urun_id: integer('urun_id').notNull().references(() => products.id),
  miktar: real('miktar').notNull(), // harcanan miktar (ör. 0.1 lt)
}, (table) => [
  uniqueIndex('idx_recipe_service_product').on(table.hizmet_id, table.urun_id),
]);

// 14. Suppliers (Tedarikçiler)
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull(),
  telefon: text('telefon'),
  notlar: text('notlar'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 13. Stock Movements (Stok Hareketleri)
export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urun_id: integer('urun_id').notNull().references(() => products.id),
  tur: text('tur', { enum: ['in', 'consumption', 'reversal', 'waste', 'audit'] }).notNull(),
  kaynak_tur: text('kaynak_tur', { enum: ['work_order', 'purchase', 'manual', 'count'] }).notNull(),
  miktar: real('miktar').notNull(), // pozitif miktar
  birim_maliyet_kurus: integer('birim_maliyet_kurus').notNull().default(0),
  kaynak_id: integer('kaynak_id'), // Polimorfik ID (work_orders.id vb.)
  supplier_id: integer('supplier_id').references(() => suppliers.id),
  zaman: text('zaman').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // B1 kuralı: Unique index ile veritabanı seviyesinde idempotens
  uniqueIndex('idx_stock_mov_unique').on(table.kaynak_tur, table.kaynak_id, table.urun_id, table.tur),
]);

// 15. Categories (Gelir-Gider Kategorileri)
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ad: text('ad').notNull().unique(),
  tur: text('tur', { enum: ['income', 'expense'] }).notNull(),
  varsayilan: integer('varsayilan', { mode: 'boolean' }).notNull().default(false),
});

// 17. Cash Sessions (Kasa Gün Açılış/Kapanış)
export const cashSessions = sqliteTable('cash_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tarih: text('tarih').notNull().default(sql`CURRENT_TIMESTAMP`),
  acilis_kurus: integer('acilis_kurus').notNull().default(0),
  beklenen_kurus: integer('beklenen_kurus').notNull().default(0),
  sayilan_kurus: integer('sayilan_kurus'),
  fark_kurus: integer('fark_kurus'),
  durum: text('durum', { enum: ['open', 'closed'] }).notNull().default('open'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  closed_at: text('closed_at'),
});

// 16. Transactions (Gelir-Gider Defteri)
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tur: text('tur', { enum: ['income', 'expense', 'refund'] }).notNull(),
  kategori_id: integer('kategori_id').references(() => categories.id),
  tutar_kurus: integer('tutar_kurus').notNull(), // Her zaman pozitif tam kuruş
  yontem: text('yontem', { enum: ['cash', 'card', 'transfer'] }).notNull(),
  tarih: text('tarih').notNull().default(sql`CURRENT_TIMESTAMP`),
  aciklama: text('aciklama'),
  kaynak_tur: text('kaynak_tur', { enum: ['payment', 'purchase', 'manual'] }).notNull(),
  kaynak_id: integer('kaynak_id'), // Polimorfik ID (payments.id vb.)
  cash_session_id: integer('cash_session_id').references(() => cashSessions.id),
}, (table) => [
  index('idx_transactions_tarih').on(table.tarih),
  index('idx_transactions_tur').on(table.tur),
]);

// 18. Audit Log (İşlem Günlüğü)
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  eylem: text('eylem').notNull(),
  tablo: text('tablo').notNull(),
  kayit_id: integer('kayit_id'),
  eski_deger: text('eski_deger'),
  yeni_deger: text('yeni_deger'),
  zaman: text('zaman').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 19. Settings (Sistem Ayarları - Bağımsız anahtar/değer)
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  anahtar: text('anahtar').notNull().unique(),
  deger: text('deger').notNull(),
});

// 20. Email Outbox (Ciro E-postası Gönderim Kuyruğu)
export const emailOutbox = sqliteTable('email_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tur: text('tur', { enum: ['daily', 'weekly'] }).notNull(),
  donem: text('donem').notNull(), // örn: 2026-10-08
  durum: text('durum', { enum: ['pending', 'sending', 'sent', 'failed'] }).notNull().default('pending'),
  deneme_sayisi: integer('deneme_sayisi').notNull().default(0),
  kilit_zamani: text('kilit_zamani'),
  son_hata: text('son_hata'),
  tetikleyen: text('tetikleyen', { enum: ['button', 'auto'] }).notNull().default('button'),
  user_id: integer('user_id').references(() => users.id),
  olusturma: text('olusturma').notNull().default(sql`CURRENT_TIMESTAMP`),
  gonderim_zamani: text('gonderim_zamani'),
}, (table) => [
  index('idx_email_outbox_durum').on(table.durum),
]);
