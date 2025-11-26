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

 Date: 18/11/2025 15:40:39
*/


-- ----------------------------
-- Table structure for vb_openapi_parameters
-- ----------------------------
DROP TABLE IF EXISTS "vb_saas"."vb_openapi_parameters";
CREATE TABLE "vb_saas"."vb_openapi_parameters" (
  "api_id" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "param_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "param_type" varchar(30) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'string'::character varying,
  "is_array" bool NOT NULL DEFAULT false,
  "required" bool NOT NULL DEFAULT false,
  "is_nullable" bool NOT NULL DEFAULT true,
  "param_in" varchar(30) COLLATE "pg_catalog"."default",
  "disabled" bool NOT NULL DEFAULT false,
  "deleted" bool NOT NULL DEFAULT false,
  "part_id" varchar(32) COLLATE "pg_catalog"."default",
  "ordinal" int4 NOT NULL GENERATED ALWAYS AS IDENTITY (
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1
),
  "param_default" varchar(30) COLLATE "pg_catalog"."default",
  "use_type" int4 NOT NULL DEFAULT 0,
  "create_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_update" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" varchar(200) COLLATE "pg_catalog"."default",
  "regular_expression" varchar(1024) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."api_id" IS '接口编号';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."param_name" IS '参数名';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."param_type" IS '数据类型';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."is_array" IS '数组';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."required" IS '必填';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."is_nullable" IS '可空';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."param_in" IS '参数使用方式。path、header、query、body';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."disabled" IS '禁用状态';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."deleted" IS '删除标记';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."part_id" IS '分区编号';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."ordinal" IS '原始序号';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."param_default" IS '默认值';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."use_type" IS '0=sql参数占位,1=字符占位';
COMMENT ON COLUMN "vb_saas"."vb_openapi_parameters"."regular_expression" IS '校验参数值的正则表达式';
COMMENT ON TABLE "vb_saas"."vb_openapi_parameters" IS '开放接口参数';

-- ----------------------------
-- Indexes structure for table vb_openapi_parameters
-- ----------------------------
CREATE UNIQUE INDEX "idx_vb_openapi_parameters_api_id_param_name" ON "vb_saas"."vb_openapi_parameters" USING btree (
  "api_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  lower(param_name::text) COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table vb_openapi_parameters
-- ----------------------------
ALTER TABLE "vb_saas"."vb_openapi_parameters" ADD CONSTRAINT "vb_openapi_parameters_pkey" PRIMARY KEY ("api_id", "param_name");
