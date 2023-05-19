const { Pool } = require('pg')
const connectionString = "postgres://rock_bottom_gear_and_co_user:FrgSInv7DiUd2QPo7jmBeZqXY8PgjtkQ@dpg-chjkkj0rddlddrnan7sg-a/rock_bottom_gear_and_co";
 
const pool = new Pool({
  connectionString,
})

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  },
}