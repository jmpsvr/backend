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
  return api;
}
