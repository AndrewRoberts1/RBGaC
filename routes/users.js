var express = require('express');
var router = express.Router();

const dbclient = require('./database');
const bcrypt = require('bcryptjs');
const app = require('../app');




var session;


//MAYBE USE AYSNC ON THE TOP FUNCTION? - BARD?


/* Login user */
router.post('/login', async function (req, res, next) {
  session = req.session;

  var user_email_address = req.body.username;
  var user_password = req.body.password;
  //check both email address and password are given
  if(user_email_address && user_password) {
    //build query to search for user by email address
      let query = `
      SELECT * FROM users 
      WHERE email = $1
      `;
      dbclient.query(query, [user_email_address], async (err, result) => {
        console.log('the result.rows is : ', result.rows);
        //check if data was returned
          if(result.rows.length > 0) {
            console.log(result.rows)
              //iterate over each row returned from db query
              for(var count = 0; count < result.rows.length; count++) {
                console.log('the current row is : ',result.rows[count])
                //compare the password given and db password
                const compResult = await compareAsync(user_password, result.rows[count].password);
                  
                console.log(compResult);
                if (compResult) {
                  session.customer_id = result.rows[count].customer_id;
                  if (result.rows[count].admin) {
                    session.admin = true;
                  }
                  
                  res.redirect("/customer_account");
                } else {
                  // If password doesn't match
                  res.render('customer_login', { error: 'Incorrect Password' });
                }
              }
          }
          //if no data respond saying email is incorrect
          else {
            res.render('customer_login', { error: 'Incorrect Email Address' });
          }
      });
  }
  //if not given email and password then repsond with error
  else {
    res.render('customer_login', { error: 'Please Enter Email Address and Password Details' });
  }

});

function compareAsync(param1, param2) {
  return new Promise(function(resolve, reject) {
      bcrypt.compare(param1, param2, function(err, res) {
          if (err) {
               reject(err);
          } else {
               resolve(res);
          }
      });
  });
}

module.exports = router;