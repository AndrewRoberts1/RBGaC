var express = require('express');
var router = express.Router();
const dbclient = require('./database');
const bcrypt = require('bcryptjs');
var app = require('../app');
const nodemailer = require("nodemailer");

// Below used to do multiple queries and get the result from all of them
// util module for handle callback in mysql query
const util = require('util');
const { resourceLimits } = require('worker_threads');

// create variable to get result from querying
let resultQuery = util.promisify(dbclient.query).bind(dbclient);

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rockbottomgearandco@gmail.com',
    pass: 'tmllppqzwxqeqwth'
  }
});


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
        products_list: result.rows,
        admin: req.session.admin
      });
    }
  });
});

router.get('/about', function(req, res, next) {
  // Render the pug template file
  res.render('about',{
  admin: req.session.admin});
    
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
      activity_list: activity_query.rows,
      activity_filter: req.params.activFilt,
      brand_filter: req.params.brandFilt,
      category_filter: req.params.categoryFilt,
      admin: req.session.admin

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
  sql += 'ORDER BY size_options.size_order'
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
        size_options: result.rows,
        admin: req.session.admin
      });
    }
  });

});


// GET customer login page

router.get('/customer_login', function(req, res, next) {
  res.render('customer_login', { error: false,
    admin: req.session.admin });
});


router.get('/customer_account', function(req, res, next) {
  console.log(req.session);
  if (req.session.customer_id) {
    // Make a database query
    var sql = "SELECT * FROM users WHERE customer_id = $1";
    //Execute db query
    dbclient.query(sql,[req.session.customer_id], (err, result) => {
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
          phone: user.phone,
          admin: req.session.admin

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
  res.render('customer_create',{
    admin: req.session.admin});
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
      var sql = `INSERT INTO users (first_name, second_name, phone, email, password) 
      VALUES ($1,$2,$3,$4,$5)`;
      //Execute db query
      dbclient.query(sql, [req.body.first_name,req.body.second_name,req.body.phone,req.body.email,hashedPassword], (err, result) => {
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
          subTotal: sum,
          admin: req.session.admin
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
    const deliveryAmount = req.body.deliveryoptions;
    //Make database queries to get data for page
    const customer_query = await resultQuery("SELECT * FROM users WHERE customer_id = $1", [req.session.customer_id]);
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
    if ( address_query.rows.length > 0) {
      var address_id = address_query.rows[0].address_id;
      var name_number = address_query.rows[0].name_number;
      var street = address_query.rows[0].street;
      var city = address_query.rows[0].city;
      var county = address_query.rows[0].county;
      var country = address_query.rows[0].country;
      var postcode = address_query.rows[0].postcode;
    } else {
      var address_id = "";
      var name_number = "";
      var street = "";
      var city = "";
      var county = "";
      var country = "";
      var postcode = "";
    }

    if (card_query.rows.length > 0) {
      var card_id = card_query.rows[0].card_id;
      var card_number = card_query.rows[0].card_number;
      var cvv = card_query.rows[0].cvv;
      var exp_date = new Date(card_query.rows[0].exp_date);
      var formattedExpDate = "";
      formattedExpDate += exp_date.getFullYear()+ "-";
      formattedExpDate += ((exp_date.getMonth() < 10) ? "0": "");
      formattedExpDate += exp_date.getMonth() +"-";
      formattedExpDate += ((exp_date.getDate() < 10) ? "0": "");
      formattedExpDate += exp_date.getDate();
    } else {
      var card_id = "";
      var card_number = "";
      var cvv = "";
      var formattedExpDate = "";
      
    }
    console.log('the card id from the query going to checkout is : ', card_id);

    if (customer_query.rows.length > 0) {
      var first_name = customer_query.rows[0].first_name;
      var surname = customer_query.rows[0].second_name;
      var email = customer_query.rows[0].email;
      var phone = customer_query.rows[0].phone;
    } else {
      var first_name = "";
      var surname = "";
      var email = "";
      var phone = "";
    }
    
    res.render('checkout', {
      // order fields
      delivery_amount: deliveryAmount,
      customer_details: customer_query.rows[0],
      basket_list: basket_query.rows,
      subTotal: sum,
      order_amount: sum + Number(deliveryAmount),
      // customer fields
      first_name: first_name,
      surname: surname,
      email: email,
      phone: phone,
      // address fields
      address_id: address_id,
      name_number: name_number,
      street: street,
      city: city,
      county: county,
      country: country,
      postcode: postcode,
      // card fields
      card_id: card_id,
      card_number: card_number,
      cvv: cvv,
      exp_date: formattedExpDate,
      // admin check
      admin: req.session.admin
    });
    
  } else {
    // Redirect user to login if not already
    res.redirect('/customer_login');
  }
});



router.post('/payment', async function(req, res, next) {
  if (req.session.customer_id) {
    console.log(req.body);
    //Check if the addresses have been used before - if not create them and get the id for the order
    if (!req.body.address_id) {
      //Insert address
      const address_query = await resultQuery("INSERT INTO address (customer_id, name_number, street, city, county, country, postcode) VALUES ($1,$2,$3,$4,$5,$6,$7);", 
        [req.session.customer_id, req.body.name_number, req.body.street, req.body.city, req.body.county, req.body.country, req.body.postcode]);
      //GET new address id from latest insert
      const get_address_query = await resultQuery("SELECT * FROM address WHERE customer_id = $1 ORDER BY address_id DESC LIMIT 1", [req.session.customer_id]);
      console.log(get_address_query.rows);
      var address_id = get_address_query.rows[0].address_id;
    } else {
      var address_id = req.body.address_id;
    }
    if (!req.body.cardid) {
      //Insert card
      const card_query = await resultQuery("INSERT INTO card_details (customer_id, card_number, cvv, exp_date) VALUES ($1,$2,$3,$4);", 
        [req.session.customer_id, req.body.card_number, req.body.cvv, req.body.exp_date]);
      //GET new card id from latest insert
      const get_card_query = await resultQuery("SELECT * FROM card_details WHERE customer_id = $1 ORDER BY card_id DESC LIMIT 1", [req.session.customer_id]);
      console.log(get_card_query.rows);
      var card_id = get_card_query.rows[0].card_id;
    } else {
      var card_id = req.body.cardid;
    }
    console.log(address_id);
    console.log(card_id);

    // Get todays date
    var date_today = new Date(Date.now());

    //Create order

    // Make a database query
    var order_insert_sql = `INSERT INTO orders (customer_id, card_id, address_id, order_amount, status, ordered_date, delivery_amount) VALUES ($1,$2,$3,$4,$5,$6,$7)`;
    var order_sql = `SELECT * FROM orders WHERE customer_id = $1 ORDER BY order_id DESC LIMIT 1;`;
    //Execute db query
    const order_insert_query = await resultQuery(order_insert_sql, [req.session.customer_id, card_id, address_id, req.body.order_amount, "Order Raised", date_today, req.body.delivery_amount]);
    const order_query = await resultQuery(order_sql, [req.session.customer_id]);
    //Get items from the basket
    console.log('order raised')

    const basket_query = await resultQuery(`SELECT * FROM basket
    LEFT JOIN size_options as size ON size.size_id = basket.size_id
    LEFT JOIN product ON product.product_id = size.product_id
    WHERE basket.customer_id =$1`, [req.session.customer_id]);

    console.log('got from basket')

    //Move items from basket to ordered items list with new order_id - then delete from basket

    // Make a database query
    var ordered_items_sql = "INSERT INTO ordered_items (order_id, size_id, quantity) VALUES ";
    for (item in basket_query.rows) {
      ordered_items_sql += "("+order_query.rows[0].order_id+","+basket_query.rows[item].size_id+","+basket_query.rows[item].quantity+"),";
    }
    //remove last comma
    ordered_items_sql = ordered_items_sql.slice(0, -1);
    delete_basket_sql = `DELETE FROM basket WHERE basket.customer_id = ` + req.session.customer_id;
    //Execute db query
    const ordered_items_query = await resultQuery(ordered_items_sql);
    const delete_basket_query = await resultQuery(delete_basket_sql);
    //GET customer details
    const customer_query = await resultQuery("SELECT * FROM users WHERE customer_id = $1", [req.session.customer_id]);

    console.log('items added to odered items list');

    var predicted_delivery_days = 0;
    //Figure out predicted delivery date
    switch(req.body.delivery_amount) {
      case 5:
        predicted_delivery_days = 6;
        break;
      case 7:
        predicted_delivery_days = 3;
        break;
      case 10:
        predicted_delivery_days = 1;
        break;
    }
    // Add ten days to specified date
    var order_date = new Date(order_query.rows[0].ordered_date);

    const mailOrderCreated = {
      from: 'rockbottomgearandco@gmail.com',
      to: customer_query.rows[0].email,
      subject: 'Order Raised!',
      text:`To ` + customer_query.rows[0].first_name + `
      
Thank you for shopping with us at Rock Bottom Gear & Co!
Your order has been created and we are processing it now.

Order Summary:

Order Number: ` + order_query.rows[0].order_id + ` 
Order Amount: £` + order_query.rows[0].order_amount + `
Ordere Date: ` + formatDate(order_date) + `

Thanks,
Rock Bottom Gear & Co Team`
      
    };
    transporter.sendMail(mailOrderCreated, function(error, info){
      if (error) {
     console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
        // do something useful
      }
    });
    if(order_query.rows.length > 0) {
      // Render the pug template file with the database results
      res.render('order_confirmation', {
        order_id: order_query.rows[0].order_id,
        order_amount: order_query.rows[0].order_amount,
        order_date: formatDate(order_date),
        ordered_items: basket_query.rows,
        delivery_days: predicted_delivery_days,
        admin: req.session.admin
      });
    }
      
      
    
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


router.get('/add_product', async function(req, res, next) {
  const brand_query = await resultQuery("SELECT * FROM brand ORDER BY brand_id");
  const activity_query = await resultQuery("SELECT * FROM product_activity ORDER BY activity_id");
  const product_type_query = await resultQuery("SELECT * FROM product_category ORDER BY product_category_id");

  // Render the pug template file with the database results
  res.render('edit_products', {
    brand_options: brand_query.rows,
    activity_options: activity_query.rows,
    product_type_options: product_type_query.rows,
    mode: "New",
    admin: req.session.admin
  });
})


router.post('/productsave', async function(req, res, next) {
  switch (req.body.mode) {
    case "New":
      const insert_prod_query = await resultQuery("INSERT INTO product (product_category_id,activity_id,brand_id,product_name,price,colour,description, popular_item) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [req.body.product_type, req.body.activity, req.body.brand, req.body.product_name, req.body.price, req.body.colour, req.body.desc, req.body.popular_item]);
      const get_prod_query = await resultQuery('SELECT * FROM product ORDER BY product_id DESC LIMIT 1');
      const insert_size_query = await resultQuery(`INSERT INTO size_options (product_id) VALUES ($1)`,[get_prod_query.rows[0].product_id]);
      break;
    case "Edit":
      const update_prod_query = await resultQuery(`UPDATE product
      SET product_category_id = $1,
      activity_id = $2,
      brand_id = $3,
      product_name = $4,
      price = $5,
      colour = $6,
      description = $7,
      popular_item = $8
      WHERE product_id = $9;`,
      [req.body.product_type, req.body.activity, req.body.brand, req.body.product_name, req.body.price, req.body.colour, req.body.desc, req.body.popular_item, req.body.product_id]);
      break;
  }
  
  //Reload page to show change
  res.redirect('view_products');
})

router.post('/edit_product', async function(req, res, next) {
  const brand_query = await resultQuery("SELECT * FROM brand ORDER BY brand_id");
  const activity_query = await resultQuery("SELECT * FROM product_activity ORDER BY activity_id");
  const product_type_query = await resultQuery("SELECT * FROM product_category ORDER BY product_category_id");
  var sql = 'SELECT * FROM product ' ;
  sql += 'LEFT JOIN size_options ON size_options.product_id = product.product_id '
  sql += 'LEFT JOIN product_activity ON product_activity.activity_id = product.activity_id '
  sql += 'LEFT JOIN product_category ON product_category.product_category_id = product.product_category_id '
  sql += 'LEFT JOIN brand ON brand.brand_id = product.brand_id '
  sql += 'WHERE product.product_id=' + req.body.product_id + ' '
  sql += 'ORDER BY size_options.size_id'
  const product_query = await resultQuery(sql);

  // Render the pug template file with the database results
  res.render('edit_products', {
    //load product detials
    product_id:  product_query.rows[0].product_id,
    product_name: product_query.rows[0].product_name,
    price: product_query.rows[0].price,
    colour: product_query.rows[0].colour,
    brand: product_query.rows[0].brand_name,
    activity: product_query.rows[0].activity,
    desc: product_query.rows[0].description,
    popular_item: product_query.rows[0].popular_item,
    product_type: product_query.rows[0].category,
    brand_options: brand_query.rows,
    activity_options: activity_query.rows,
    product_type_options: product_type_query.rows,
    mode: "Edit",
    admin: req.session.admin
  });
})

router.post('/remove_product', async function(req, res, next) {
  const product_id = req.body.product_id;
    // Make a database query
    var sql = "DELETE FROM product WHERE product_id = $1";
    //Execute db query
    dbclient.query(sql, [product_id], (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {

        // Make a database query
        var sql = "DELETE FROM size_options WHERE product_id = $1";
        //Execute db query
        dbclient.query(sql, [product_id], (err, result) => {
          //Check for error in db query
          if (err) {
            //display the error
            console.log('Error querying the database:', err);
            res.send(500);
          } else {
            //Reload page to show change
            res.redirect('view_products');
          }
            
        });
      }
        
    });
  
})


router.get('/view_products', async function(req, res, next) {
  const product_id = req.body.product_id;
    // Make a database query
    var sql = `SELECT product.*, string_agg(size_options.size, ', ') AS size
  FROM product
  INNER JOIN size_options ON product.product_id = size_options.product_id
  GROUP BY product.product_id
  ORDER BY product.product_id;`;
    //Execute db query
    dbclient.query(sql, (err, result) => {
      //Check for error in db query
      if (err) {
        //display the error
        console.log('Error querying the database:', err);
        res.send(500);
      } else {
        // Render the pug template file with the database results
        res.render('view_products', {
          product_list: result.rows,
          admin: req.session.admin
        });
        
      }
        
    });
  
})


router.get('/edit_size/:product_id/:size_id', async function(req, res, next) {
  console.log("you got the get for edit_size");
  const product_id = req.params.product_id;
  const size_query = await resultQuery("SELECT * FROM size_options WHERE product_id = $1", [product_id]);
  if (req.params.size_id !== "_") {
    const size_id = req.params.size_id;
    const single_size_query = await resultQuery("SELECT * FROM size_options WHERE size_id = $1", [size_id]);
  
    res.render('edit_size_options', {
      size_options: size_query.rows,
      size_id: single_size_query.rows[0].size_id,
      size: single_size_query.rows[0].size,
      size_order: single_size_query.rows[0].size_order,
      product_id: size_query.rows[0].product_id,
      admin: req.session.admin
    });
  } else {
    res.render('edit_size_options', {
      size_options: size_query.rows,
      product_id: size_query.rows[0].product_id,
      admin: req.session.admin
      
    });
  }
  
})

router.post('/size_option_save', async function(req, res, next) {
  const size_id = req.body.size_id;
  
  const update_size_query = await resultQuery("UPDATE size_options SET size=$1, size_order=$2  WHERE size_id = $3", 
    [req.body.size, req.body.size_order, size_id]);
  const get_size_query = await resultQuery("SELECT * FROM size_options WHERE size_id = $1", [size_id]);

  res.redirect('/edit_size/'+get_size_query.rows[0].product_id+"/_")
  
})

router.post('/add_size', async function(req, res, next) {
  const product_id = req.body.product_id;
  const update_size_query = await resultQuery("INSERT INTO size_options (product_id) VALUES ($1)", [product_id]);

  res.redirect('/edit_size/'+product_id+"/_")
    
  
})

router.post('/remove_size', async function(req, res, next) {
  const size_id = req.body.size_id;
  const update_size_query = await resultQuery("DELETE FROM size_options WHERE size_id = $1", [size_id]);

  res.redirect('/edit_size/'+req.body.product_id+"/_")
  
})


router.post('/newsletter_signup', function(req, res, next) {
  const mailNewsletter = {
    from: 'rockbottomgearandco@gmail.com',
    to: req.body.email,
    subject: 'Subscribed to Newsletter!',
    text:`Hi,
    
Thank you for subscribing to our newsletter with us at Rock Bottom Gear & Co!

Thanks,
Rock Bottom Gear & Co Team`
    
  };
  transporter.sendMail(mailNewsletter, function(error, info){
    if (error) {
   console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
      // do something useful
    }
  });
  res.render('newsletter_confirmation', {
    admin: req.session.admin})
})



// Logout user
router.get('/logout', function(req, res, next){

req.session.destroy();

res.redirect("/");

});

// functions

function formatDate(date) {
  var formattedExpDate = ""
  formattedExpDate += date.getFullYear()+ "-";
  formattedExpDate += ((date.getMonth() < 10) ? "0": "");
  formattedExpDate += date.getMonth() +"-";
  formattedExpDate += ((date.getDate() < 10) ? "0": "");
  formattedExpDate += date.getDate();
  return formattedExpDate
}

module.exports = router;
