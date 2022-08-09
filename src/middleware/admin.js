import jwt from 'jsonwebtoken';

export default ({ config, db }) => {
  return (req, res, next) => {
    if(req.jwt.user.roles[0].name === 'admin') {
      next();
    } else {
      res.status(403).json({
        code: -1,
        message: 'Not admin',
        type: 'error'
      });
    }
  }
}
