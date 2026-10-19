# WashTrack — Proje İlerleme ve Durum Takip Dokümanı (`progress.md`)

**Son Güncelleme:** 19 Ekim 2026  
**Mevcut Aşama:** Gün 6 Tamamlandı (RC Sürüm) · Gün 7'ye Hazır  
**Test Durumu:** 37/37 Vitest Birim/Entegrasyon (✅ %100) · 19/19 Playwright E2E (✅ %100)  
**Hedef:** Tek şubeli oto kuaför ve araç yıkama işletmesi için çevrimdışı (offline-first) Windows masaüstü takip uygulaması (v1.0).

---

## 📊 Genel Yol Haritası ve Tamamlanma Durumu

| Aşama | Modül / Odak | Kapsam (FR / NFR) | Durum | Test Dosyaları |
| :--- | :--- | :--- | :---: | :--- |
| **Gün 1** | **Hazırlık & Mimari** | İskelet, SQLite WAL, Drizzle ORM, 20 Tablo, Seed | ✅ Tamamlandı | `tests/db.test.ts` |
| **Gün 2** | **Altyapı & Ana Veriler** | Roller (Admin, Kasiyer, Yıkamacı), PIN, Plaka P4, Hizmet/Fiyat Matrisi, Müşteri Kartı | ✅ Tamamlandı | `tests/auth.test.ts`<br>`tests/plate.test.ts`<br>`tests/e2e/day2_auth_settings.spec.ts` |
| **Gün 3** | **İş Emri & Kasa Girişi** | <30s Hızlı Kayıt (F2), Durum Makinesi, Parçalı Tahsilat, İndirim Sınırı, İptal/İade Kuralları | ✅ Tamamlandı | `tests/workOrder.test.ts`<br>`tests/e2e/day3_work_orders.spec.ts` |
| **Gün 4** | **Stok & Yedekleme** | Ürün Kartları, Reçeteler, Otomatik Sarfiyat Düşümü, Kritik Stok Uyarısı, SQLite Yedek/Geri Yükle | ✅ Tamamlandı | `tests/stock.test.ts`<br>`tests/e2e/day4_stock_backup.spec.ts` |
| **Gün 5** | **Finans, Kasa & Raporlar** | Kasa Açılış/Kapanış (Nakit Farkı), Gider Girişi, Net Kâr, SummaryService, Personel Prim Tablosu | ✅ Tamamlandı | `tests/finance.test.ts`<br>`tests/e2e/day5_finance_reports.spec.ts` |
| **Gün 6** | **Sağlamlaştırma & Ciro Maili** | Excel Dışa Aktarım, PDF Yazdırma, SafeStorage (DPAPI), SMTP Ciro E-postası, Kuyruk Kilitleri | ✅ Tamamlandı | `tests/email_queue.test.ts`<br>`tests/e2e/day6_email_export.spec.ts` |
| **Gün 7** | **Kurulum & Canlı Teslim** | NSIS Installer (.exe), Açılış Verileri, Gerçek SMTP Testi, Personel/Yönetici Eğitimi | ⏳ **Sırada** | Manuel / UAT |

---

## 🛠️ Tamamlanan İşlerin Detaylı Dökümü

### 🔹 Gün 1: Hazırlık, Proje İskeleti ve Veritabanı Mimarisi
* **Teknoloji Yığını:** Electron v34, React 19, TypeScript 5.8, Vite 6, Mantine UI v9, Tabler Icons.
* **Veritabanı Motoru:** `better-sqlite3` üzerinde WAL (Write-Ahead Logging) journal modu aktifleştirildi (aynı anda okuma/yazma performansı ve elektrik kesintisi direnci).
* **20 Çekirdek Tablo Tanımlandı ve Migrate Edildi:**
  * Kullanıcı & Güvenlik: `users`, `audit_logs`
  * Personel & Organizasyon: `staff`
  * Hizmet & Fiyatlandırma: `vehicle_types`, `service_categories`, `services`
  * Müşteri & Araç: `customers`, `vehicles`
  * Operasyon: `work_orders`, `work_order_items`, `payments`
  * Stok & Reçete: `stock_items`, `stock_movements`, `recipes`
  * Muhasebe & Kasa: `categories`, `transactions`, `cash_registers`
  * Sistem & İletişim: `settings`, `email_outbox`, `backups`
* **Doğrulama:** `tests/db.test.ts` (6 test) entegrasyon seviyesinde doğrulandı.

---

### 🔹 Gün 2: Altyapı, Kimlik Doğrulama ve Ana Veriler
* **Rol Tabanlı Yetkilendirme (RBAC):** `admin` (tam yetki), `cashier` (finans/rapor erişimi kapalı), `washer` (sadece iş listesi).
* **Güvenlik Politikaları:**
  * Bcrypt şifre hash'leme, ilk girişte şifre değiştirme zorunluluğu (`ilkgiris_sifre_degistir`).
  * Yönetici PIN yetkilendirmesi (`verifyAdminPin`) - kritik indirim ve iptal işlemlerinde kasiyer yetki aşımı için.
  * Hareketsizlik kilidi (`InactivityLockOverlay`).
* **P4 Plaka Normalizasyonu:**
  * Türkçe karakter standartlaştırması (i/ı/İ $\rightarrow$ Latin I, Ç/Ş/Ğ engelleme veya otomatik düzeltme, boşluk ve tire temizleme).
* **Ana Veri Modülleri:**
  * Araç Tipleri (Sedan, SUV vb.) ve Araç Tipine Göre Fiyat Matrisi.
  * Hizmet Kataloğu & Kategori Yönetimi.
  * Müşteri ve Araç Kartları, hızlı plaka geçmişi sorgulama.
* **Doğrulama:** `tests/auth.test.ts` (5 test), `tests/plate.test.ts` (4 test), `tests/e2e/day2_auth_settings.spec.ts` (3 test).

---

### 🔹 Gün 3: İş Emri, Durum Makinesi ve Kasa Girişi
* **30 Saniyenin Altında Hızlı Kayıt (F2 Kısayolu):**
  * Plaka yazıldığında kayıtlı araç ve müşteri otomatik dolar; kayıtlı değilse tek formda araç tipi seçilerek anında kaydedilir.
* **Durum Makinesi:** `pending` (Bekliyor) $\rightarrow$ `washing` (Yıkanıyor) $\rightarrow$ `completed` (Tamamlandı) $\rightarrow$ `delivered` (Teslim Edildi) / `cancelled` (İptal).
* **Tahsilat & Parçalı Ödeme:** Nakit, Kredi Kartı ve Havale parçalı tahsilat; ödeme tamamlanmadan araç teslim edilemez kuralı.
* **Yetki & İptal Kuralları:**
  * Kasiyer en fazla %10 indirim yapabilir; üzeri için Yönetici PIN gerekir.
  * `delivered` durumuna geçmiş bir iş emrinin iptali yalnızca Yönetici PIN ve iptal gerekçesiyle yapılabilir; ilişkili gelir ve stok hareketleri otomatik ters kaydedilir.
* **Doğrulama:** `tests/workOrder.test.ts` (6 test), `tests/e2e/day3_work_orders.spec.ts` (4 test).

---

### 🔹 Gün 4: Stok Yönetimi, Reçeteler ve Otomatik Yedekleme
* **Stok Kartları & Hareketler:** Giriş, çıkış, fire ve periyodik sayım kayıtları.
* **Otomatik Sarfiyat Reçetesi (Recipe):**
  * Hizmetlere malzeme tüketim reçeteleri bağlandı (ör. Dış Yıkama $\rightarrow$ 50 ml Şampuan).
  * İş emri `completed` yapıldığında reçetedeki malzemeler stoktan otomatik düşer.
  * İş iptal edildiğinde stok miktarı otomatik iade edilir.
* **Kritik Stok Uyarısı:** Kritik seviyenin altına inen ürünler Dashboard ve Stok sayfasında anında kırmızı rozet ve uyarı bildirimi verir.
* **Yedekleme Altyapısı (`backupService.ts`):**
  * Tek tıkla SQLite sıcak yedeği (.db) alma ve harici disk/klasörden geri yükleme (Restore).
* **Doğrulama:** `tests/stock.test.ts` (4 test), `tests/e2e/day4_stock_backup.spec.ts` (3 test).

---

### 🔹 Gün 5: Gelir-Gider, Kasa Kapanışı ve Raporlar
* **Kasa Yönetimi (`cashRegisterRepository.ts`):**
  * Gün başı kasa açılış tutarı girişi (FR-32, P3).
  * Gün sonu kasa sayımı ve sistemin hesapladığı nakit ile girilen tutar arasındaki **Nakit Farkı** (Açık/Fazla) canlı göstergesi.
* **Gelir-Gider Tablosu:** Manuel gider girişi (kira, malzeme, fatura, personel avansı) ve kategori bazlı harcama dağılımı.
* **Finansal KPI'lar & Net Kâr:** Brüt Gelir, İadeler, Net Gelir, Toplam Giderler ve Net Kâr anlık formüle edildi.
* **`summaryService.ts`:** Hem analitik panelleri hem de Gün 6'daki ciro e-postasını besleyen ortak özet servisi yazıldı.
* **Raporlar Ekranı:** Günlük/haftalık/aylık ciro eğrileri, en çok satan hizmetler ve personel bazlı yıkanan araç & prim hak ediş tablosu.
* **Doğrulama:** `tests/finance.test.ts` (6 test), `tests/e2e/day5_finance_reports.spec.ts` (5 test).

---

### 🔹 Gün 6: Sağlamlaştırma, Rapor Dışa Aktarım ve Ciro E-Postası
* **Rapor Dışa Aktarım (FR-40):**
  * `excelExportService.ts` ile finansal özetler ve iş emri dökümleri Excel (.xlsx) formatında stillendirilmiş olarak dışa aktarılıyor.
  * Sayfa üzerinden direkt PDF / Yazdırma tetikleme entegrasyonu tamamlandı.
* **Güvenli Kimlik Bilgisi Saklama (`cryptoService.ts` - FR-54):**
  * Google SMTP Uygulama Şifreleri veritabanında açık metin tutulmaz; yerel anahtarla şifrelenir (AES-256 / DPAPI uyumlu).
* **Ciro E-Postası Gönderim Motoru (`emailService.ts` - FR-51–FR-55):**
  * Nodemailer SMTP adaptörü.
  * Mobil uyumlu, profesyonel HTML günlük faaliyet & kâr e-postası şablonu.
  * Test maili gönderme ve SMTP bağlantı doğrulama arayüzü (`SettingsPage.tsx`).
* **Dayanıklı Kuyruk Mekanizması (`emailOutboxRepository.ts` - B6, AC-13):**
  * Gönderim esnasında `sending` kilidi alınarak çift gönderim engellendi.
  * İnternet bağlantısı kesildiğinde istek kuyrukta kalır ve bağlantı geldiğinde otomatik yeniden denenir.
* **Arayüz Entegrasyonu (`App.tsx`):**
  * Header'da sol üst köşede **"Ciroyu Gönder"** butonu.
  * Yanında dinamik durum rozeti (*Hazır / Kuyrukta / Gönderildi / Hata*).
  * Aynı gün mükerrer gönderimde kullanıcıya onay sorusu çıkaran koruma mekanizması.
* **Doğrulama:** `tests/email_queue.test.ts` (6 test), `tests/e2e/day6_email_export.spec.ts` (4 test).

---

## 📈 Test ve Kalite Özeti

* **Birim ve Entegrasyon Testleri (Vitest):**
  * `tests/plate.test.ts` $\rightarrow$ 4/4 Geçti
  * `tests/db.test.ts` $\rightarrow$ 6/6 Geçti
  * `tests/auth.test.ts` $\rightarrow$ 5/5 Geçti
  * `tests/workOrder.test.ts` $\rightarrow$ 6/6 Geçti
  * `tests/stock.test.ts` $\rightarrow$ 4/4 Geçti
  * `tests/finance.test.ts` $\rightarrow$ 6/6 Geçti
  * `tests/email_queue.test.ts` $\rightarrow$ 6/6 Geçti
  * **Toplam:** **37 / 37 (%100 BAŞARILI)**

* **Uçtan Uca Arayüz Testleri (Playwright):**
  * `tests/e2e/day2_auth_settings.spec.ts` $\rightarrow$ 3/3 Geçti
  * `tests/e2e/day3_work_orders.spec.ts` $\rightarrow$ 4/4 Geçti
  * `tests/e2e/day4_stock_backup.spec.ts` $\rightarrow$ 3/3 Geçti
  * `tests/e2e/day5_finance_reports.spec.ts` $\rightarrow$ 5/5 Geçti
  * `tests/e2e/day6_email_export.spec.ts` $\rightarrow$ 4/4 Geçti
  * **Toplam:** **19 / 19 (%100 BAŞARILI)**

---

## 🚀 Sıradaki Adım: Gün 7 (Kurulum, Canlıya Alma ve Teslimat)

1. [ ] **Windows Installer Derlemesi:** `npm run build` ve `electron-builder` ile Windows 10/11 uyumlu kurulum `.exe` dosyasının üretilmesi.
2. [ ] **İlk Açılış Verileri:** Gerçek işletme adı, araç tipleri, güncel yıkama fiyatları ve açılış stok miktarlarının girilmesi.
3. [ ] **SMTP Canlı Tanımlama:** İşletme sahibinin Gmail hesabı, Google Uygulama Şifresi ve alıcı e-posta adresinin Ayarlar ekranında tanımlanıp ilk gerçek test e-postasının patrona ulaştırılması.
4. [ ] **Kullanıcı & Kasa Eğitimi:** Kasa personeline <30 saniyelik iş emri girişi eğitimi, yöneticiye kâr raporu ve yedek alma rehberinin verilmesi.
5. [ ] **v1.0 Canlıya Geçiş:** İşletmede defter ile paralel 1 haftalık pilot başlatılması.
