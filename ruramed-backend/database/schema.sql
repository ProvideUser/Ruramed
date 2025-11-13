-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: ruramed_db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `address_line1` varchar(255) NOT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `postal_code` varchar(20) NOT NULL,
  `country` varchar(100) DEFAULT 'India',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `address_type` enum('home','work','other') DEFAULT 'home',
  `landmark` varchar(255) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `delivery_instructions` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_addresses` (`user_id`),
  KEY `idx_default_address` (`user_id`,`is_default`),
  KEY `idx_location` (`latitude`,`longitude`),
  KEY `idx_addresses_postal_state` (`postal_code`,`state`,`city`),
  KEY `idx_addresses_type_user` (`address_type`,`user_id`,`is_default`),
  KEY `idx_addresses_delivery` (`user_id`,`is_default`,`address_type`,`created_at`),
  KEY `idx_addresses_delivery_optimized` (`postal_code`,`latitude`,`longitude`,`is_default` DESC),
  KEY `idx_addresses_lat_lng_separate` (`latitude`,`longitude`,`user_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_admins_email_created` (`email`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consultations`
--

DROP TABLE IF EXISTS `consultations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `consultation_date` datetime NOT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `idx_consultations_user_date` (`user_id`,`consultation_date` DESC,`status`),
  KEY `idx_consultations_doctor_date` (`doctor_id`,`consultation_date`,`status`),
  KEY `idx_consultations_status_date` (`status`,`consultation_date`),
  CONSTRAINT `consultations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `consultations_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `device_tracking`
--

DROP TABLE IF EXISTS `device_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_fingerprint` varchar(255) NOT NULL,
  `user_id` int DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `browser` varchar(100) DEFAULT NULL,
  `os` varchar(100) DEFAULT NULL,
  `screen_resolution` varchar(20) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL,
  `first_seen` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `visit_count` int DEFAULT '1',
  `is_trusted` tinyint(1) DEFAULT '0',
  `is_blocked` tinyint(1) DEFAULT '0',
  `risk_score` int DEFAULT '0' COMMENT 'Risk score 0-100',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_fingerprint` (`device_fingerprint`),
  KEY `idx_device_user` (`user_id`),
  KEY `idx_device_risk` (`risk_score`,`is_blocked`),
  KEY `idx_device_last_seen` (`last_seen`),
  CONSTRAINT `device_tracking_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctors`
--

DROP TABLE IF EXISTS `doctors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `specialty` varchar(100) NOT NULL,
  `location` varchar(255) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `experience` int DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT NULL,
  `consultation_fee` decimal(8,2) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_doctors_available` (`available`),
  KEY `idx_doctors_specialty` (`specialty`),
  KEY `idx_doctors_location` (`location`),
  KEY `idx_doctors_name` (`name`),
  KEY `idx_doctors_latitude` (`latitude`),
  KEY `idx_doctors_longitude` (`longitude`),
  KEY `idx_doctors_location_coords` (`latitude`,`longitude`),
  KEY `idx_doctors_rating` (`rating`),
  KEY `idx_doctors_experience` (`experience`),
  KEY `idx_doctors_available_coords` (`available`,`latitude`,`longitude`),
  KEY `idx_doctors_specialty_available` (`specialty`,`available`,`rating` DESC,`experience` DESC),
  KEY `idx_doctors_location_text` (`location`,`available`,`specialty`),
  KEY `idx_doctors_ranking` (`available`,`rating` DESC,`experience` DESC,`consultation_fee`),
  KEY `idx_doctors_available_coords_rating` (`available`,`latitude`,`longitude`,`rating` DESC),
  KEY `idx_doctors_lat_lng_separate` (`latitude`,`longitude`,`available`),
  KEY `idx_doctors_search_optimized` (`available`,`specialty`,`latitude`,`longitude`,`rating` DESC),
  KEY `idx_doctors_performance` (`specialty`,`rating`,`experience`,`available`,`created_at`),
  FULLTEXT KEY `name` (`name`,`specialty`,`location`)
) ENGINE=InnoDB AUTO_INCREMENT=3598 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicines`
--

DROP TABLE IF EXISTS `medicines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `generic_name` varchar(255) DEFAULT NULL,
  `manufacturer` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `form` enum('tablet','capsule','syrup','injection','cream','drops','inhaler') NOT NULL,
  `strength` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `mrp` decimal(10,2) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `requires_prescription` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_name` (`name`),
  KEY `idx_category` (`category`),
  KEY `idx_generic_name` (`generic_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_requires_prescription` (`requires_prescription`),
  KEY `idx_medicines_category_active` (`category`,`is_active`,`name`),
  KEY `idx_medicines_prescription_category` (`requires_prescription`,`category`,`is_active`),
  KEY `idx_medicines_price_active` (`is_active`,`price`,`mrp`),
  KEY `idx_medicines_manufacturer_active` (`manufacturer`,`is_active`,`category`),
  KEY `idx_medicines_form_active` (`form`,`is_active`,`category`),
  KEY `idx_medicines_admin_view` (`is_active`,`created_at` DESC,`category`),
  KEY `idx_medicines_sku_active` (`sku`,`is_active`),
  KEY `idx_medicines_search_optimized` (`is_active`,`category`,`requires_prescription`,`price`),
  KEY `idx_medicines_popularity` (`category`,`is_active`,`created_at`,`name`),
  FULLTEXT KEY `name` (`name`,`generic_name`,`short_description`,`manufacturer`)
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `user_id` int NOT NULL,
  `prescription_id` int DEFAULT NULL,
  `medicines` text NOT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `delivery_address` text NOT NULL,
  `status` enum('pending','confirmed','processing','approved','out_for_delivery','shipped','delivered','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `address_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  UNIQUE KEY `order_number_2` (`order_number`),
  KEY `user_id` (`user_id`),
  KEY `prescription_id` (`prescription_id`),
  KEY `address_id` (`address_id`),
  KEY `idx_orders_user_status_date` (`user_id`,`status`,`created_at` DESC),
  KEY `idx_orders_status_created` (`status`,`created_at`),
  KEY `idx_orders_prescription_user` (`prescription_id`,`user_id`,`status`),
  KEY `idx_orders_address_status` (`address_id`,`status`,`created_at`),
  KEY `idx_orders_amount_date` (`created_at`,`total_amount`,`status`),
  KEY `idx_orders_admin_view` (`status`,`created_at` DESC,`total_amount` DESC),
  KEY `idx_orders_user_history` (`user_id`,`created_at` DESC,`status`,`address_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`),
  CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `otp_verifications`
--

DROP TABLE IF EXISTS `otp_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `otp_code` varchar(10) NOT NULL,
  `otp_type` enum('signup','forgot_password','phone_verification','email_verification') NOT NULL,
  `attempts` int DEFAULT '0',
  `is_verified` tinyint(1) DEFAULT '0',
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_otp_email_type` (`email`,`otp_type`,`expires_at`),
  KEY `idx_otp_phone_type` (`phone`,`otp_type`,`expires_at`),
  KEY `idx_otp_user_type` (`user_id`,`otp_type`,`expires_at`),
  KEY `idx_otp_expires` (`expires_at`),
  CONSTRAINT `otp_verifications_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prescriptions`
--

DROP TABLE IF EXISTS `prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `filename` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `doctor_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_prescriptions_user_status` (`user_id`,`status`,`created_at` DESC),
  KEY `idx_prescriptions_status_created` (`status`,`created_at`),
  KEY `idx_prescriptions_filename_user` (`filename`,`user_id`),
  CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rate_limits`
--

DROP TABLE IF EXISTS `rate_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) NOT NULL COMMENT 'IP, user_id, or composite key',
  `identifier_type` enum('ip','user','email','phone','device') NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `request_count` int DEFAULT '1',
  `window_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `window_end` timestamp NOT NULL,
  `is_blocked` tinyint(1) DEFAULT '0',
  `block_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rate_limit_unique` (`identifier`,`endpoint`,`window_start`),
  KEY `idx_rate_limit_lookup` (`identifier`,`identifier_type`,`endpoint`),
  KEY `idx_rate_limit_cleanup` (`window_end`),
  KEY `idx_rate_limit_blocked` (`is_blocked`,`window_end`)
) ENGINE=InnoDB AUTO_INCREMENT=23769 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` longtext NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_refresh` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_events`
--

DROP TABLE IF EXISTS `security_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) NOT NULL,
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `event_data` json DEFAULT NULL,
  `network_info` json DEFAULT NULL,
  `geo_location` json DEFAULT NULL,
  `is_blocked` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_security_event_type` (`event_type`,`created_at`),
  KEY `idx_security_ip_time` (`ip_address`,`created_at`),
  KEY `idx_security_user_time` (`user_id`,`created_at`),
  KEY `idx_security_severity` (`severity`,`created_at`),
  KEY `idx_security_blocked` (`is_blocked`,`created_at`),
  CONSTRAINT `security_events_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `service_areas`
--

DROP TABLE IF EXISTS `service_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_areas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `area_name` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `postal_codes` text,
  `boundary_coordinates` text,
  `delivery_fee` decimal(8,2) DEFAULT '0.00',
  `min_order_amount` decimal(8,2) DEFAULT '0.00',
  `delivery_time_hours` int DEFAULT '24',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_areas_postal` (`postal_codes`(100)),
  KEY `idx_service_areas_active_city` (`is_active`,`city`,`state`),
  KEY `idx_service_areas_delivery_fee` (`is_active`,`delivery_fee`,`min_order_amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `gender` enum('Male','Female','Other','Prefer not to say') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown','Prefer not to say') DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT '0',
  `mobile_verified` tinyint(1) DEFAULT '0',
  `alternate_contact` varchar(15) DEFAULT NULL,
  `customer_unique_id` varchar(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_unique_id` (`customer_unique_id`),
  UNIQUE KEY `uk_user_profiles_customer_id` (`customer_unique_id`),
  KEY `idx_user_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) NOT NULL,
  `user_id` int NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `device_info` json DEFAULT NULL,
  `location_info` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_at` timestamp NULL DEFAULT NULL,
  `logout_reason` enum('manual','expired','security','admin') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `idx_session_user_active` (`user_id`,`is_active`),
  KEY `idx_session_ip_user` (`ip_address`,`user_id`),
  KEY `idx_session_expires` (`expires_at`),
  KEY `idx_session_device` (`device_fingerprint`),
  CONSTRAINT `user_sessions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `password` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_users_email_active` (`email`,`created_at`),
  KEY `idx_users_phone_lookup` (`phone`,`created_at`),
  KEY `idx_users_location` (`location`(50)),
  KEY `idx_users_created_location` (`created_at`,`location`(20))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-09 23:11:25
