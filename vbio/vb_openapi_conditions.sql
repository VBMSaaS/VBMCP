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

 Date: 18/11/2025 18:00:27
*/


-- ----------------------------
-- Table structure for vb_openapi_conditions
-- ----------------------------
DROP TABLE IF EXISTS "vb_saas"."vb_openapi_conditions";
CREATE TABLE "vb_saas"."vb_openapi_conditions" (
  "api_id" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "cond_statement" varchar COLLATE "pg_catalog"."default",
  "cond_connector" varchar(3) COLLATE "pg_catalog"."default" DEFAULT 'and'::character varying,
  "open_parenthesis" varchar(10) COLLATE "pg_catalog"."default",
  "close_parenthesis" varchar(10) COLLATE "pg_catalog"."default",
  "param_name" varchar(255) COLLATE "pg_catalog"."default",
  "part_id" varchar(32) COLLATE "pg_catalog"."default",
  "ordinal" int4 NOT NULL GENERATED ALWAYS AS IDENTITY (
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1
),
  "create_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_update" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "order_no" int4 DEFAULT 99999
)
;
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."api_id" IS '接口编号';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."cond_statement" IS '条件表达式';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."cond_connector" IS '条件连接符；and 或者 or';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."open_parenthesis" IS '左原括弧';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."close_parenthesis" IS '右原括弧';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."param_name" IS '对应参数，多个用逗号分隔';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."part_id" IS '分区编号';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."ordinal" IS '原始序号';
COMMENT ON COLUMN "vb_saas"."vb_openapi_conditions"."order_no" IS '条件序号，从小到大';
COMMENT ON TABLE "vb_saas"."vb_openapi_conditions" IS '开放接口条件';

-- ----------------------------
-- Primary Key structure for table vb_openapi_conditions
-- ----------------------------
ALTER TABLE "vb_saas"."vb_openapi_conditions" ADD CONSTRAINT "vb_openapi_conditions_pkey" PRIMARY KEY ("api_id", "ordinal");
