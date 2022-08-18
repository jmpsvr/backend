import fs from 'fs';
import axios from "axios";
import config from './config.json';
import initializeDb from './db';

// Initialize PostgreSQL
const initDb = async () => {
  initializeDb(config.postgres, async (db) => {
    const sql = [
      `ALTER ROLE all SET timezone='Asia/Shanghai'`,
      `CREATE TABLE public.devices (
        "id" int4 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "mac" macaddr NULL,
        "name" varchar(64) NOT NULL,
        "remark" text NULL,
        "type" int4 NOT NULL,
        "area" int4 NULL,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp,
        "conn" varchar(128) NULL,
        "var" json NULL,
        "action" json NULL
      );`,
      `CREATE TABLE public.areas (
        "id" int4 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "name" varchar(64) NOT NULL,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp,
        "remark" text NULL
      );`,
      `CREATE TABLE public.users (
        "id" int4 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "name" varchar(64) NULL,
        "email" varchar(64) NOT NULL,
        "password" varchar(64) NOT NULL,
        "nickname" varchar(64) NOT NULL,
        "status" bool NOT NULL,
        "role" varchar(64) NOT NULL,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp,
        "remark" text NULL
      );`,
      `CREATE TABLE public.roles (
        "name" varchar(64) NOT NULL PRIMARY KEY,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp,
        "permission" json NULL,
        "remark" text NULL
      );`,
      `CREATE TABLE public.actions (
        "id" int4 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "name" varchar(64) NULL,
        "condition" varchar(128) NULL,
        "trigger" varchar(128) NULL,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp,
        "remark" text NULL
      );`,
      `CREATE TABLE public.logs (
        "id" int4 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "ip" cidr NULL,
        "uid" int4 NULL,
        "uname" varchar(64) NULL,
        "event" text NULL,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp,
        "remark" text NULL
      );`,
      `CREATE TABLE public.notices (
        "uuid" uuid NOT NULL PRIMARY KEY,
        "event" text NULL,
        "did" int4 NULL,
        "icon" varchar(64) NULL,
        "finish" bool NOT NULL DEFAULT false,
        "createTime" timestamp NOT NULL DEFAULT current_timestamp
      );`,
      `INSERT INTO public.roles ("name", "permission", "remark") VALUES('admin', NULL, 'Administrator');`,
      `INSERT INTO public.users ("name", "email", "password", "nickname", "status", "role", "remark") VALUES('admin', 'admin@jmpsvr.com', 'admin', 'Administrator', true, 'admin', '系统管理员');`
    ];
    for(const i of sql) {
      await db.query(i);
    }
  });
}

// Initialize EMQX
const initEMQX = async () => {
  const { username, password } = config.emqx;
  await axios.post(`http://${config.emqx.host}:${config.emqx.api_port}/api/v5/authentication`, {
    user_id_type: "username",
    password_hash_algorithm: {
      name:"sha256",
      salt_position: "suffix"
    },
    backend: "built_in_database",
    mechanism: "password_based"
  }, {
    auth: {
      username, password
    }
  }).then(res => {
    if(res?.status === 200) {
      console.log(`EMQX initialize: ${res?.statusText}`);
    } else {
      console.log(`EMQX error: ${res?.statusText}`);
    }
  }).catch(err => {
    console.log(err);
  });

  await axios.post(`http://${config.emqx.host}:${config.emqx.api_port}/api/v5/authentication/password_based:built_in_database/users`, {
    user_id: config.emqx.super_username,
    password: config.emqx.super_password,
    is_superuser: true
  }, {
    auth: {
      username: config.emqx.username,
      password: config.emqx.password
    }
  }).then(res => {
    if(res?.status === 201) {
      console.log(`Super user ok: ${res?.statusText}`);
    } else {
      // 奇奇怪怪的bug处理，目前还没遇到
    }
  }).catch(err => {
    if(err.response?.status === 409) {
      // 数据库不一致，用户已经在EMQX中存在
    }
    // console.log(err);
  });
}

if(!fs.existsSync('./init-lock')) {
  console.log('Initializing PostgreSQL...');
  initDb();
  console.log('Initializing EMQX...');
  initEMQX();
  fs.writeFileSync('./init-lock', (new Date()).toLocaleString());
}
