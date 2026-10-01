CREATE DATABASE IF NOT EXISTS dprokleanmate
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dprokleanmate;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  full_name VARCHAR(255),
  phone VARCHAR(30),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT password_reset_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  starting_price VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  service_price VARCHAR(255) NOT NULL,
  service_date DATE,
  site_visit_date DATE,
  service_date_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  admin_price DECIMAL(12, 2),
  payment_slip_url VARCHAR(1024),
  time_slot VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  customer_email VARCHAR(320),
  service_address TEXT NOT NULL,
  payment_method ENUM('qr', 'cash') NOT NULL DEFAULT 'qr',
  status ENUM('pending', 'quote', 'awaiting_payment', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  active_service_date DATE GENERATED ALWAYS AS (
    CASE WHEN status IN ('pending', 'confirmed') THEN service_date ELSE NULL END
  ) STORED,
  active_site_visit_date DATE GENERATED ALWAYS AS (
    CASE WHEN status IN ('pending', 'quote', 'awaiting_payment', 'confirmed') THEN site_visit_date ELSE NULL END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT bookings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT bookings_different_dates CHECK (
    site_visit_date IS NULL OR service_date IS NULL OR site_visit_date <> service_date
  ),
  UNIQUE KEY one_active_booking_per_slot (active_service_date, time_slot),
  UNIQUE KEY one_active_site_visit_per_date (active_site_visit_date),
  INDEX bookings_user_created (user_id, created_at)
);

INSERT INTO services (name, starting_price, price, sort_order)
VALUES
  ('ทำความสะอาดบ้าน', 'เริ่มต้น 45 บาท/ตร.ม.', 'เริ่มต้น 45 บาท/ตร.ม.', 0),
  ('ทำความสะอาดบ้านคอนโด', 'เริ่มต้น 45 บาท/ตร.ม.', 'เริ่มต้น 45 บาท/ตร.ม.', 1),
  ('ทำความสะอาดสำนักงาน', 'เริ่มต้น 45 บาท/ตร.ม.', 'เริ่มต้น 45 บาท/ตร.ม.', 2),
  ('Big Cleaning', 'เริ่มต้น 45 บาท/ตร.ม.', 'เริ่มต้น 45 บาท/ตร.ม.', 3),
  ('ขอโปไซน์', 'เริ่มต้น 1,500 บาท', 'เริ่มต้น 1,500 บาท', 4),
  ('หลังน้ำท่วม', 'เริ่มต้น 45 บาท/ตร.ม.', 'เริ่มต้น 45 บาท/ตร.ม.', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name);