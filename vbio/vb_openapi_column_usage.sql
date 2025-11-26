/*
 Navicat Premium Data Transfer

 Source Server         : 正式152.136.224.65
 Source Server Type    : PostgreSQL
 Source Server Version : 140013 (140013)
 Source Host           : 152.136.224.65:2510
 Source Catalog        : app_gsjf_v2
 Source Schema         : vb_saas

 Target Server Type    : PostgreSQL
 Target Server Version : 140013 (140013)
 File Encoding         : 65001

 Date: 18/11/2025 15:40:53
*/


-- ----------------------------
-- Table structure for vb_openapi_column_usage
-- ----------------------------
DROP TABLE IF EXISTS "vb_saas"."vb_openapi_column_usage";
CREATE TABLE "vb_saas"."vb_openapi_column_usage" (
  "api_id" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "table_schema" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "table_name" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "res_id" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::character varying,
  "column_name" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "part_id" varchar(32) COLLATE "pg_catalog"."default",
  "app_id" varchar(32) COLLATE "pg_catalog"."default",
  "ordinal" int4 NOT NULL DEFAULT nextval('"vb_saas".vb_openapi_column_usage_ordinal_seq'::regclass),
  "create_at" timestamptz(6) NOT NULL DEFAULT now(),
  "last_update" timestamptz(6) NOT NULL DEFAULT now(),
  "column_name_fake" varchar(200) COLLATE "pg_catalog"."default"
)
;
