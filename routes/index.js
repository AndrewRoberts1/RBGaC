var express = require('express');
var router = express.Router();
const dbclient = require('./database');
const bcrypt = require('bcryptjs');
var app = require('../app');

// Below used to do multiple queries and get the result from all of them
// util module for handle callback in mysql query
const util = require('util');
const { resourceLimits } = require('worker_threads');

// create variable to get result from querying
let resultQuery = util.promisify(dbclient.query).bind(dbclient);



/* GET home page. */

router.get('/', function(req, res, next) {
  console.log(req.session);
  console.log('session id is : ', req.session.id);

  // Make a database query
  var sql = "SELECT * FROM product WHERE popular_item = $1";
  //Execute db query
  dbclient.query(sql,[1], (err, result) => {
    //Check for error in db query
    if (err) {
      //display the error
      console.log('Error querying the database:', err);
      res.send(500);
    } else {
      // Render the pug template file with the database results
      res.render('home', { 
        products_list: result.rows
      });
    }
  });
});

router.get('/about', function(req, res, next) {
  // Render the pug template file
  res.render('about');
    
});


router.get('/shop/:activFilt/:categoryFilt/:brandFilt', async (req, res, next) => {
  const activity_idFilter = (req.params.activFilt == '_') ? 'activity_id' : req.params.activFilt;
  const product_category_idFilter = (req.params.categoryFilt == '_') ? 'product_category_id' : req.params.categoryFilt;
  const brand_idFilter = (req.params.brandFilt == '_') ? 'brand_id' : req.params.brandFilt;
  try {
    //Execute db query
    var product_query = await resultQuery(`SELECT * FROM product 
    WHERE activity_id = ` + activity_idFilter + `  
    AND product_category_id = ` + product_category_idFilter +`  
    AND brand_id = ` + brand_idFilter);
    var brand_query = await resultQuery("SELECT * FROM brand");
    var category_query = await resultQuery("SELECT * FROM product_category");
    var activity_query = await resultQuery("SELECT * FROM product_activity");
    
    // Render the pug template file with the database results
    res.render('shop', {
      products_list: product_query.rows,
      brand_list: brand_query.rows,
      prod_type_list: category_query.rows,
      activity_list: activity_query.rows
    });
  } catch (err) {
    console.log(err.stack)
  }
  
})


/* GET product page. */


router.get('/product/:product_id', function(req, res, next) {
  // Make a database query
  var sql = 'SELECT * FROM product ' ;
  sql += 'LEFT JOIN size_options ON size_options.product_id = product.product_id '
  sql += 'LEFT JOIN product_activity ON product_activity.activity_id = product.activity_id '
  sql += 'LEFT JOIN product_category ON product_category.product_category_id = product.product_category_id '
  sql += 'LEFT JOIN brand ON brand.brand_id = product.brand_id '
  sql += 'WHERE product.product_id=' + req.params.product_id + ' '
  sql += 'ORDER BY size_options.size_id'
  //Execute db query
  dbclient.query(sql, (err, result) => {
    //Check for error in db error
    if (err) {
      //display the query
      console.log('Error querying the database:', err);
      res.send(500);
    } else {
      // Render the pug template file with the database results
      const product_info = result.rows[0];
      res.render('product', { 
        product_id: product_info.product_id,
        product_name: product_info.product_name,
        activity: product_info.activity,
        desc: product_info.description,
        brand: product_info.brand_name,
        prod_type: product_info.category,
        price: product_info.price,
        colour: product_info.colour,
        size_options: result.rows
      });
    }
  });

});


// GET customer login page

router.get('/customer_login', function(req, res, next) {
  res.render('customer_login', { error: false });
});


router.get('/customer_account', function(req, res, next) {
  console.log(req.session);
  if (req.session.customer_id) {
    // Make a database query
    var sql = "SELECT * FROM product WHERE popular_item = $1";
    //Execute db query
    dbclient.query(sql,[1], (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {
        var user = result.rows[0]
        // Render the pug template file with the database results
        res.render('customer_account', { 
          first_name: user.first_name,
          surname: user.second_name,
          email: user.email,
          phone: user.phone

        });
      }
    });
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
  
});

// Get create customer page

router.get('/customer_create', function(req, res, next) {
  res.render('customer_create');
});

router.post('/add_user', function(req, res, next) {
  const password = req.body.password;
  //Hash password
  bcrypt.genSalt(10, function (err, Salt) {
    console.log(password);
    // The bcrypt is used for encrypting password.
    bcrypt.hash(password, Salt, function (err, hashedPassword) {
  
      if (err) {
        return console.log('Cannot encrypt');
      }
      console.log(hashedPassword);
      // Make a database query
      var sql = `INSERT INTO customers(first_name, second_name, phone, email, password) 
      VALUES ("${req.body.first_name}","${req.body.second_name}","${req.body.phone}","${req.body.email}","${hashedPassword}")`;
      //Execute db query
      dbclient.query(sql, (err, result) => {
        //Check for error in db query
        if (err) {
          //display the error
          console.log('Error querying the database:', err);
          res.send(500);
        } else {
          // Redirect user to login if not already
          res.redirect('/customer_login');
        }
      });
    })
  })

  
})

// GET basket page
router.get('/basket', function(req, res, next) {
  if (req.session.customer_id) {

    // Make a database query
    var sql = `SELECT * FROM basket
    LEFT JOIN size_options as size ON size.size_id = basket.size_id
    LEFT JOIN product ON product.product_id = size.product_id
    WHERE basket.customer_id = $1`;
    //Execute db query
    dbclient.query(sql, [req.session.customer_id], (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {
        //get total of basket
        let sum = 0;
        for (item in result.rows) {
          sum += result.rows[item].price * result.rows[item].quantity;
        }
        // Render the pug template file with the database results
        res.render('basket', { 
          basket_list: result.rows,
          subTotal: sum
        });
      }
    });
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
});

router.post('/checkout', async function(req, res, next) {
  if (req.session.customer_id) {
    console.log('going to checkout - delivery amount : ',req.body.deliveryoptions);

    const deliveryAmount = req.body.deliveryoptions;
    //Make database queries to get data for page
    const customer_query = await resultQuery("SELECT * FROM customers WHERE customer_id = $1", [req.session.customer_id]);
    const address_query = await resultQuery("SELECT * FROM address WHERE customer_id = $1 ORDER BY address_id DESC LIMIT 1", [req.session.customer_id]);
    const card_query = await resultQuery("SELECT * FROM card_details WHERE customer_id = $1 ORDER BY card_id DESC LIMIT 1", [req.session.customer_id]);
    const basket_query = await resultQuery(`SELECT * FROM basket
    LEFT JOIN size_options as size ON size.size_id = basket.size_id
    LEFT JOIN product ON product.product_id = size.product_id
    WHERE basket.customer_id =$1`, [req.session.customer_id]);
    //get varaibles for total amount
    let sum = 0;
    for (item in basket_query.rows) {
      sum += basket_query.rows[item].price * basket_query.rows[item].quantity;
    }

    console.log(deliveryAmount);
    res.render('checkout', {
      // order fields
      //delivery_amount: deliveryAmount,
      customer_details: customer_query.rows[0],
      basket_list: basket_query.rows,
      subTotal: sum,
      total: sum + Number(delivery_amount),
      // address fields
      address_id: address_query.rows[0].address_id,
      name_number: address_query.rows[0].name_number,
      street: address_query.rows[0].street,
      city: address_query.rows[0].city,
      county: address_query.rows[0].county,
      country: address_query.rows[0].country,
      postcode: address_query.rows[0].postcode,
      // card fields
      card_id: card_query.rows[0].card_id,
      card_number: card_query.rows[0].card_number,
      cvv: card_query.rows[0].cvv,
      exp_date: card_query.rows[0].exp_date,
    });
    
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
});



router.get('/payment', async function(req, res, next) {
  if (req.session.customer_id) {

    //Check if the addresses have been used before - if not create them and get the id for the order
    if (!req.body.address_id) {
      var address_query = await resultQuery("INSERT INTO address (customer_id, name_number, street, city, county, country, postcode)", 
        [req.session.customer_id, req.body.name_number, req.body.street, req.body.city, req.body.county, req.body.country, req.body.postcode]);
      var address_id = address_query.rows[0].address_id;
    } else {
      var address_id = req.body.address_id;
    }
    if (!req.body.card_id) {
      var card_query = await resultQuery("INSERT INTO card_details (customer_id, card_number, cvv, exp_date)", 
        [req.session.customer_id, req.body.card_number, req.body.cvv, req.body.exp_date]);
      var card_id = card_query.rows[0].card_id;
    } else {
      var card_id = req.body.card_id;
    }

// add to order and DELETE FROM BASKET AFTER


    // Make a database query
    var sql = `SELECT * FROM basket
    LEFT JOIN size_options as size ON size.size_id = basket.size_id
    LEFT JOIN product ON product.product_id = size.product_id
    WHERE basket.customer_id = 17`;
    //Execute db query
    dbclient.query(sql, (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {
        //get total of basket
        let sum = 0;
        for (item in result.rows) {
          sum += result.rows[item].price * result.rows[item].quantity;
        }
        
        // Render the pug template file with the database results
        res.render('order_confirmation', {
          delivery_amount: deliveryAmount,
          customer_details: customer_query.rows[0],
          ordered_items: result.rows,
          subTotal: sum,
          total: sum + Number(delivery_amount)
        });
      }
    });
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
});
 

router.post('/basketadd', function(req, res, next) {
  if (req.session.customer_id) {
    const size_id = req.body.sizeOptions;
    // Make a database query
    var sql = "SELECT * FROM basket WHERE customer_id = $1 AND size_id = $2";
    //Execute db query
    dbclient.query(sql, [req.session.customer_id,size_id], (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {
        // chech if there are rows
        if (result.rows.length == 0) {
          //add size item
          console.log('there is none in there yet');
          dbclient.query('INSERT INTO basket (customer_id, size_id, quantity, session_id) VALUES ($1, $2, 1, 0)', [req.session.customer_id,size_id], (err, result) => {
            //Check for error in db query
            if (err) {
              //display the error
              console.log('Error querying the database:', err);
              res.send(500);
            } else {
              // chech if there are rows
              console.log('row added');
              res.redirect('/basket');
              
            }})
        } else {
          //increment quantity by 1
          dbclient.query('UPDATE basket SET quantity = $1 WHERE customer_id = $2 AND size_id = $3', [result.rows[0].quantity + 1,req.session.customer_id,size_id], (err, result) => {
            //Check for error in db query
            if (err) {
              //display the error
              console.log('Error querying the database:', err);
              res.send(500);
            } else {
              // chech if there are rows
              console.log('quantity increased');
              res.redirect('/basket');
              
            }})
        }
        
      }
    });
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
})



router.post('/basketremove', function(req, res, next) {
  if (req.session.customer_id) {
    const size_id = req.body.size_id;
    // Make a database query
    var sql = "DELETE FROM basket WHERE customer_id = $1 AND size_id = $2";
    //Execute db query
    dbclient.query(sql, [req.session.customer_id,size_id], (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {
        //Reload page to show change
        res.redirect('/basket');
      }
        
    });
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
})



module.exports = router;
