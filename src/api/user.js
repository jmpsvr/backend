import { Router } from 'express';
import auth from '../middleware/auth';
import admin from '../middleware/admin';

export default ({ config, db }) => {
  const api = Router();

  api.get('/getUserList', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { name, nickname, page, pageSize } = req.query;
    db.query('SELECT * FROM users WHERE name ILIKE ${name} AND nickname ILIKE ${nickname} ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}', {
      name: name ? `%${name}%` : '%',
      nickname: nickname ? `%${nickname}%` : '%',
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
    });
  });

  api.get('/getAllRoleList', auth({ config, db }), admin({ config, db }), (req, res) => {
    db.query('SELECT * FROM roles ORDER BY name ASC').then(row => {
      res.json({
        code: 0,
        result: row,
        message: 'Ok',
        type: 'success'
      });
    });
  });

  api.get('/getRoleListByPage', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { name, page, pageSize } = req.query;
    db.query('SELECT * FROM roles WHERE name ILIKE ${name} ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}', {
      name: name ? `%${name}%` : '%',
      limit: pageSize,
      offset: pageSize * (page - 1)
    }).then(row => {
      res.json({
        code: 0,
        result: row,
        message: 'Ok',
        type: 'success'
      });
    });
  });

  api.post('/userExist', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { user } = req.body;
    db.query('SELECT * FROM users WHERE name = ${name}', {
      name: user
    }).then(row => {
      if(row.length === 0) {
        res.json({
          code: 0,
          result: 'Username is ok',
          message: 'Ok',
          type: 'success'
        });
      } else {
        res.json({
          code: -1,
          message: 'Username has been used',
          type: 'error'
        });
      }
    });
  });

  api.post('/setUserInfo', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { id, name, role, nickname, password, status, email, remark } = req.body;
    if(id) { // update
      if(id == 1 && status == false) {
        res.status(403).json({
          code: -1,
          message: 'Admin user can not be disabled',
          type: 'error'
        });
      } else {
        db.query('UPDATE users SET name = ${name}, role = ${role}, nickname = ${nickname}, password = ${password}, status = ${status}, email = ${email}, remark = ${remark} WHERE id = ${id}', {
          id, name, role, nickname, password, status, email, remark
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
      db.query('INSERT INTO users (name, role, nickname, password, status, email, remark) VALUES (${name}, ${role}, ${nickname}, ${password}, ${status}, ${email}, ${remark})', {
        name, role, nickname, password, status, email, remark
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

  api.post('/setUserStatus', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { id, status } = req.body;
    if(id == 1) {
      res.status(403).json({
        code: -1,
        message: 'Admin user can not be disabled',
        type: 'error'
      });
    } else {
      db.query('UPDATE users SET status = ${status} WHERE id = ${id}', {
        id, status
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

  api.get('/getMenuList', auth({ config, db }), admin({ config, db }), (req, res) => {
    db.query('SELECT * FROM devices ORDER BY id ASC').then(row => {
      const menuList = [];
      for(let i of row) {
        menuList.push({
          id: i.id,
          icon: 'ion:document',
          type: 1,
          menuName: `${i.id}: ${i.name}`,
          createTime: i.createTime,
          status: 1
        });
      }
      res.json({
        code: 0,
        result: menuList,
        message: 'Ok',
        type: 'success'
      });
    }).catch(err => {
      console.error(err);
    });
  });

  api.post('/setRoleInfo', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { name, remark, permission } = req.body;
    db.query('SELECT * FROM roles WHERE name = ${name}', { name }).then(row => {
      if(row.length === 0) {
        db.query('INSERT INTO roles (name, remark, permission) VALUES (${name}, ${remark}, ${permission})', { name, remark, permission: JSON.stringify(permission) }).then(row => {
          res.json({
            code: 0,
            message: 'Ok',
            type: 'success'
          });
        }).catch(err => {
          console.error(err);
        });
      } else {
        db.query('UPDATE roles SET remark = ${remark}, permission = ${permission} WHERE name = ${name}', { name, remark, permission: JSON.stringify(permission) }).then(row => {
          res.json({
            code: 0,
            message: 'Ok',
            type: 'success'
          });
        }).catch(err => {
          console.error(err);
        });
      }
    }).catch(err => {
      console.error(err);
    });
  });


  api.post('/deleteUser', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { id } = req.body;
    if(id == 1) {
      res.status(403).json({
        code: -1,
        message: 'Admin user can not be deleted',
        type: 'error'
      });
    } else {
      db.query('DELETE FROM users WHERE id = ${id}', { id }).then(row => {
        res.json({
          code: 0,
          message: 'Ok',
          type: 'success'
        });
      }).catch(err => {
        console.error(err);
      });
    }
  });

  api.post('/deleteRole', auth({ config, db }), admin({ config, db }), (req, res) => {
    const { name } = req.body;
    if(name == 'admin') {
      res.status(403).json({
        code: -1,
        message: 'Admin role can not be deleted',
        type: 'error'
      });
    } else {
      db.query('DELETE FROM roles WHERE name = ${name}', { name }).then(row => {
        res.json({
          code: 0,
          message: 'Ok',
          type: 'success'
        });
      }).catch(err => {
        console.error(err);
      });
    }
  });

  return api;
}
