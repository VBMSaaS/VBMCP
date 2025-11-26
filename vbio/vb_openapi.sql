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

 Date: 18/11/2025 15:40:01
*/


-- ----------------------------
-- Table structure for vb_openapi
-- ----------------------------
DROP TABLE IF EXISTS "vb_saas"."vb_openapi";
CREATE TABLE "vb_saas"."vb_openapi" (
  "api_id" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT replace((uuid_generate_v4())::text, '-'::text, ''::text),
  "api_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "api_desc" varchar(100) COLLATE "pg_catalog"."default",
  "http_method" varchar(30) COLLATE "pg_catalog"."default" DEFAULT 'post'::character varying,
  "route_path" varchar(30) COLLATE "pg_catalog"."default",
  "query_type" varchar(30) COLLATE "pg_catalog"."default",
  "result_type" varchar(30) COLLATE "pg_catalog"."default",
  "api_sql" text COLLATE "pg_catalog"."default",
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
  "grant_range" varchar(30) COLLATE "pg_catalog"."default" DEFAULT 'auth_token'::character varying,
  "order_by" text COLLATE "pg_catalog"."default",
  "api_type" varchar(30) COLLATE "pg_catalog"."default" DEFAULT 'r'::character varying,
  "create_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_update" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "api_count_sql" text COLLATE "pg_catalog"."default",
  "api_wrapper_type" int4 NOT NULL DEFAULT 1
)
;
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_id" IS '编号';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_name" IS '名称';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_desc" IS '描述';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."http_method" IS '请求方法';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."route_path" IS '路由路径';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."query_type" IS '请求类型';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."result_type" IS '响应类型';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_sql" IS 'SQL语句';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."disabled" IS '禁用状态';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."deleted" IS '删除标记';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."part_id" IS '分区编号';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."ordinal" IS '原始序号';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."grant_range" IS '校验范围';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."order_by" IS 'SQL排序语句';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_type" IS '接口类型，r=读,w=写';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."create_at" IS '创建时间';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."last_update" IS '最后更新时间';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_count_sql" IS '计数sql';
COMMENT ON COLUMN "vb_saas"."vb_openapi"."api_wrapper_type" IS '接口响应封装类';
COMMENT ON TABLE "vb_saas"."vb_openapi" IS '开放接口';

-- ----------------------------
-- Indexes structure for table vb_openapi
-- ----------------------------
CREATE UNIQUE INDEX "idx_vb_openapi_routepath" ON "vb_saas"."vb_openapi" USING btree (
  "route_path" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table vb_openapi
-- ----------------------------
ALTER TABLE "vb_saas"."vb_openapi" ADD CONSTRAINT "vb_openapi_pkey" PRIMARY KEY ("api_id");
