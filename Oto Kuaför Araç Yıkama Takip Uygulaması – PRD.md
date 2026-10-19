# Oto Kuaför Araç Yıkama Takip Uygulaması – PRD

Oct 8, 2026 · @Yağız

## 1. Proje özeti

Oto kuaför için, internet gerektirmeden tek bilgisayarda çalışan; günlük yıkama sayısını, stoku ve gelir-gideri tek yerden takip eden bir masaüstü uygulaması geliştirilecek. Hedef, AI kodlama asistanı kullanan tek bir geliştiriciyle 7 gün içinde v1.0 sürümünü işletmede canlıya almaktır.

| Alan | Değer |
| --- | --- |
| Ürün adı (çalışma) | WashTrack |
| Platform | Windows 10/11 masaüstü, çevrimdışı (lokal) |
| Hedef kullanıcı | Tek şubeli oto kuaför: işletme sahibi, kasa/resepsiyon, yıkama personeli |
| Dil | Türkçe arayüz, para birimi TL |
| Doküman sürümü | v0.1 – Taslak |
| Tahmini süre | 1 hafta (7 gün): AI destekli geliştirme, 1 geliştirici + AI kodlama asistanı |

Uygulamanın üç çekirdeği şunlardır: günlük yıkama/iş emri kaydı, malzeme stok takibi ve gelir-gider tablosu. Bunların üzerine raporlama, kullanıcı yetkileri ve otomatik yedekleme eklenir.

## 2. Problem, hedefler ve başarı kriterleri

Bugün yıkama kayıtları defter veya Excel'de tutuluyor; gün sonu kasa, stok bitmesi ve aylık kâr ancak elle hesaplanabiliyor. Uygulama bu üç bilgiyi kayıt anında üretmeyi hedefler.

**Mevcut sorunlar**

- Günde kaç araç yıkandığı ve hangi hizmetin ne kadar sattığı anında görülemiyor.
- Şampuan, cila, mikrofiber bez gibi malzemeler bitince fark ediliyor; iş aksıyor.
- Gelir ve giderler dağınık; aylık net kâr ve gider kalemleri net değil.
- Personel bazlı iş yükü ve prim hesaplaması zor.

**Hedefler ve ölçülebilir başarı kriterleri**

| Hedef | Başarı kriteri |
| --- | --- |
| Hızlı kayıt | Yeni bir yıkama kaydı 30 saniyenin altında girilebilir |
| Günlük görünürlük | Gün sonu raporu tek tıkla, 3 saniyenin altında açılır |
| Stok kontrolü | Kritik seviyenin altına düşen her ürün için uyarı çıkar; stok farklılığı aylık sayimda %5'in altında |
| Finansal netlik | Aylık gelir-gider ve net kâr raporu elle hesaba gerek kalmadan alınır |
| Benimsenme | Pilot sonunda işlemlerin %95'i uygulama üzerinden girilir, defter bırakılır |
| Veri güvenliği | Günlük otomatik yedek alınır; veri kaybı sıfır |

## 3. Kapsam

v1.0, tek şubede tek bilgisayarda çalışan ve yıkama, stok, gelir-gider döngüsünü kapatan bir üründür; çok şube ve bulut sonraki sürümlere bırakılır.

**Kapsam içi (v1.0)**

- Yıkama/iş emri kaydı: araç, hizmet, personel, ücret, ödeme yöntemi, durum.
- Müşteri ve araç (plaka) kartı, ziyaret geçmişi.
- Hizmet kataloğu ve araç tipine göre fiyat listesi.
- Stok: ürün kartı, giriş/çıkış, hizmet başına otomatik tüketim (reçete), kritik seviye uyarısı, sayım.
- Gelir-gider: otomatik gelir kaydı, manuel gider girişi, kategoriler, kasa gün sonu.
- Raporlar ve gösterge paneli; Excel/PDF dışa aktarım.
- Kullanıcı girişi ve rol bazlı yetki.
- Otomatik ve manuel yedekleme, geri yükleme.
- Ciro bildirimi: sol üstteki butonla günlük/haftalık ciro özetinin patrona e-posta ile gönderilmesi (internet yoksa kuyrukta bekler).

**Kapsam dışı (v1.0)**

- Çoklu şube, bulut senkronizasyonu, mobil uygulama.
- e-Fatura / e-Arşiv entegrasyonu ve resmi muhasebe defteri (muhasebeciye Excel dışa aktarım yeterli kabul edilir).
- Online randevu, SMS/WhatsApp bildirimleri (ciro bildirimi v1.0'da yalnızca e-posta), POS cihazı entegrasyonu.
- Tam bordro ve SGK hesaplamaları.

**1 haftalık süre için kural:** v1.0 yalnızca M (Olmalı) gereksinimleri içerir. S ve C maddeleri (fiş yazdırma, veresiye, paket hizmet, düzenli giderler, Excel'den içe aktarım, tedarikçi geçmişi, sadakat, tema, fatura görseli, hizmet maliyet raporu) v1.1 backlog'una ertelenir. Haftanın ortasında gelen her yeni talep de v1.1'e yazılır.

## 4. Kullanıcı rolleri

Uygulamada üç rol vardır; yetkiler en dar rolden başlayarak genişler ve finansal veriler yalnızca yöneticiye açıktır.

| Rol | Kim | Temel ihtiyacı | Yetkiler |
| --- | --- | --- | --- |
| Yönetici | İşletme sahibi | Kârı, giderleri, personel performansını görmek | Tam erişim: raporlar, fiyatlar, giderler, kullanıcılar, yedekleme, ayarlar |
| Kasa / Resepsiyon | Araç kabul eden ve tahsilat yapan kişi | Aracı hızlı kaydetmek, ödemeyi almak | Yıkama kaydı, müşteri/araç, tahsilat, günlük kasa, stok çıkışı; gider ve rapor göremez |
| Yıkama personeli | Yıkamayı yapan çalışan | Kendisine atanan işi görmek ve tamamlamak | İş listesini görme, durumu “Tamamlandı” yapma (opsiyonel; tek bilgisayarda genellikle kasa kullanır) |

**Temel kullanıcı hikayeleri**

1. Kasa olarak, plakayı yazıp hizmeti seçerek aracı 30 saniyede kaydetmek istiyorum.
2. Kasa olarak, gün sonunda nakit/kart toplamlarını görüp kasayı kapatmak istiyorum.
3. Yönetici olarak, bir ürün kritik seviyeye düştüğünde uyarı almak istiyorum.
4. Yönetici olarak, ay sonunda gelir, gider ve net kârı kategori bazında görmek istiyorum.
5. Yönetici olarak, hangi personelin kaç araç yıkadığını görerek prim hesaplamak istiyorum.

## 5. Fonksiyonel gereksinimler

Gereksinimler sekiz modüle ayrılmıştır; öncelik MoSCoW ile verilmiştir (M: Olmalı, S: Olsa iyi olur, C: Olabilir). M olanların tamamı v1.0 için zorunludur; S ve C maddeler 1 haftalık planda v1.1'e ertelenir.

### 5.1 Yıkama / iş emri takibi

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-01 | Plaka ile yeni iş emri açma; kayıtlı plaka girilince müşteri ve araç tipi otomatik dolar | M |
| FR-02 | Bir iş emrine birden fazla hizmet ekleme (ör. dış yıkama + iç temizlik + cila) | M |
| FR-03 | Fiyat, araç tipine göre fiyat listesinden otomatik gelir; yetkili kullanıcı indirim uygulayabilir | M |
| FR-04 | İş emri durumu: Bekliyor → Yıkanıyor → Tamamlandı → Teslim edildi / İptal | M |
| FR-05 | İşi yapan personel(ler)in atanması | M |
| FR-06 | Tahsilat: nakit, kredi kartı, havale; parçalı ödeme (veresiye v1.1'de, FR-13) | M |
| FR-07 | Günlük sayaç: bugün yıkanan araç sayısı ve ciro ana ekranda her an görünür | M |
| FR-08 | Basit fiş/bilgi füşü yazdırma (termal yazıcı, resmi fiş yerine geçmez) | S |
| FR-09 | İptal edilen iş emri silinmez, gerekçesiyle saklanır | M |

### 5.2 Müşteri ve araç

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-10 | Müşteri kartı: ad, telefon, not; bir müşteriye birden fazla araç | M |
| FR-11 | Araç kartı: plaka, marka, model, renk, araç tipi (binek, SUV, ticari, motosiklet) | M |
| FR-12 | Plakaya göre ziyaret geçmişi ve toplam harcama | M |
| FR-13 | Veresiye bakiyesi ve tahsilat takibi | S |
| FR-14 | Sadakat: X. yıkama ücretsiz gibi basit kampanya kuralı | C |

### 5.3 Hizmet ve fiyat yönetimi

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-15 | Hizmet kataloğu: ekle, düzenle, pasife al (silme yok) | M |
| FR-16 | Araç tipi × hizmet fiyat matrisi | M |
| FR-17 | Fiyat değişikliği geçmişi; eski iş emirleri eski fiyatı korur | M |
| FR-18 | Paket hizmet (birden fazla hizmeti tek fiyatla satma) | S |

### 5.4 Stok takibi

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-19 | Ürün kartı: ad, kategori, birim (lt, kg, adet), alış fiyatı, kritik seviye, tedarikçi | M |
| FR-20 | Stok girişi (satın alma): miktar, birim fiyat, tedarikçi; giriş otomatik gider kaydı oluşturur (isteğe bağlı) | M |
| FR-21 | Hizmet reçetesi: her hizmetin tükettiği tahmini malzeme miktarı (ör. dış yıkama = 0,1 lt şampuan) | M |
| FR-22 | İş emri tamamlandığında reçeteye göre otomatik stok düşümü | M |
| FR-23 | Manuel stok çıkışı / fire kaydı | M |
| FR-24 | Kritik seviye uyarısı (ana ekran rozeti + liste) | M |
| FR-25 | Periyodik sayım: sistem ve fiili miktar farkını kaydetme, düzeltme hareketi | M |
| FR-26 | Stok hareket geçmişi ve ürün bazlı tüketim raporu | M |
| FR-27 | Tedarikçi listesi ve satın alma geçmişi | S |

### 5.5 Gelir-gider

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-28 | Tahsil edilen her iş emri otomatik gelir kaydı oluşturur | M |
| FR-29 | Manuel gelir (ör. ürün satışı) ve gider girişi | M |
| FR-30 | Gider kategorileri: kira, elektrik, su, doğalgaz, maaş, malzeme, bakım, vergi, diğer (düzenlenebilir) | M |
| FR-31 | Düzenli giderler: aylık tekrarlayan kayıt şablonu (kira, maaş) | S |
| FR-32 | Kasa: gün açılış bakiyesi, gün sonu kapanış, nakit farkı kaydı | M |
| FR-33 | Gelir-gider tablosu: tarih aralığı, kategori, ödeme yöntemi filtreleri; net kâr | M |
| FR-34 | Gider fatura/fiş görselini ekleme | C |

### 5.6 Raporlama ve gösterge paneli

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-35 | Panel: bugünkü araç sayısı, ciro, bekleyen işler, kritik stok, ayın net kârı | M |
| FR-36 | Günlük / haftalık / aylık yıkama sayısı raporu ve grafiği | M |
| FR-37 | Hizmet bazlı satış adedi ve ciro | M |
| FR-38 | Personel bazlı iş sayısı ve ciro (prim hesabı için) | M |
| FR-39 | Aylık gelir-gider ve kârlılık raporu, önceki ayla kıyas | M |
| FR-40 | Tüm raporları Excel (.xlsx) ve PDF olarak dışa aktarma | M |
| FR-41 | Hizmet başına malzeme maliyeti ve brüt kâr | S |

### 5.7 Kullanıcı ve yetki yönetimi

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-42 | Kullanıcı adı + şifre (veya 4–6 haneli PIN) ile giriş | M |
| FR-43 | Rol bazlı yetki (Yönetici, Kasa, Personel) | M |
| FR-44 | Personel kartı: ad, telefon, prim oranı, aktif/pasif | M |
| FR-45 | İşlem günlüğü: kim, ne zaman, neyi değiştirdi/iptal etti | M |

### 5.8 Ayarlar, yedekleme ve veri

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-46 | İşletme bilgileri (ad, adres, logo) ve fiş başlığı | M |
| FR-47 | Her gün kapanışta otomatik yedek; son 30 yedeğin saklanması | M |
| FR-48 | Harici diske / USB'ye manuel yedek ve geri yükleme | M |
| FR-49 | Mevcut Excel kayıtlarından müşteri, ürün ve fiyat listesi içe aktarma | S |
| FR-50 | Açık/koyu tema | C |

### 5.9 Ciro bildirimi (e-posta)

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-51 | Her ekranda sol üst köşede “Ciroyu Gönder” butonu; tıklanınca dönem seçimi (Bugün varsayılan, Bu hafta) ve tek tıkla patrona e-posta | M |
| FR-52 | E-posta içeriği: dönem, yıkanan araç sayısı, ciro, nakit/kart/havale dağılımı, giderler, net, en çok satan 3 hizmet; okunaklı HTML + düz metin | M |
| FR-53 | Gönderim kuyruğu: internet yoksa mesaj kaybolmaz, uygulama açıkken 5 dakikada bir yeniden denenir; aynı dönem iki kez gönderilmeden önce onay sorulur | M |
| FR-54 | Ayarlar: SMTP sunucusu/port, gönderen, uygulama şifresi (şifreli), alıcı adres(ler)i, “Test maili gönder” butonu | M |
| FR-55 | Buton yanında durum göstergesi (gönderildi / kuyrukta / hata) ve gönderim geçmişi | M |
| FR-56 | Kasa kapanışında günlük, pazar kapanışında haftalık özetin otomatik gönderimi (ayarlardan açılıp kapanır) | S |

Butonu Yönetici ve Kasa rolleri kullanabilir; Kasa, gönderilen tutarları ekranda görmez, yalnızca gönderim durumunu görür.

## 6. Fonksiyonel olmayan gereksinimler

Uygulama orta seviye bir ofis bilgisayarında, internet olmadan, hızlı ve veri kaybetmeden çalışmalıdır.

| Kod | Alan | Gereksinim |
| --- | --- | --- |
| NFR-01 | Performans | Uygulama 5 sn içinde açılır; ekran geçişleri ve aramalar 1 sn altında; 5 yıllık veride (yaklaşık 100.000 iş emri) raporlar 3 sn altında |
| NFR-02 | Donanım | Windows 10/11, 4 GB RAM, 2 çekirdek, 500 MB disk; 1366×768 ve üstü ekran |
| NFR-03 | Çevrimdışı | Tüm özellikler internet olmadan çalışır; veri yalnızca lokal diskte tutulur. Tek istisna ciro e-postasıdır: gönderim anında internet ister, yoksa kuyrukta bekler |
| NFR-04 | Kullanılabilirlik | Bilgisayar deneyimi az bir kasa personeli 30 dakikalık eğitimle temel işlemleri yapabilir; büyük butonlar, klavye kısayolları, dokunmatik ekran uyumu |
| NFR-05 | Veri bütünlüğü | Finansal kayıtlar fiziksel olarak silinmez (iptal/ters kayıt); tüm para tutarları kuruş cinsinden tam sayı olarak saklanır |
| NFR-06 | Güvenilirlik | Elektrik kesintisinde veri kaybı olmaz (transaction + WAL modu); yedekten geri yükleme 5 dakikadan kısa sürer |
| NFR-07 | Güvenlik | Şifreler bcrypt/argon2 ile hashlenir; yetkisiz rol finansal ekranları göremez; 15 dk hareketsizlikte oturum kilitlenir |
| NFR-08 | Yasal uyum | Müşteri adı/telefonu için KVKK aydınlatma metni ayarlardan eklenebilir; müşteri verisi talep hâlinde anonimleştirilebilir |
| NFR-09 | Yerelleştirme | Türkçe arayüz, TL, GG.AA.YYYY tarih, Türkçe karakterli arama ve sıralama |
| NFR-10 | Bakım kolaylığı | Modüler kod, kritik iş kuralları (fiyat, stok düşümü, kasa farkı, kâr) için AI ile üretilip insan tarafından gözden geçirilmiş birim testler, veritabanı göçleri (migration) sürümlü |
| NFR-11 | Güncellenebilirlik | Yeni sürüm kurulumu veriyi korur, kurulum öncesi otomatik yedek alır |

## 7. Teknik mimari ve teknoloji seçimi

Önerilen yapı Electron + React + TypeScript arayüzü ve gömülü SQLite veritabanıdır; sunucu gerektirmez, tek kurulum dosyasıyla dağıtılır.

&#91;embedded content: uygulama mimarisi · 3 katman + yerel disk\]

Arayüz veritabanına doğrudan erişemez; tüm işlemler IPC üzerinden servis katmanına gider, böylece fiyat, stok ve kasa kuralları tek yerde test edilir.

| Katman | Seçim | Gerekçe |
| --- | --- | --- |
| Masaüstü çatısı | Electron | Olgun, Windows kurulum ve yazıcı desteği güçlü; web ekibi hızlı geliştirir |
| Arayüz | React + TypeScript + Vite, Mantine UI bileşenleri | Hızlı form ve tablo geliştirme, tip güvenliği |
| Grafikler | Recharts | Panel ve rapor grafikleri |
| Veritabanı | SQLite (better-sqlite3), WAL modu | Kurulum gerektirmez, tek dosya, kolay yedeklenir, elektrik kesintisine dayanıklı |
| ORM / migration | Drizzle ORM | Tip güvenli sorgular, sürümlü şema göçleri |
| Dışa aktarım | ExcelJS (.xlsx), Electron printToPDF (PDF) | Muhasebeciye uygun çıktı |
| Paketleme | electron-builder (NSIS installer); kod imzalama v1.1 | Tek tıkla kurulum ve güncelleme |
| Test | Vitest, Playwright | Birim, entegrasyon ve E2E |
| Sürüm kontrolü / CI | Git + GitHub Actions | Her commit'te test ve Windows build |
| E-posta | nodemailer (SMTP, Gmail uygulama şifresi), Electron safeStorage | Sunucu ve abonelik gerektirmez, ücretsiz; şifre Windows şifrelemesiyle saklanır |

Alternatif olarak Tauri (daha küçük kurulum) veya .NET WPF değerlendirilebilir; 1 haftalık planda AI'ın en iyi tanıdığı ve örneği en bol yığın olan Electron + React seçilir.

## 8. Veri modeli

Veri tek bir SQLite dosyasında 19 tabloda tutulur; merkezde iş emri vardır ve stok düşümü ile gelir kaydı iş emrinden türetilir.

| Tablo | Amaç | Önemli alanlar | İlişkiler |
| --- | --- | --- | --- |
| `users` | Giriş yapan kullanıcılar | kullanıcı\_adı, şifre\_hash, rol, aktif | — |
| `staff` | Yıkama personeli | ad, telefon, prim\_oranı, aktif | `users` (opsiyonel) |
| `customers` | Müşteriler | ad, telefon, not, veresiye\_bakiye | 1–N `vehicles` |
| `vehicles` | Araçlar | plaka (benzersiz), marka, model, renk, araç\_tipi\_id | N–1 `customers` |
| `vehicle_types` | Binek, SUV, ticari, motosiklet | ad, sıra | — |
| `services` | Hizmet kataloğu | ad, açıklama, süre\_dk, aktif | 1–N `service_prices`, `service_recipes` |
| `service_prices` | Araç tipine göre fiyat | hizmet\_id, araç\_tipi\_id, fiyat\_kuruş, geçerlilik\_başlangıcı | — |
| `work_orders` | İş emri (yıkama kaydı) | no, araç\_id, durum, giriş\_zamanı, teslim\_zamanı, toplam, indirim, oluşturan | 1–N `work_order_items`, `payments` |
| `work_order_items` | İş emri satırları | hizmet\_id, birim\_fiyat (o anki), adet, personel\_id | — |
| `payments` | Tahsilatlar | iş\_emri\_id, tutar, yöntem, zaman | → `transactions` |
| `products` | Stok kartı | ad, kategori, birim, mevcut\_miktar, kritik\_seviye, ort\_maliyet | 1–N `stock_movements` |
| `service_recipes` | Hizmet başına malzeme tüketimi | hizmet\_id, ürün\_id, miktar | — |
| `stock_movements` | Stok hareketleri | ürün\_id, tür (giriş, tüketim, fire, sayım düzeltme), miktar, birim\_maliyet, kaynak | `work_orders`, `suppliers` |
| `suppliers` | Tedarikçiler | ad, telefon, not | — |
| `transactions` | Gelir-gider defteri | tür (gelir/gider), kategori\_id, tutar, yöntem, tarih, açıklama, kaynak | `categories` |
| `cash_sessions` | Kasa açılış/kapanış | tarih, açılış, beklenen, sayılan, fark | — |
| `audit_log` | İşlem günlüğü | kullanıcı, eylem, tablo, kayıt\_id, eski/yeni değer, zaman | — |
| `settings` | İşletme ve e-posta ayarları | anahtar, değer (SMTP sunucu/port, gönderen, alıcılar, otomatik gönderim açık/kapalı); şifre burada değil, safeStorage'da | — |
| `email_outbox` | Ciro e-postası gönderim kuyruğu | tür (günlük/haftalık), dönem, durum (bekliyor/gönderildi/hata), deneme\_sayısı, son\_hata, tetikleyen (buton/otomatik), kullanıcı, oluşturma, gönderim\_zamanı | users |

**Temel iş kuralları**

- Mevcut stok `stock_movements` toplamından hesaplanır; `products.mevcut_miktar` performans için tutulan bir önbellektir.
- İş emri “Tamamlandı” olunca reçete kadar tüketim hareketi oluşur; iptal olursa ters hareket yazılır.
- Her tahsilat bir gelir kaydı doğurur; stok girişi isteğe bağlı olarak bir “Malzeme” gider kaydı doğurur.
- Tutarlar kuruş cinsinden tam sayıdır; tarih-saat yerel saat dilimiyle (Europe/Istanbul) saklanır.
- Ciro e-postası kuyrukta yalnızca dönemi tutar; içerik gönderim anında veritabanından yeniden oluşturulur, böylece kapanıştan sonraki düzeltmeler de yansır. Panel ve e-posta aynı özet servisini kullanır.

## 9. Ekranlar ve kullanıcı akışları

Uygulama sol menülü 9 ana ekrandan oluşur; en sık kullanılan akış olan iş emri, ana ekrandan tek tıkla ve klavyeyle tamamlanabilir.

&#91;embedded content: iş emri akışı · 7 adım, 1 karar\]

Kasa personeli yalnızca plaka, hizmet ve ödeme yöntemini seçer; stok düşümü ve gelir kaydı arka planda oluşur, ayrıca giriş gerektirmez.

| Ekran | Amacı | Ana öğeler | Rol |
| --- | --- | --- | --- |
| Giriş | Kullanıcı doğrulama | Kullanıcı seçimi + PIN/şifre | Herkes |
| Ana panel | Günün özeti | Bugünkü araç sayısı, ciro, bekleyen/yıkanan işler kanbanı, kritik stok rozeti, “Yeni iş emri” butonu (F2) | Herkes (finans kartları yöneticiye) |
| İş emri | Kayıt ve tahsilat | Plaka arama, hizmet butonları, otomatik fiyat, indirim, personel, ödeme | Kasa, Yönetici |
| Müşteri ve araç | Kart ve geçmiş | Liste, arama, ziyaret geçmişi, veresiye bakiyesi | Kasa, Yönetici |
| Hizmet ve fiyat | Katalog | Hizmet listesi, araç tipi × fiyat matrisi, reçete | Yönetici |
| Stok | Malzeme yönetimi | Ürün listesi, giriş, çıkış/fire, sayım, hareket geçmişi | Yönetici (çıkış: Kasa) |
| Gelir-gider | Finans | Kayıt listesi, gider girişi, kategori, filtreler, kasa aç/kapat | Yönetici (kasa kapanışı: Kasa) |
| Raporlar | Analiz | Günlük/aylık yıkama, hizmet, personel, gelir-gider, stok raporları; Excel/PDF | Yönetici |
| Ayarlar | Sistem | İşletme bilgisi, kullanıcılar, personel, yedekleme, e-posta ayarları, yazıcı, içe aktarım | Yönetici |

**Ciroyu Gönder butonu:** her ekranda sol üst köşede, logonun yanında durur. Tıklanınca küçük bir pencere açılır: dönem (Bugün / Bu hafta), alıcı ve “Gönder”. Gönderim arka planda yapılır, kullanıcı işine devam eder; butonun üzerindeki küçük işaret yeşil (gönderildi), sarı (kuyrukta) veya kırmızı (hata) olur.

**Arayüz ilkeleri:** en az 44 px yüksekliğinde butonlar, her ekranda klavye kısayolu, onay gerektiren işlemlerde (iptal, silme, geri yükleme) açık uyarı, boş durumlarda yönlendirici metin.

## 10. Geliştirme yol haritası (7 gün, AI destekli)

Proje, AI kodlama asistanı (ör. Claude Code) kullanan tek bir geliştiriciyle 7 günde tamamlanır; her günün sonunda çalışan bir sürüm ve bir kontrol noktası vardır.

&#91;embedded content: yol haritası · 5 faz, 5 onay kapısı (ölçeksiz)\]

Süreyi mümkün kılan üç şey var: kapsamın yalnızca M maddelere indirilmesi, kodun büyük kısmını AI'ın bu PRD'den üretmesi ve geliştiricinin zamanını yazmaya değil gözden geçirmeye ve test etmeye ayırması.

### AI ile çalışma yöntemi

- Bu PRD, veri modeli ve iş kuralları repodaki `CLAUDE.md` / `docs/` dosyalarına konur; AI her görevde bunları bağlam olarak okur.
- Her FR maddesi küçük bir göreve bölünür: AI önce plan çıkarır, geliştirici onaylar, AI kodu ve testini yazar, geliştirici çalıştırıp gözden geçirir.
- Para hesabı, stok düşümü ve kasa kuralları satır satır insan tarafından incelenir; bu alanlarda AI çıktısı testsiz birleştirilmez.
- Her görev ayrı commit; gün sonunda CI yeşil olmadan sonraki güne geçilmez.
- İşletme sahibi günde 15 dakikalık demoya katılır (WhatsApp görüntülü arama da olur).

### Gün 1 · Hazırlık

- [ ] İşletme sahibiyle 1 saatlik görüşme: açık sorular (Bölüm 13), hizmet ve fiyat listesi, ürünler, reçeteler
- [ ] M listesini kilitle; S/C maddeleri v1.1'e yaz
- [ ] Repo, Electron + React + TypeScript iskeleti, CI, `CLAUDE.md`
- [ ] Veritabanı şeması, migration ve seed verisi (Bölüm 8); settings ve email\_outbox tabloları da ilk migration'a girer
- [ ] Boş uygulamayı işletme bilgisayarı benzeri bir Windows'ta çalıştır

**Kontrol noktası – Kapsam onayı:** M listesi işletme sahibince onaylandı, iskelet açılıyor.

### Gün 2 · Altyapı ve ana veriler

- [ ] IPC ve servis/repository katmanı, hata yönetimi
- [ ] Giriş, kullanıcı ve roller (FR-42–45)
- [ ] Ana yerleşim, menü, TL ve tarih biçimleri
- [ ] Araç tipleri, hizmet kataloğu, fiyat matrisi (FR-15–17)
- [ ] Müşteri ve araç kartları, plaka arama (FR-10–12)
- [ ] Üst barda sol üst “Ciroyu Gönder” butonunun yerini aç (şimdilik pasif, yerleşimle birlikte \~15 dk)

### Gün 3 · İş emri ve tahsilat

- [ ] İş emri ekranı: plaka, çoklu hizmet, otomatik fiyat, indirim, personel, durumlar, iptal (FR-01–05, FR-09)
- [ ] Tahsilat ve otomatik gelir kaydı (FR-06, FR-28)
- [ ] Panelde günlük sayaç ve bekleyen işler (FR-07)
- [ ] Klavye kısayolları; 30 saniyelik kayıt hedefini ölç

**Kontrol noktası – MVP demo:** bir araç plakadan teslime kadar uygulamada işleniyor.

### Gün 4 · Stok

- [ ] Ürün kartı, stok girişi (FR-19–20)
- [ ] Reçete ve tamamlanan işte otomatik düşüm, iptalde ters hareket (FR-21–22)
- [ ] Fire, sayım, kritik seviye uyarısı, hareket geçmişi (FR-23–26)

### Gün 5 · Gelir-gider, kasa ve raporlar

- [ ] Gider/gelir girişi ve kategoriler (FR-29–30)
- [ ] Kasa açılış/kapanış, nakit farkı (FR-32)
- [ ] Gelir-gider tablosu ve net kâr (FR-33)
- [ ] Panel kartları; yıkama, hizmet, personel ve aylık kâr raporları (FR-35–39)
- [ ] Panel kartları için yazılan özet sorgusunu ortak SummaryService olarak kur; aynı servis Gün 6'da ciro e-postasını besler (ek süre yok)

**Kontrol noktası – Özellik tamam:** yıkama, stok ve finans döngüsü uçtan uca çalışıyor.

### Gün 6 · Sağlamlaştırma

- [ ] Excel ve PDF dışa aktarım (FR-40)
- [ ] Otomatik/manuel yedekleme ve geri yükleme, işletme ayarları (FR-46–48)
- [ ] 10 kritik senaryonun E2E/manuel testi, elektrik kesintisi denemesi, hata düzeltme turu
- [ ] AI ile 1 yıllık sahte veri üret, hız kontrolü (NFR-01)
- [ ] Installer, kurulum sihirbazı, Hızlı Başlangıç kartı
- [ ] Ciro e-postası: nodemailer adaptörü, HTML şablon, kuyruk ve yeniden deneme, e-posta ayarları + test maili, butonu aktif et (FR-51–55); AI ile \~3 saat, sabah ilk iş

**Kontrol noktası – RC sürüm:** açık kritik/yüksek hata yok, installer temiz Windows'ta kuruluyor.

### Gün 7 · Kurulum ve teslim

- [ ] İşletmeye kurulum, ana veriler ve açılış stoku
- [ ] Kasa ve yönetici eğitimi (Bölüm 12)
- [ ] Gerçek işlemlerle yarım gün kullanım, son düzeltmeler, v1.0
- [ ] v1.1 backlog'unu işletme sahibiyle sırala
- [ ] Patronun e-posta adresini ve Gmail uygulama şifresini tanımla; test maili ve ilk gerçek gün sonu ciro maili

**Kontrol noktası – v1.0 kabul:** Bölüm 11'deki kabul kriterleri sağlanıyor. Defterle paralel kullanım teslimden sonraki 1 hafta devam eder; bu sürede çıkan hatalar garanti kapsamında düzeltilir.

**Ciro e-postası planı neden uzatmıyor:** özellik tek bir güne yığılmak yerine dört parçaya bölündü. Tablolar Gün 1'deki migration'a, buton Gün 2'deki üst bara, özet sorgusu Gün 5'te zaten yazılan panel servisine biner. Geriye Gün 6'da yalnızca SMTP gönderimi, kuyruk ve ayarlar ekranı kalır (\~3 saat). Bu sabah, AI gönderim kodunu yazarken geliştirici Excel/PDF çıktılarını test eder; toplam ek yük yarım günü geçmez.

**Tampon ve risk:** Planın tamponu yoktur. Bir gün kayarsa ilk olarak Gün 5'teki personel ve aylık kâr raporları, PDF dışa aktarım ve otomatik ciro gönderimi (FR-56) v1.1'e kaydırılır; butonla ciro gönderimi korunur; iş emri, stok, kasa ve yedekleme asla kesilmez.

## 11. Test, kalite güvence ve kabul kriterleri

Her günün sonunda çalışan bir sürüm müşteriye gösterilir; v1.0, aşağıdaki kabul kriterlerinin tamamı pilotta sağlanınca teslim edilmiş sayılır.

**Test seviyeleri**

| Seviye | Araç | Kapsam | Ne zaman |
| --- | --- | --- | --- |
| Birim test | Vitest | Fiyat hesabı, indirim, stok düşümü, kasa farkı, kâr hesabı; en az %70 kapsam | Her commit (CI) |
| Entegrasyon testi | Vitest + geçici SQLite | Servis + veritabanı: iş emri → tahsilat → gelir kaydı → stok hareketi zinciri | Her commit (CI) |
| Uçtan uca (E2E) | Playwright (Electron) | 10 kritik senaryo: giriş, iş emri aç/kapat, iptal, stok girişi, sayım, gider, gün sonu, rapor dışa aktarım, yedek/geri yükle | Gün 6 |
| Performans | AI ile üretilmiş 1 yıllık sahte veri | NFR-01 süreleri | Gün 6 |
| Kullanıcı kabul (UAT) | Gerçek kullanıcılar, işletmede | Gün 7'de gerçek işlemler, ardından 1 hafta defterle paralel | Pilot |

**v1.0 kabul kriterleri**

- [ ] Kasa personeli bir iş emrini 30 saniyenin altında açıp kapatır.
- [ ] Pilot haftasında uygulamanın günlük araç sayısı ve cirosu defterle birebir tutar.
- [ ] Reçeteye göre düşen stok, hafta sonu sayımında %5'ten az sapar.
- [ ] Aylık gelir-gider raporu Excel'e aktarılır ve muhasebeci tarafından kullanılabilir bulunur.
- [ ] Elektrik kesintisi simülasyonunda veri kaybı olmaz; yedekten geri yükleme 5 dakikadan kısa sürer.
- [ ] Kasa rolüyle giriş yapıldığında gider ve kâr ekranları görünmez.
- [ ] Açık kritik veya yüksek öncelikli hata (bug) yoktur.
- [ ] Sol üstteki butonla gönderilen ciro e-postası 1 dakika içinde patrona ulaşır, tutarlar panelle birebir tutar; internet kesikken gönderilen mail bağlantı gelince otomatik gider.

**Hata önceliklendirme:** Kritik (veri kaybı, yanlış para hesabı) aynı gün; Yüksek (iş akışı durur) 2 iş günü; Orta/Düşük v1.1.

## 12. Kurulum, dağıtım, eğitim ve bakım

Uygulama tek bir Windows kurulum dosyası (.exe) ile yüklenir, ilk açılışta kurulum sihirbazı işletmeyi hazır hale getirir.

**Kurulum adımları**

1. Installer (NSIS, kod imzalı) işletme bilgisayarına kurulur; veri klasörü `C:\Users\<kullanıcı>\AppData\Roaming\YikamaTakip`.
2. İlk açılış sihirbazı: işletme bilgisi, yönetici hesabı, araç tipleri, hizmet ve fiyat listesi, ürünler ve açılış stoku, yedek klasörü.
3. Varsa mevcut Excel kayıtları içe aktarılır (FR-49).
4. Termal yazıcı ve yedek USB/harici disk tanımlanır, test yedeği alınır.
5. İşletmenin Gmail hesabında iki adımlı doğrulama açılır, uygulama şifresi oluşturulur ve Ayarlar > E-posta'ya girilir; test maili patrona gönderilir.

**Eğitim**

- Kasa personeli: 30 dk uygulamalı eğitim + tek sayfalık “Hızlı Başlangıç” kartı (kasa yanında dursun).
- Yönetici: 1 saat; raporlar, stok sayımı, gider girişi, yedekleme ve geri yükleme.
- Uygulama içi yardım sayfası ve 3–4 kısa ekran videosu.

**Bakım ve destek**

- 3 ay ücretsiz hata düzeltme garantisi; sonrası yıllık bakım sözleşmesi (opsiyonel).
- Güncellemeler yeni installer ile verilir; kurulum öncesi otomatik yedek alınır, veritabanı göçleri otomatik çalışır.
- Hata raporu için uygulama, kullanıcı onayıyla log + sistem bilgisini tek ZIP dosyası olarak dışa aktarır.
- Yedekleme kuralı müşteriye yazılı verilir: günlük otomatik yedek bilgisayarda, haftalık bir kopya harici diskte.

## 13. Riskler, varsayımlar ve açık sorular

En büyük risk teknik değil, benimsenmedir: personel defteri bırakmazsa veri eksik kalır; bu yüzden hızlı kayıt ekranı en yüksek önceliktir.

**Riskler**

| Risk | Olasılık | Etki | Önlem |
| --- | --- | --- | --- |
| Personel uygulamayı kullanmaz, deftere devam eder | Yüksek | Yüksek | 30 sn kayıt hedefi, Gün 3'ten itibaren kasa personeliyle demo, teslim sonrası paralel kullanım |
| Bilgisayar arızası / disk bozulması ile veri kaybı | Orta | Yüksek | Günlük otomatik + haftalık harici yedek, geri yükleme testi kabul kriterinde |
| Reçete miktarları gerçeği yansıtmaz, stok sapar | Yüksek | Orta | İlk ay haftalık sayım, sapmaya göre reçete güncelleme ekranı |
| Kapsam kayması (e-Fatura, SMS, mobil talebi) | Orta | Orta | Kapsam dışı listesi imzalı; yeni talepler v1.1 listesine |
| Müşterinin geri bildirim gecikmesi | Orta | Orta | Her gün sonu sabit 15 dakikalık demo |
| Eski Windows / zayıf donanım | Düşük | Orta | Gün 1'de iskelet uygulamayı benzer donanımda deneme |
| AI'ın ürettiği kodda fark edilmeyen hata (özellikle para ve stok hesabı) | Orta | Yüksek | Kritik kurallar testsiz birleştirilmez, insan incelemesi zorunlu; teslim sonrası 1 hafta paralel kullanım |
| 7 günlük planın tamponsuz olması | Yüksek | Orta | Önceden belirlenmiş kesilecekler listesi (Bölüm 10, Tampon ve risk) |

**Varsayımlar**

- İşletmede tek bilgisayar vardır ve uygulamayı aynı anda tek kişi kullanır.
- Resmi fatura/fiş mevcut yazar kasa veya muhasebeci üzerinden kesilmeye devam eder.
- Günlük iş hacmi 20–150 araç arasındadır.
- Ekip: AI kodlama asistanı kullanan 1 deneyimli full-stack geliştirici + işletme sahibi (günlük 15 dk geri bildirim); işletme sahibi Gün 1'de tüm fiyat, ürün ve reçete bilgisini hazır verir.

**Açık sorular (Gün 1 sabahı yanıtlanmalı)**

- [ ] İşletmede birden fazla bilgisayar (kasa + yönetici ofisi) var mı, yerel ağ üzerinden paylaşım gerekecek mi?
- [ ] Personel primi nasıl hesaplanıyor: iş başına sabit tutar mı, cironun yüzdesi mi?
- [ ] Veresiye/cari hesaplı kurumsal müşteriler (filo, galeri) var mı?
- [ ] Termal fiş yazıcısı var mı, modeli ne?
- [ ] Mevcut Excel/defter kayıtları ne kadar geriye gidiyor, aktarılacak mı?
- [ ] Hizmet listesi ve araç tipine göre güncel fiyatlar.
- [ ] Ciro e-postası hangi adrese/adreslere gidecek, gönderen olarak hangi Gmail hesabı kullanılacak?

**Sonraki adımlar**

1. Bu taslak işletme sahibiyle gözden geçirilir, açık sorular yanıtlanır.
2. Kapsam ve öncelikler onaylanır, PRD v1.0 olarak dondurulur.
3. Gün 1 başlar: kapsam kilidi ve proje iskeleti.
