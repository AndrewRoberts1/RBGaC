const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'testusername',
    password: 'test123',
    database: 'rock_bottom_gear_and_co',
    port: '3306'
});

connection.connect((err) => {
  if (err) {
    console.log('Error connecting to the database:', err);
    process.exit();
  }

  console.log('Connected to the database!');
});

module.exports = connection;
