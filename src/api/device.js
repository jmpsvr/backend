import { Router } from 'express';
import auth from '../middleware/auth';
import admin from '../middleware/admin';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default ({ config, db }) => {
  const api = Router();

  api.post('/handshake', (req, res) => { // Only type === 1 uses this api
    const { mac } = req.body;
    // validate mac address
    db.query('SELECT * FROM devices WHERE mac = ${mac}', { mac }).then(row => {
      if(row.length === 0) {
        const password = uuidv4();
        db.query('INSERT INTO devices (name, type, mac, conn) VALUES (${name}, ${type}, ${mac}, ${conn}) RETURNING id', { 
          name: '新设备',
          type: 0,
          mac,
          conn: JSON.stringify({ username: mac, password: uuidv4() })
        }).then(row => {
          // post to emqx

          axios.post(`http://${config.emqx.host}:${config.emqx.api_port}/api/v5/authentication/password_based:built_in_database/users`, {
            user_id: mac,
            password,
            is_superuser: false
          }, {
            auth: {
              username: config.emqx.username,
              password: config.emqx.password
            }
          }).then(result => {
            if(result?.status === 201) {
              res.json({
                code: 0,
                result: { id: row[0]?.id, username: mac, password },
                message: 'Ok',
                type: 'success'
              });
            } else {
              // 奇奇怪怪的bug处理，目前还没遇到
            }
          }).catch(err => {
            if(err.response?.status === 409) {
              // 数据库不一致，用户已经在EMQX中存在
            }
            // console.log(err);
          });

        });
      } else {
        res.json({
          code: -1,
          message: 'Device existed',
          type: 'error'
        });
      }
    }).catch(err => {
      res.json({
        code: -5,
        message: err,
        type: 'error'
      });
    });
  });

  api.post('/setDeviceInfo', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { id, name, type, area, conn, remark } = req.body;
    if(id) { // update
      // 如果type=0更新emqx
      db.query('UPDATE devices SET name = ${name}, type = ${type}, conn = ${conn}, area = ${area}, remark = ${remark} WHERE id = ${id}', {
        id, name, type, conn, area, remark
      }).then(row => {
          res.json({
            code: 0,
            message: 'Ok',
            type: 'success'
          });
      }).catch(err => {
        res.status(500).json({
          code: -5,
          message: err,
          type: 'error'
        });
      });
    } else { // insert
      // 如果type=0插入emqx
      db.query('INSERT INTO devices (name, type, conn, area, remark) VALUES (${name}, ${type}, ${conn}, ${area}, ${remark})', {
        name, type, conn, area, remark
      }).then(row => {
        res.json({
          code: 0,
          message: 'Ok',
          type: 'success'
        });
      }).catch(err => {
        res.status(500).json({
          code: -5,
          message: err,
          type: 'error'
        });
      });
    }
  });

  api.get('/getDeviceList', auth({ config, db }), (req, res) => {
    const { id, name, area, page, pageSize } = req.query;
    db.query('SELECT "id", "mac", "name", "remark", "type", "area",' + ((req.jwt.user.roles[0].name === 'admin') ? '"conn", ' : '') + ' "createTime" FROM devices WHERE (id = ${id} OR ${id} IS NULL) AND (name ILIKE ${name}) AND (area = ${area} OR ${area} IS NULL) ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}', {
      id: id || null,
      area: area || null,
      name: name ? `%${name}%` : '%',
      limit:  pageSize,
      offset: pageSize * (page - 1)
    }).then(row => {
      res.json({
        code: 0,
        result: {
          items: row,
          total: row.length
        },
        message: 'Ok',
        type: 'success'
      });
    }).catch(err => {
      console.error(err);
      res.status(500).json({
        code: -5,
        result: {
          items: [],
          total: 0
        },
        message: 'Cannot load data',
        type: 'error'
      });
    });
  });

  api.get('/getDeviceDetail', auth({ config, db }), (req, res) => {
    const { id } = req.query;
    if(id) {
      db.query('SELECT * FROM devices WHERE id = ${id}', { id }).then(row => {
        res.json({
          code: 0,
          result: { var: row[0].var, action: row[0].action },
          message: 'Ok',
          type: 'success'
        });
      }).catch(err => {
        res.status(500).json({
          code: -5,
          message: 'Cannot load data',
          type: 'error'
        });
      });
    } else {
      res.status(400).json({
        code: -4,
        message: 'Bad request',
        type: 'error'
      });
    }
    
  });

  api.get('/getAreaList', auth({ config, db }), (req, res) => {
    db.query('SELECT * FROM areas').then(row => {
      res.json({
        code: 0,
        result: row,
        message: 'Ok',
        type: 'success'
      });
    }).catch(err => {
      res.status(500).json({
        code: -5,
        message: 'Cannot load data',
        type: 'error'
      });
    });
  });

  api.get('/getTypeList', auth({ config, db }), (req, res) => {
    const typeList = [
      {
        id: 0,
        name: 'Common'
      },
      {
        id: 1,
        name: 'Onvif'
      }
    ];
    res.json({
      code: 0,
      result: typeList,
      message: 'Ok',
      type: 'success'
    });
  });

  return api;
}
