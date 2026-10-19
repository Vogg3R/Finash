CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`eylem` text NOT NULL,
	`tablo` text NOT NULL,
	`kayit_id` integer,
	`eski_deger` text,
	`yeni_deger` text,
	`zaman` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tarih` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`acilis_kurus` integer DEFAULT 0 NOT NULL,
	`beklenen_kurus` integer DEFAULT 0 NOT NULL,
	`sayilan_kurus` integer,
	`fark_kurus` integer,
	`durum` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`tur` text NOT NULL,
	`varsayilan` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_ad_unique` ON `categories` (`ad`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`telefon` text,
	`notlar` text,
	`veresiye_bakiye_kurus` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tur` text NOT NULL,
	`donem` text NOT NULL,
	`durum` text DEFAULT 'pending' NOT NULL,
	`deneme_sayisi` integer DEFAULT 0 NOT NULL,
	`kilit_zamani` text,
	`son_hata` text,
	`tetikleyen` text DEFAULT 'button' NOT NULL,
	`user_id` integer,
	`olusturma` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`gonderim_zamani` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_email_outbox_durum` ON `email_outbox` (`durum`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_order_id` integer NOT NULL,
	`tutar_kurus` integer NOT NULL,
	`yontem` text NOT NULL,
	`zaman` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`kategori` text,
	`birim` text NOT NULL,
	`mevcut_miktar` real DEFAULT 0 NOT NULL,
	`kritik_seviye` real DEFAULT 0 NOT NULL,
	`ort_maliyet_kurus` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hizmet_id` integer NOT NULL,
	`arac_tipi_id` integer NOT NULL,
	`fiyat_kurus` integer NOT NULL,
	`gecerlilik_baslangici` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hizmet_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`arac_tipi_id`) REFERENCES `vehicle_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_service_vehicle_type` ON `service_prices` (`hizmet_id`,`arac_tipi_id`);--> statement-breakpoint
CREATE TABLE `service_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hizmet_id` integer NOT NULL,
	`urun_id` integer NOT NULL,
	`miktar` real NOT NULL,
	FOREIGN KEY (`hizmet_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`urun_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recipe_service_product` ON `service_recipes` (`hizmet_id`,`urun_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`aciklama` text,
	`sure_dk` integer DEFAULT 30 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`anahtar` text NOT NULL,
	`deger` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_anahtar_unique` ON `settings` (`anahtar`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`telefon` text,
	`prim_orani` integer DEFAULT 0 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`urun_id` integer NOT NULL,
	`tur` text NOT NULL,
	`kaynak_tur` text NOT NULL,
	`miktar` real NOT NULL,
	`birim_maliyet_kurus` integer DEFAULT 0 NOT NULL,
	`kaynak_id` integer,
	`supplier_id` integer,
	`zaman` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`urun_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stock_mov_unique` ON `stock_movements` (`kaynak_tur`,`kaynak_id`,`urun_id`,`tur`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`telefon` text,
	`notlar` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tur` text NOT NULL,
	`kategori_id` integer,
	`tutar_kurus` integer NOT NULL,
	`yontem` text NOT NULL,
	`tarih` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`aciklama` text,
	`kaynak_tur` text NOT NULL,
	`kaynak_id` integer,
	`cash_session_id` integer,
	FOREIGN KEY (`kategori_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_tarih` ON `transactions` (`tarih`);--> statement-breakpoint
CREATE INDEX `idx_transactions_tur` ON `transactions` (`tur`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kullanici_adi` text NOT NULL,
	`sifre_hash` text NOT NULL,
	`rol` text NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`ilkgiris_sifre_degistir` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_kullanici_adi_unique` ON `users` (`kullanici_adi`);--> statement-breakpoint
CREATE TABLE `vehicle_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`sira` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_types_ad_unique` ON `vehicle_types` (`ad`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plaka` text NOT NULL,
	`plaka_normalized` text NOT NULL,
	`marka` text,
	`model` text,
	`renk` text,
	`vehicle_type_id` integer NOT NULL,
	`customer_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_plaka_normalized_unique` ON `vehicles` (`plaka_normalized`);--> statement-breakpoint
CREATE INDEX `idx_vehicles_plaka_norm` ON `vehicles` (`plaka_normalized`);--> statement-breakpoint
CREATE TABLE `work_order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_order_id` integer NOT NULL,
	`hizmet_id` integer NOT NULL,
	`birim_fiyat_kurus` integer NOT NULL,
	`miktar` integer DEFAULT 1 NOT NULL,
	`staff_id` integer,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hizmet_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no` text NOT NULL,
	`arac_id` integer NOT NULL,
	`durum` text DEFAULT 'pending' NOT NULL,
	`iptal_gerekcesi` text,
	`stok_dusuldu_at` text,
	`giris_zamani` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`teslim_zamani` text,
	`toplam_kurus` integer DEFAULT 0 NOT NULL,
	`indirim_kurus` integer DEFAULT 0 NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`arac_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_no_unique` ON `work_orders` (`no`);--> statement-breakpoint
CREATE INDEX `idx_work_orders_durum` ON `work_orders` (`durum`);--> statement-breakpoint
CREATE INDEX `idx_work_orders_giris` ON `work_orders` (`giris_zamani`);