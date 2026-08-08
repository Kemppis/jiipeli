-- Create database and tables for jiipeli forum
CREATE DATABASE IF NOT EXISTS `jiipeli` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `jiipeli`;

CREATE TABLE IF NOT EXISTS `posts` (
  `post_id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `title` TEXT,
  `body` TEXT,
  `device` VARCHAR(255),
  `created_at` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `comments` (
  `comment_id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `post_id` VARCHAR(50) NOT NULL,
  `body` TEXT,
  `device` VARCHAR(255),
  `image_path` VARCHAR(255),
  `created_at` DATETIME,
  INDEX (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
