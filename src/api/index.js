import { version } from '../../package.json';
import { Router } from 'express';
// import facets from './facets';
import sys from './sys';
import user from './user';
import device from './device';

export default ({ config, db }) => {
  const api = Router();

  // // mount the facets resource
  // api.use('/facets', facets({ config, db }));

  // perhaps expose some API metadata at the root
  api.get('/', (req, res) => {
    res.json({ version });
  });

	api.use('/sys', sys({ config, db }));
  api.use('/user', user({ config, db }));
  api.use('/device', device({ config, db }));

  return api;
}
