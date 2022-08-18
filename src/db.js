import pgp from 'pg-promise';

export default (postgres, callback) => {
  const db = pgp()(postgres); // PostgreSQL
  db.query('SET TIME ZONE "Asia/Shanghai"').then((row) => {
    callback(db);
  }).catch((err) => {
    console.error(err);
  });
  
}
