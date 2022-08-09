import fs from 'fs';
import axios from "axios";
import config from './config.json';
import initializeDb from './db';

// Initialize PostgreSQL
// console.log('Initializing PostgreSQL...');
// initializeDb(config.postgres, (db) => {

// });


// Initialize EMQX
console.log('Initializing EMQX...');
const { username, password } = config.emqx;

const initEMQX = async () => {
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

initEMQX();