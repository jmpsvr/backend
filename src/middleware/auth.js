import jwt from 'jsonwebtoken';

export default ({ config, db }) => {
  return (req, res, next) => {
    jwt.verify(req.headers[config.jwt.name], config.jwt.secret, (err, decode) => {
      if(!err) {
        req.jwt = decode;
        next();
      } else {
        res.status(401).json({
          code: -1,
          message: 'Unauthorized',
          type: 'error'
        });
      }
    });
  }
}
