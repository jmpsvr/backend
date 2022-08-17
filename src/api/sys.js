import { Router } from 'express';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth';

export default ({ config, db }) => {
  const api = Router();

  api.post('/login', (req, res) => {
    if(!req.body) return;
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE name = $1 AND password = $2', [ username, password ]).then(row => {
      if(row.length > 0) {
        const user = row[0];
        if(user.status) {
          db.query('SELECT * FROM roles WHERE name = $1', [ user.role ]).then(roles => {
            const role = roles[0];
            const token = jwt.sign({
              user: { id: user.id, name: user.name, nickname: user.nickname, roles: [ role ] }
            }, config.jwt.secret, { expiresIn: config.jwt.age });
            res.json({
              code: 0,
              result: {
                token,
                roles: [
                  {
                    roleName: role?.remark,
                    value: role?.name
                  }
                ],
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                createTime: user.createTime,
                remark: user.remark
              },
              message: 'Ok',
              type: 'success'
            });
          });
        } else {
          res.status(403).json({
            code: -3,
            message: 'User is banned',
            type: 'error'
          });
        }
      } else {
        res.status(401).json({
          code: -1,
          message: 'Invalid username or password',
          type: 'error'
        });
      }
    });
  });

  api.get('/getUserInfo', auth({ config, db }), (req, res) => {
    res.json({
      code: 0,
      result: req.jwt.user,
      message: 'Ok',
      type: 'success'
    });
  });

  api.get('/logout', auth({ config, db }), (req, res) => {
    res.json({
      code: 0,
      message: 'Ok',
      type: 'success'
    });
  });

  api.post('/changePassword', auth({ config, db }), (req, res) => {
    const { passwordOld, passwordNew } = req.body;
    const username = req.jwt.user.name;
    db.query('SELECT * FROM users WHERE name = ${username}', { username }).then(row => {
      if(row[0]?.password === passwordOld) {
        db.query('UPDATE users SET password = ${passwordNew} WHERE id = ${id}', {
          id: row[0].id, passwordNew
        }).then(row => {
          console.log(row);
          res.json({
            code: 0,
            message: 'Ok',
            type: 'success'
          });
        }).catch(err => {
          console.error(err);
          res.json({
            code: -5,
            message: err,
            type: 'error'
          });
        });
      } else {
        res.status(403).json({
          code: -3,
          message: 'Invalid old password',
          type: 'error'
        });
      }
    }).catch(err => {
      console.error(err);
    });
  });

  api.get('/getAnalysis', auth({ config, db }), (req, res) => {
    db.query(`
    WITH  u AS (SELECT COUNT(id) AS count FROM users),
          d AS (SELECT COUNT(id) AS count FROM devices),
          a AS (SELECT COUNT(id) AS count FROM actions),
          n AS (SELECT COUNT(uuid) AS count FROM notices)
    SELECT u.count AS user, d.count AS device, a.count AS action, n.count AS notice FROM u, d, a, n
    `).then(row => {
      res.json({
        code: 0,
        result: row[0],
        message: 'Ok',
        type: 'success'
      });
    }).catch(err => {
      console.error(err);
    });
  });

  return api;
}
