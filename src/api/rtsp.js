import { Router } from 'express';
import rtsp from 'rtsp-relay';
import jwt from 'jsonwebtoken';

export default ({ config, db }) => {
  const api = Router();
  api.get('/:id', (req, res) => {
    const params = req.params?.id?.split(',');
    const [id, token] = params;
    res.send(`
      <canvas id="canvas" style="width: 100%; height: 100%;"></canvas>
      <script src="/rtsp-relay.js"></script>
      <script>
        loadPlayer({
          url: 'ws://' + location.host + '/api/v1/rtsp/stream/${id}?jwt=${token}',
          canvas: document.getElementById('canvas')
        });
      </script>
    `);
  });
  const { proxy, scriptUrl } = rtsp(api);

  // the endpoint our RTSP uses
  api.ws('/stream/:id', (ws, req) => {
    const id = req.params?.id;
    const token = req.query?.jwt;
    
    jwt.verify(token, config.jwt.secret, (err, decode) => {
      if(!err && (decode.user.roles[0].name === 'admin' || decode?.user?.roles[0]?.permission?.includes(~~id))) {
        db.query('SELECT type, conn FROM devices WHERE id = ${id}', { id }).then(row => {
          const { type, conn } = row[0];
          if(type === 1) { // RTSP
            return proxy({
              url: JSON.parse(conn)?.rtsp,
              // if your RTSP stream need credentials, include them in the URL as above
              verbose: false,
            })(ws);
          }
        }).catch(err => {
          console.error(err);
        });
      }
    });
  });
  return api;
}



