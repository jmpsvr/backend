import { Router } from 'express';
import auth from '../middleware/auth';
import admin from '../middleware/admin';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default ({ config, db }) => {
  const api = Router();

  const addUser = (username, password, callback) => {
    axios.post(`http://${config.emqx.host}:${config.emqx.api_port}/api/v5/authentication/password_based:built_in_database/users`, {
      user_id: username,
      password,
      is_superuser: false
    }, {
      auth: {
        username: config.emqx.username,
        password: config.emqx.password
      }
    }).then(res => {
      if(res.status === 201) {
        callback(res);
      } else {
        throw new Error(res?.statusText);
      }
    }).catch(err => {
      console.error(err);
    });
  }

  const delUser = (username, callback) => {
    axios.delete(`http://${config.emqx.host}:${config.emqx.api_port}/api/v5/authentication/password_based:built_in_database/users/${username}`, {
      auth: {
        username: config.emqx.username,
        password: config.emqx.password
      }
    }).then(res => {
      if(res.status === 204) {
        callback(res);
      } else {
        throw new Error(res?.statusText);
      }
    }).catch(err => {
      console.error(err);
    });
  }

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
          addUser(mac, password, () => {
            res.json({
              code: 0,
              result: { id: row[0]?.id, username: mac, password },
              message: 'Ok',
              type: 'success'
            });
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
      if(type === 0) { // update emqx
        db.query('SELECT conn FROM devices WHERE id = ${id}', { id }).then(row => {
          const { username: username_old, password: password_old } = JSON.parse(row[0]?.conn);
          const { username, password } = JSON.parse(conn);
          if(username_old !== username || password_old !== password) {
            delUser(username_old, () => {
              addUser(username, password, () => {
                db.query('UPDATE devices SET name = ${name}, type = ${type}, conn = ${conn}, area = ${area}, mac = ${mac}, remark = ${remark} WHERE id = ${id}', {
                  id, name, type, conn, area, remark, mac: username
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
              });
            });
          } else {
            db.query('UPDATE devices SET name = ${name}, type = ${type}, area = ${area}, remark = ${remark} WHERE id = ${id}', {
              id, name, type, area, remark
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
        }).catch(err => {
          res.status(500).json({
            code: -5,
            message: err,
            type: 'error'
          });
        });
      } else {
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
      }
    } else { // insert
      if(type === 0) { // insert emqx
        const { username, password } = JSON.parse(conn);
        addUser(username, password, () => {
          db.query('INSERT INTO devices (name, type, conn, area, mac, remark) VALUES (${name}, ${type}, ${conn}, ${area}, ${mac}, ${remark})', {
            name, type, conn, area, remark, mac: username
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
        });
      } else {
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
    }
  });

  api.get('/getDeviceList', auth({ config, db }), (req, res) => {
    const { id, name, area, page, pageSize } = req.query;
    const permission = req.jwt?.user?.roles[0]?.permission;
    db.query('SELECT "id", "mac", "name", "remark", "type", "area",' + ((req.jwt.user.roles[0].name === 'admin') ? '"conn", ' : '') + ' "createTime" FROM devices WHERE (id = ${id} OR ${id} IS NULL) AND (name ILIKE ${name}) AND (area = ${area} OR ${area} IS NULL)' + ((req.jwt.user.roles[0].name === 'admin') ? '' : ' AND id = ANY(ARRAY[${permission}])') + ' ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}', {
      id: id || null,
      permission: permission.length > 0 ? permission : [ 0 ],
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
    if(id && (req.jwt.user.roles[0].name === 'admin' || req.jwt?.user?.roles[0]?.permission?.includes(~~id))) {
      db.query('SELECT type, var, action FROM devices WHERE id = ${id}', { id }).then(row => {
        res.json({
          code: 0,
          result: row[0],
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
