import http from 'http';
import express from 'express';
import morgan from 'morgan';
import initializeDb from './db';
import api from './api';
import config from './config.json';
import middleware from './middleware';
import expressWs from 'express-ws';

import startMQTT from './mqtt';
import startCron from './cron';

const app = express();
app.server = http.createServer(app);
expressWs(app, app.server);

// logger
app.use(morgan('dev'));

app.use(express.json({ type: '*/json' }));
app.use(express.urlencoded({ extended: false }));

initializeDb(config.postgres, (db) => {
  startMQTT({ config, db }, ({ subscribe, publish }) => {
    startCron({ config, db, publish }, ({ reload }) => {
      app.use(middleware);
      app.use('/api', api({ config, db, subscribe, publish, reload }));
      app.server.listen(process.env.PORT || config.port, () => {
        console.log(`Started on 0.0.0.0:${app.server.address().port}`);
      });
    })
  });
});

export default app;
