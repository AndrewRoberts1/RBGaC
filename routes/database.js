const { Client } = require('pg')
const connectionString = "postgres://rock_bottom_gear_and_co_user:FrgSInv7DiUd2QPo7jmBeZqXY8PgjtkQ@dpg-chjkkj0rddlddrnan7sg-a/rock_bottom_gear_and_co";

const client = new Client({
  connectionString,
})

client.connect()
 
client.query('SELECT NOW()', (err, res) => {
  console.log(err, res)
  client.end()
})
