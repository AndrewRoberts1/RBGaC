var express = require('express');
var router = express.Router();

const dbclient = require('./database');
const bcrypt = require('bcryptjs');
const app = require('../app');




/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

// Logout user
router.get('/logout', function(req, res, next){

  req.session.destroy();

  res.redirect("/");

});


/* Login user */
router.post('/login', function (req, res, next) {
  console.log(req.session);
  //console.log(req.session);
  var user_email_address = req.body.username;
  var user_password = req.body.password;
  //check both email address and password are given
  if(user_email_address && user_password) {
    //build query to search for user by email address
      query = `
      SELECT * FROM customers 
      WHERE email = "${user_email_address}"
      `;
      dbclient.query(query, function(err, result) {
        console.log('the result of the db query to customers is : ', result);
        console.log('the result.rows is : ', result.rows);
        //check if data was returned
          if(result.rows.length > 0) {
            console.log(result.rows)
              //iterate over each row returned from db query
              for(var count = 0; count < result.rows.length; count++) {
                console.log('the current row is : ',result.rows[count])
                //compare the password given and db password
                bcrypt.compare(user_password, result.rows[count].password,
                  async function (err, isMatch) {
                      //check if they match
                      if (isMatch) {
                        console.log(req.session);
                        console.log(result.rows[count])
                        req.session.customer_id = String(result.rows[count].customer_id);
                        
                        console.log(req.session);
                        res.redirect("/");
                      } else {
                        // If password doesn't match
                        res.render('customer_login', { error: 'Incorrect Password' });
                      }
                  })
                      
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

module.exports = router;