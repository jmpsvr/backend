import pgp from 'pg-promise';

export default (postgres, callback) => {
  const db = pgp()(postgres); // PostgreSQL
  callback(db);
}
