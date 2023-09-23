
const usersModel = require('../models/user');
const productsModel = require('../models/products');
const orderModel = require('../models/order');
const categoryModel = require('../models/category');
const couponModel = require('../models/coupon');
const bannerModel = require('../models/banner')
const bcrypt = require('bcrypt')
const Razorpay = require('razorpay');
const easyinvoice = require('easyinvoice');
const { v4: uuidv4 } = require('uuid');

//Razor pay
const key_Id = process.env.RAZORPAY_KEY_ID
const key_Secret = process.env.RAZORPAY_SECRET_KEY

//twilio
const SID = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER

var client = require('twilio')(SID, authToken)
var jwt = require('jsonwebtoken')

const otpGenerator = require('otp-generator');
const otp = 2345 //otpGenerator.generate(4, { upperCaseAlphabets: false, specialChars: false });
console.log(otp);
/*twilio validation*/
const verifyOtp = (req, res) => {
  try {
    let { first, second, third, fourth} = req.body;
    const otpString = otp.toString();
    let [first1, second1, third1, fourth1] =otpString
    if (first == first1 && second == second1 && third == third1 && fourth == fourth1) {
      res.redirect('/');
    }
    else {
      res.render('user/otp', { title: 'e-Commerce', message: "Otp verification failed", user: req.session.user })
    }
  }
  catch (err) {
    console.log(err.message)
  }
}

// SEND OTP SMS TO MOBILE NUMBER USING TWILIO

const sendTextMessage = (otp) => {
  client.messages.create({
    body: `<#> ${otp} is your Mybuzz verification code. Enjoy shopping!`,
    to: '+919048098002', // Text your number
    from: '+18146795472', // From a valid Twilio number
  })
    .then((message) => console.log(message))
    .catch(err => console.log(err));
}

var otpGeneration = (req, res) => {
  //sendTextMessage(otp)
  res.render('./user/otp', { title: 'e-Commerce', message: "OTP veification", user: req.session.user })
}
// PASSWORD ENCRIPTION
const pwdEncription = (password) => {
  const hashedPWD = bcrypt.hash(password, 10)
  return hashedPWD
}

// #Home
const home = async (req, res) => {

  const banners = await bannerModel.find()
  //console.log("banners>>", banners.map(item => item.url))
  const products = await productsModel.aggregate([
    {
      $match: {
        availability: true, // Filter by availability
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: 'categoryName',
        as: 'joinedData'
      }
    },
    {
      $unwind: '$joinedData'  // Unwind the joined array
    },
    {
      $match: {
        'joinedData.isAvailable': true  // Filter by categoryName
      }
    }
  ]).sort({ _id: -1 }).limit(8)

  //console.log("products>>",products)
  const userData = await usersModel.find();
  const cart = userData.cart;
  const cartCount = 0//cart.length;
  res.render('./user/index', { title: 'e-Commerce', message: "", user: req.session.user, products, cart, cartCount, banners });


};

//#LOGIN
const login = async (req, res) => {
  res.render('./user/login', { title: 'e-Commerce', message: "", user: req.session.user });
}


//#SHOP 
const shop = async (req, res) => {
  //console.log(req.query.page)
  const pageNum = parseInt(req.query.page) || 1
  const perpage = 15
  const totalProduct = await productsModel.find()
  const totalPages = Math.ceil(totalProduct.length / perpage)
  const skip = (pageNum - 1) * perpage
  // console.log(pageNum);
  const userDetails = await usersModel.findOne({ email: req.session.email })
  let cartCount, cart;
  if (userDetails) {
    cart = userDetails.cart
    cartCount = cart.length
  }
  const category = await categoryModel.find({ isAvailable: true })
  // const products = await productsModel.aggregate([
  //   {
  //     $match: {
  //       availability: true, // Filter by availability
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'categories',
  //       let: { category: '$category' }, // Local variable for category
  //       pipeline: [
  //         {
  //           $match: {
  //             $expr: {
  //               $and: [
  //                 { $eq: ['$categoryName', '$$category'] }, // Match based on category field
  //                 { $eq: ['$isAvailable', true] } // Filter by isAvailable field
  //               ]
  //             }
  //           }
  //         }
  //       ],
  //       as: 'joinedData'
  //     }
  //   }
  // ]);
 
  
  const products = await productsModel.aggregate([
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: 'categoryName',
        as: 'joinedData'
      }
    },
    {
      $unwind: '$joinedData'  // Unwind the joined array
    },
    {
      $match: {
        'joinedData.isAvailable': true  // Filter by categoryName
      }
    }
  ]).skip(skip).limit(perpage);
  console.log("products",products)
  res.render('./user/shop', { title: 'e-Commerce', message: "", products, category, user: req.session.user, cart, cartCount, currentPage: pageNum, totalPages });
};

//function for generating invoice
const generateInvoice = async (order, products, address) => {
  try {
    const invoiceOptions = {
      documentTitle: 'Invoice',
      currency: 'INR',
      taxNotation: 'GST',
      marginTop: 25,
      marginRight: 25,
      marginLeft: 25,
      marginBottom: 25,
      images: {
        logo: '',
      },
      sender: {
        company: 'Royal Furnitures',
        address: 'Aluva',
        zip: '681371',
        city: 'Ernakulam',
        country: 'Kerala',
        phone: '9048098002',
      },
      client: {
        company: address.name,
        address: address.houseName,
        zip: address.street,
        city: address.city,
        country: address.phone,
        phone: address.postalCode
      },
      information: {
        number: order.map(item => item._id),
        date: order.map(item => item.createdAt.toLocaleDateString()),
        'due-date': order.map(item => item.expectedDelivery.toLocaleDateString())
      },
      products: [],

      bottomNotice: 'Discount: $10',
      subtotal: 185,
      total: 175,
    };

    products.forEach((data) => {
      if (data.productStatus) {
        invoiceOptions.products.push({
          quantity: data.quantity,
          description: data.p_name,
          'tax-rate': 0,
          price: data.realPrice,
        });
      }
    });
    const result = await easyinvoice.createInvoice(invoiceOptions);
    const pdfBuffer = Buffer.from(result.pdf, 'base64');

    return pdfBuffer;
  } catch (error) {
    console.log('Error generating invoice:', error);
    throw error;
  }
};


const pdf = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userDetails = await usersModel.findOne({ email: req.session.user });
    const order = await orderModel.find({ _id: orderId });
    const products = order.map(items => items.products).flat();
    
    const address = userDetails.address.find(items => items._id.toString() == order.map(items => items.address).toString());
    
    const invoiceBuffer = await generateInvoice(order, products, address);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
    res.send(invoiceBuffer);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};
const productFilter = async (req, res) => {
  try {
    const searchInput = req.body.searchInput
    //console.log("searchInput>>", searchInput);
    const key = req.query.searchInput;
    const searchPattern = { $regex: '^' + key, $options: 'i' };
    const sortFilter = req.body.sortOption
    //console.log("sortFilter>>", sortFilter);
    const itemsPerPage = parseInt(req.body.itemsPerPage) || 10;
    const page = parseInt(req.body.page) || 1;
    const categoryName = JSON.parse(req.body.categoryName);
    //console.log("categoryName>>", categoryName);
    const perpage = 15
    //price sorting
    let sortDirection = 1; // Default ascending
    if (sortFilter === 'heighToLow') {
      sortDirection = -1; // Descending
    }

    const productByCata = await productsModel
      .find({
        availability: true,
        $and: [
          { category: { $in: categoryName } }, // Match products in selected categories
          { p_name: { $regex: searchInput, $options: 'i' } } // Match products with names containing the search input (case-insensitive)
        ]
      })
      .sort({ price: sortDirection })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);
    // const productByCata = await productsModel.find({ availability: true, category: { $in: categoryName } }).sort({ price: sortDirection })
    //   .skip((page - 1) * itemsPerPage)
    //   .limit(itemsPerPage);
   // console.log("productByCata", productByCata);
    const totalPages = Math.ceil(productByCata.length / perpage);
    const currentPage = page;

    const paginationData = { currentPage, totalPages };
   // console.log("paginationHTML>>", paginationData);
    res.json({
      productByCata: productByCata,
      paginationHTML: paginationData
    });

  } catch (error) {
    console.log(error);
    res.json("no data found")
  }
}
//searchFilter
const Search = async (req, res) => {
  try {
    const key = req.query.q;
    //const searchPattern = { $regex: '^' + key, $options: 'i' };

    const products = await productsModel.find({ p_name: { $regex: key, $options: 'i' } }).exec();
    console.log('products>>', products)
    res.json(products);
  } catch (err) {
    console.log(`Error while performing search: ${err}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};


//#SIGN UP 
const signup = (req, res) => {
  res.render('./user/signup', { title: 'e-Commerce', message: "", user: req.session.user });
};

const signupPost = async (req, res) => {
  try {
    const currentDate = new Date()
    const encryptPassword = await pwdEncription(req.body.password);
    const email = req.body.email
    const phone = req.body.phone
    const dataExist = await usersModel.findOne({
      $or: [{ email: email }, { phone: phone }]
    });
    if (!dataExist) {
      const data = {
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        referralCode: generateReferralCode(),
        password: encryptPassword,
        created_at: currentDate
        // referredBy: ""
      }
      if (req.body.referredCode) {
        const referrer = await usersModel.findOne({ referralCode: req.body.referredCode })
        console.log("referrer", referrer)
        if (referrer) {
          data.referredBy = referrer._id
          const rewardAmount = 50; // Adjust the reward amount as needed
          referrer.walletBalance += rewardAmount;

          // Create a wallet history record for the reward
          referrer.wallethistory.push({
            process: 'Referral Reward',
            amount: rewardAmount,
          });
          
          // Save the referrer's updated information
          await referrer.save();
          data.referredBy = referrer._id;
         
        }
      }
      const newUser=await usersModel.create(data)
      if (data.referredBy) {
        const userRewardAmount = 10; // Adjust the user reward amount as needed
        newUser.walletBalance += userRewardAmount;
  
        // Create a wallet history record for the user's reward
        newUser.wallethistory.push({
          process: 'Referral Reward',
          amount: userRewardAmount,
        });   
  
        // Save the user's updated information
        await newUser.save();
      }
  
      
      // OTP CODE 
      res.redirect('/otp')
     // res.redirect('/');
    }
    else {
      res.render('user/signUp', { title: 'e-Commerce', message: "Please Use a Uniqe Email ID and Phone Number", user: req.session.user })
    }

  }
  catch (err) {
    console.log(err)
  }
};

const generateReferralCode = () => {
  const uuid = uuidv4().replace(/-/g, ''); // Remove dashes
  return 'REF' + uuid.substr(0, 4);
};

const validation = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userData = await usersModel.findOne({ email: email });

    if (userData.status === false) {
      if (userData) {
        const VPWD = await bcrypt.compare(password, userData.password);
        if (VPWD) {
          //const userNumber = userData.phone;
          req.session.phone = userData.phone
          // const number = userNumber;
          // let cartCount;   
          // let signinPage = 0;  

          req.session.user = userData.email
          //for development testing
          //res.redirect('/');
          res.redirect("/otp");
        } else {
          //const cart = userData.cart.items;
          //const cartCount = cart.length;
          res.render("user/login", { title: 'e-Commerce', message: "Check Your Password", user: req.session.user })
        }

      } else {
        res.render('user/login', { title: 'e-Commerce', message: "Check Your Email", user: req.session.user, cartCount })
      }



    }
    else {
      res.render('user/login', { title: 'e-Commerce', message: "Please Contact Your Admin You Are Not Allowed To Use This Account AnyMore", user: req.session.user })
    }

  }
  catch (error) {
    console.log(error);
    res.render('user/login', { title: 'e-Commerce', message: "Please Use proper credentials", user: req.session.user })
    //res.render('./user/index', { title: 'e-Commerce',message:" Login page" });
  }
}


//FORGOT PASSWORD for login page
const forgotPassword = async (req, res) => {
  try {
    res.render("user/forgotPassword", { user: req.session.user, message: "", title: "e-Commerce" })
  } catch (error) {
    console.log(error);
  }
}
const numberValidation = async (req, res) => {
  try {
    const number = req.body.number;
    req.session.userNumber = number;
    const userExist = await usersModel.findOne({ phone: number });
    if (userExist) {
      res.redirect("/otp");
    } else {
      const msg = "Please Enter The Currect Number";
      res.render("user/forgotPassword", { user: req.session.user, message: msg, title: "e-Commerce" })
    }
  } catch (error) {
    const msg = "Server Error Wait for the Admin Response";
    let cartCount;
    console.log("error At the number validation inreset place" + error);
    res.status(500).render("user/forgotPassword", { user: req.session.user, message: msg, title: "e-Commerce" })
  }
}


//PRODUCT DETAILED VIEW
const detaildView = async (req, res, next) => {
  const userData = await usersModel.findOne({ email: req.session.user });
  const id = req.params.id;
  const singleProductDtl = await productsModel.findOne({ _id: id })
  const rating = singleProductDtl.ratings
  res.render('user/singleProductDtl', { title: 'e-Commerce', message: "", products: singleProductDtl, rating, user: req.session.user })
}

//CART
const cartDtls = async (req, res) => {
  try {

    const user = req.session.user
    const userEmail = req.session.user
    const userDetails = await usersModel.findOne({ email: userEmail })
    const cartItems = userDetails.cart
    const cartCount = cartItems.length
    const cartProductIds = cartItems.map(item => item.productId);
    const cartProducts = await productsModel.find({ _id: { $in: cartProductIds } });
    const productsPrice = cartItems.reduce((total, item) => total + parseFloat(item.price), 0);
    await usersModel.updateOne(
      { email: userEmail },
      { $set: { 'cart.$[].totalPrice': productsPrice } }
    );

    const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

    // const coupons= await couponModel.find({},{couponName:1,couponValue:1})
    let totalPrice = 0;
    for (const item of cartItems) {
      const product = cartProducts.find(prod => prod._id.toString() === item.productId.toString());
      if (product) {
        totalPrice += item.quantity * product.price;
      } else {
        console.log(`Product not found for item: ${item.productId}`);
      }
    }
    const discount = Math.abs(totalPrice);
    res.render('user/cart', { title: 'e-Commerce', message: "", user: req.session.user, cartCount, cartItems, cartProducts, productsPrice, totalQuantity, totalPrice, discount })
  } catch (error) {
    console.log(error)
    res.status(500).send("Internal error from cart side");
  }

}


//coupon calculation
const couponCalcu = async (req, res) => {
  const selectedCoupon = req.body.coupon;

  const coupon = await couponModel.find({ couponName: selectedCoupon });

  if (coupon.length === 0) {
    // Coupon not found
    return res.json({
      success: false,
      discountAmount: 0,
      message: 'Coupon code not valid.',
      cartItems: userDetails.cart, // Send the current cart items (unchanged)
    });
  }

  const disc_perc = parseFloat(coupon[0].disc_Perc); // Convert to a floating-point number
  const minValue = parseFloat(coupon[0].minValue); // Convert to a floating-point number
  const expiryDate = coupon[0].expiryDate;

  const userEmail = req.session.user;
  const userDetails = await usersModel.findOne({ email: userEmail });
  const cartItems = userDetails.cart;
  // Initialize total price before discount
  let totalPrice = 0;
  let disc = 0
  // Iterate through the cart items and update the totalPrice for each item
  for (const cartItem of cartItems) {
    // Ensure cartItem.totalPrice is a number
    const itemTotalPrice = parseFloat(cartItem.totalPrice);
    // Check if itemTotalPrice is a valid number
    if (!isNaN(itemTotalPrice)) {
      // Update the totalPrice for the item based on the discount
      cartItem.couponDisc = itemTotalPrice * (disc_perc / 100);
      disc = cartItem.couponDisc
      totalPrice = cartItem.totalPrice
    }
  }

  // Save the changes to the user's document
  await userDetails.save();
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const day = currentDate.getDate().toString().padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  if (totalPrice >= minValue && formattedDate <= expiryDate) {
    // Respond with the discount amount and the updated cart items
    res.json({
      success: true,
      discountAmount: parseInt(disc),
      cartItems: userDetails.cart, // Send the updated cart items
    });
  } else {   
    // Coupon not found or doesn't meet the criteria
    res.json({
      success: false,
      discountAmount: 0,
      message: 'Coupon not valid.',
      cartItems: userDetails.cart, // Send the current cart items (unchanged)
    });
  }
};

//ADD PRODUCTS TO CART     
const addtoCart = async (req, res) => {
  try {
    const prodId = req.params.id
    const email = req.session.user
    const userDtl = await usersModel.findOne({ email: email })
    const productDtl = await productsModel.findOne({ _id: prodId })
    const cartItems = userDtl.cart
    console.log("prodId>>", prodId);
    const existingCartItem = cartItems.find(item => item.productId.toString() === prodId)
    console.log("existingCartItem>>", existingCartItem);
    const productPrice = productDtl.price
    const productName = productDtl.p_name
    if (existingCartItem) {
      // existingCartItem.quantity += 1;
      // existingCartItem.price = existingCartItem.quantity * productPrice;
      res.send(JSON.stringify("Product already exist"));
    }
    else {
      const newCartItem = {
        productId: req.params.id,
        quantity: 1,
        p_name: productName,
        price: productDtl.price,
        originalprice: productDtl.originalprice,
        productStock: productDtl.productStock - 1
      }
      productDtl.productStock - 1
      const update = await usersModel.updateOne({ email: email }, { $push: { cart: newCartItem } })
      res.send(JSON.stringify("Product Successfully Added to Your Cart"));
      await productDtl.save()

    }

    await userDtl.save()
    //console.log(update);
    //res.redirect('/cart')
  }
  catch (error) {
    console.log(error)
    res.render('404error');
  }


}
//CART QUANTITY UPDATE  
const cartQuantityUpdate = async (req, res) => {
  try {
    const cartId = req.params.id;
    console.log("cartId>>", cartId);
    const data = Number(req.body.quantity);
    console.log("data>>", data);
    const user = req.session.user;
    const userDetails = await usersModel.findOne({ email: user });

    const cartItems = userDetails.cart.find(item => item._id.toString() === cartId.toString());
    const CartProductIds = cartItems.productId.toString();
    console.log("CartProductIds>>", CartProductIds);

    const product = await productsModel.find({ _id: { $in: CartProductIds } });
    console.log("product>>", product);

    const ProQuantity = product.map(item => item.productStock - data);
    const productPrice = product.map(item => item.price);
    console.log("ProQuantity>>", ProQuantity[0]);
    const cartQuantityPre = data
    const CartQuantity = ProQuantity[0]
    const count = CartQuantity - cartQuantityPre;
    if (product.quantity >= count) {
      product.quantity -= count;
      await product.save();
    }
    const cartPrice = productPrice[0] * cartQuantityPre;
    cartItems.price = cartPrice
    cartItems.quantity = data
    await userDetails.save();
    let grantTotal = userDetails.cart.reduce((total, item) => total + item.price, 0);
    const total = userDetails.cart.reduce((total, item) => total + item.price, 0);
    //console.log(total)

    //const discount = grantTotal - total;

    res.json({ cartPrice, grantTotal: 0, total, discount: 0, ProQuantity });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'An error occurred while updating the quantity.' });
  }
};

//DELETE CART ITEMS
const deleteFromCart = async (req, res) => {
  try {
    const user = req.session.user
    const id = req.params.id
    const cartProduct = await usersModel.updateOne({ email: user }, { $pull: { cart: { _id: id } } })
    res.redirect('/cart')
  } catch (error) {
    console.log(error)
  }
}

const wishlistLoading = async (req, res) => {

  try {
    const user = req.session.user
    const userDtl = await usersModel.findOne({ email: user })
    const wishlist = userDtl.wishlist
    const productIds = wishlist.map(item => item.productId)
    const productDetails = await productsModel.find({ _id: { $in: productIds } })
    res.render('user/wishlist', { title: "", message: "", productDetails, user })
  } catch (error) {
    console.log(error);
  }
}

const addToWishlist = async (req, res) => {
  try {
    const prod_ID = req.params.id
    //const productDetails=await productsModel.findOne({_id:prod_ID})
    const user = req.session.user
    const userDtls = await usersModel.findOne({ email: user })
    const wishlistItems = userDtls.wishlist
    const productExist = wishlistItems.map(item => item.productId.toString() === prod_ID)
    console.log("productExist>>", productExist[0]);
    if (productExist === true) {
      res.send(JSON.stringify("Product already exist"));
    }
    else {
      const wishlist = { productId: prod_ID }
      userDtls.wishlist.push(wishlist)
      await userDtls.save()
      res.send(JSON.stringify("Added to Wishlist"));
    }
  } catch (error) {
    console.log(error);
  }
}

const deleteFromWishlist = async (req, res) => {
  try {
    const prodId = req.params.id
    const user_email = req.session.user
    const userDtls = await usersModel.findOne({ email: user_email })
    const wishlistDtls = userDtls.wishlist.filter(item => item.productId.toString() !== prodId)
    //console.log("prodID>>",prodId)
    //console.log("wishlistDtls>>",wishlistDtls);
    userDtls.wishlist = wishlistDtls
    userDtls.save()
    res.redirect('/wishlist')
  } catch (error) {
    console.log(error);
  }
}

const wishlistToCart = async (req, res) => {
  try {
    const prodId = req.body.productId
    console.log(prodId);
    const email = req.session.user
    const userDtl = await usersModel.findOne({ email: email })
    const productDtl = await productsModel.findOne({ _id: prodId })
    const cartItems = userDtl.cart
    console.log("prodId>>", prodId);
    const existingCartItem = cartItems.find(item => item.productId.toString() === prodId)
    console.log("existingCartItem>>", existingCartItem);
    const productPrice = productDtl.price
    const productName = productDtl.p_name
    if (existingCartItem) {
      // existingCartItem.quantity += 1;
      // existingCartItem.price = existingCartItem.quantity * productPrice;
      console.log("exist");
      res.send(JSON.stringify({ message: "Product already exist" }));
    }
    else {
      console.log("not exist");
      const newCartItem = {
        productId: prodId,
        quantity: 1,
        p_name: productName,
        price: productDtl.price,
        originalprice: productDtl.originalprice,
        productStock: productDtl.productStock - 1

      }
      productDtl.productStock - 1
      const update = await usersModel.updateOne({ email: email }, { $push: { cart: newCartItem } })
      res.send(JSON.stringify({ message: "successfully cart your product" }))
      await productDtl.save()
    }
    await userDtl.save()
    //console.log(update);
    //res.redirect('/cart')
  }
  catch (error) {
    console.log(error)
    res.render('/404error');
  }



}
//CHECKOUT PAGE
const checkout = async (req, res) => {
  try {
    const selectedCoupon = req.query.selectedCoupon;
    console.log("selectedCoupon>>", selectedCoupon)
    const user = req.session.user
    const userEmail = req.session.user
    const userDetails = await usersModel.findOne({ email: userEmail })
    const cartItems = userDetails.cart
    console.log("cartItems>>", cartItems[0])
    const cartCount = cartItems.length
    console.log("cartCount", cartCount)
    const userAdress = userDetails.address
    const currentUserID = userDetails._id;
    const cartProductIds = cartItems.map(item => item.productId.toString());
    const quantity = cartItems.map(item => item.quantity)
    const cartProducts = await productsModel.find({ _id: { $in: cartProductIds } });
    let totalP_Price = cartItems.reduce((total, items) => total + parseFloat(items.originalprice * items.quantity), 0);
    // totalP_Price=Math.abs(totalP_Price*quantity)
    const coupons = await couponModel.find({isAvailable:true}, { couponName: 1, disc_Perc: 1 })
    const couponDisc = cartItems.map(item => item.couponDisc) ? cartItems.map(item => item.couponDisc) : 0
    console.log("couponDisc>>", couponDisc)
    let totalPrice = 0;
    cartItems.map(item => totalPrice += item.price);
    console.log("Grant Totall>>", totalPrice)
    console.log("totalP_Price>>", totalP_Price)
    console.log("totalPrice>>", totalPrice)

    const discount = Math.abs(totalP_Price - totalPrice)
    res.render('user/account/billing', {
      title: 'e-Commerce', message: "", user: req.session.user, cartItems,
      userAdress, cartProducts, discount, totalP_Price, totalPrice, cartCount, coupons
    })
  } catch (error) {
    console.log(error)
  }
}

//ADDING ADDRESS IN CHECKOUT PAGE
const addressAdding = async (req, res) => {
  try {
    const email = req.session.user;
    const { name, houseName, street, city, state, phone, postalCode } = req.body;

    const userData = await usersModel.findOne({ email: email });

    if (!userData) {
      return console.log("User not found")
    }
    const newAddress = {
      name: name,
      houseName: houseName,
      street: street,
      city: city,
      state: state,
      phone: phone,
      postalCode: postalCode
    };
    userData.address.push(newAddress);
    await userData.save();
    res.redirect('/checkOutPage');
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
}

//ORDER PRODUCT BY PAYING 
const orderSuccess = async (req, res) => {
  try {
    const currentDate = new Date();
    const data = req.body
    const email = req.session.user;
    const foundUser = await usersModel.findOne({ email: email });
    const cartItems = foundUser.cart;
    console.log("cartItems>>", cartItems);
    const cartProductIds = cartItems.map(item => item.productId.toString());
    console.log("cartProductIds>>", cartProductIds)
    const cartProducts = await productsModel.find({ _id: { $in: cartProductIds } });
    console.log("cartProducts>>", cartProducts)
    const userId = foundUser._id;
    const addressId = data.selectedAddress;
    const method = data.method;
    console.log("method", method)
    const coupon = parseInt(cartItems.map(item => item.couponDisc))
    console.log("coupon>>>>", coupon)
    const amount = data.amount - coupon ? data.amount - coupon : data.amount;

    console.log("amount", amount)
    // Data collecting for db Storing
    const productData = cartProducts.map(product => {
      const cartItem = cartItems.find(item => item.productId.toString() === product._id.toString());
      const quantity = cartItem ? cartItem.quantity : 0;
      return {
        productId: product._id,
        p_name: product.p_name,
        realPrice: product.price,
        price: amount,
        description: product.description,
        image: product.images,
        category: product.category,
        quantity: quantity
      }
    });
    const deliveryDate = new Date();
    deliveryDate.setDate(currentDate.getDate() + 5);
    newOrder = new orderModel({
      userId: userId,
      address: addressId,
      products: productData,
      payment: {
        method: method,
        amount: amount
      },
      status: "Processing",
      //proCartDetail: cartProducts,
      //cartProduct: cartItems,
      createdAt: currentDate,
      expectedDelivery: deliveryDate
    });
    if (method === "COD") {
      await newOrder.save();
      for (let values of cartItems) {
        for (let products of cartProducts) {
          if (new String(values.productId).trim() == new String(products._id).trim()) {
            products.productStock = products.productStock - values.quantity;
            await products.save()
          }
        }
      }
      foundUser.cart = [];
      await foundUser.save();
      res.json("successFully cod Completed")
    }
    else if (method === "Wallet") {
      const wallet = foundUser.walletBalance;
      console.log("wallet", wallet);
      console.log("amount", amount);
      if (wallet > amount) {
        // Deduct the amount from the wallet balance
        foundUser.walletBalance = wallet - amount;
        await newOrder.save();
        for (let values of cartItems) {
          for (let products of cartProducts) {
            if (new String(values.productId).trim() == new String(products._id).trim()) {
              products.productStock = products.productStock - values.quantity;
              await products.save();
            }
          }
        }
        // wallet history
        foundUser.wallethistory.push({
          process: "Payment",
          amount:   amount
        });
        foundUser.cart = [];
        await foundUser.save();
        res.json("completed payment via Wallet")
        //res.json({ msg: "successfully completed payment via Wallet" });
      } else {
        res.json({ msg: "Recharge your wallet" });
      }
    }

    else if (method === "InternetBanking") {
      var instance = new Razorpay({ key_id: key_Id, key_secret: key_Secret })
      var order = await instance.orders.create({
        amount: amount * 100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: "order_rcptid_11"
      });

      const responseJSON = {
        success: true,
        msg: 'Order Created',
        order_id: order.id,
        amount: amount,
        key_Id: key_Id,
        productName: productData.map(item => item.p_name),
        description: productData.map(item => item.description),
        contact: '9048098002',
        email: 'remy.nisam@gmail.com',
        name: "Remy.M.Ali",
        order: newOrder, // Include the newOrder object here
      };
      res.status(200).json(responseJSON);
    }

    else {
      res.status(400).send("Individual payment")
    }
  } catch (error) {
    console.log('data not comming');
    res.status(500).send('An error occurred While saving data in DB');
  }
}


const cancelOrder = async (req, res) => {
  try {
    const productName = req.query.p_name

    const orderId = req.query.order_Id
    // console.log("productId>>", productId)
    //console.log("productName>>", productName)
    const orderDtls = await orderModel.find({ _id: req.query.order_Id, products: { $elemMatch: { p_name: productName } } })
    console.log("orderDtls>>", orderDtls)
    const prodDtl = orderDtls.map(item => item.products)
    const product = prodDtl[0].find((product) => product.p_name === productName);
    console.log("product.realPrice>>", parseFloat(product.realPrice))
    const paymentMethod = orderDtls[0].payment.method
    const amount = parseFloat(orderDtls[0].payment.amount);
    const userDtl = await usersModel.findOne({ email: req.session.user })
    if (paymentMethod === "Wallet" && userDtl) {
      userDtl.walletBalance += parseFloat(product.realPrice) //amount;
     
      userDtl.wallethistory.push({
        process: "Refund",
        amount: parseFloat(product.realPrice)
      });
      // Save the updated user document
      await userDtl.save();
    }
    console.log("orderId>>", orderId)
    const order = await orderModel.updateOne(
      {
        _id: orderId,
        products: { $elemMatch: { p_name: productName } }
      },
      {
        $set: {
          'products.$.productStatus': false
        }
      }
    );
    console.log('Update result:', order)
    res.redirect('/order')
  }
  catch (err) {
    console.log(err)
  }
}

const returnOrder = async (req, res) => {
  try {
    const productName = req.query.p_name
    const orderId = req.query.order_Id
    const orderDtls = await orderModel.find({ _id: req.query.order_Id, products: { $elemMatch: { p_name: productName } } })
    console.log("orderDtls>>", orderDtls)
    const prodDtl = orderDtls.map(item => item.products)
    const product = prodDtl[0].find((product) => product.p_name === productName);
    console.log("product.realPrice>>", parseFloat(product.realPrice))
    const paymentMethod = orderDtls[0].payment.method
    const amount = parseFloat(orderDtls[0].payment.amount);
    // const userDtl = await usersModel.findOne({ email: req.session.user })
    // if (paymentMethod === "Wallet" && userDtl) {
    //   userDtl.walletBalance += parseFloat(product.realPrice) //amount;

    //   // Save the updated user document
    //   await userDtl.save();
    // }
    const order = await orderModel.updateOne(
      {
        _id: orderId,
        products: { $elemMatch: { p_name: productName } }
      },
      {
        $set: {
          'products.$.productStatus': false,
          orderReturnRequest: true,
          status: "Delivered"
        }
      }
    );
    res.redirect('/order')
  } catch (error) {
    console.log(error)
    res.status(500).send('An error occurred while saving the order and updating');
  }

}

const savingData = async (req, res) => {
  try {
    await newOrder.save();
    const email = req.session.user;
    const userData = await usersModel.findOne({ email: email });
    const cartItems = userData.cart;
    const cartProductIds = cartItems.map(item => item.productId.toString());
    const cartProducts = await productsModel.find({ _id: { $in: cartProductIds } });

    for (let values of cartItems) {
      for (let product of cartProducts) {
        if (String(values.productId).trim() === String(product._id).trim()) {
          product.productStock -= values.quantity;
          await product.save();
        }
      }
    }

    userData.cart = [];
    await userData.save();
    res.json("data is saved")
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while saving the order and updating product quantities');
  }
};
// razerpay implementation end  

//SUCCESS TICK
const successTick = (req, res) => {
  cartCount = 0
  res.render('user/successTick', { title: "Account", succ: "Success.....", user: req.session.user, cartCount })
}

// const ratingValidation=async(req,res)=>{
//  const productName=req.query.productName
//  const orderId=req.query.id
//  const orderDtl= await orderModel.findById(orderId)
//  const userEmail=req.session.user
//  const  userDtls = await usersModel.findOne({email:userEmail})
//  const userId = userDtls._id;
//  console.log("userId",userId)
//  const productDtl=await productsModel.findOne({p_name:productName})
//  const rating =productDtl.ratings;
//  const userRating = rating?rating.find((rating) => rating.userId.toString() === userId.toString()):null
//   if(userRating)
//  {
//   res.json("Already added rating")
//  }
//  const productId=productDtl._id.toString()
//  res.render('user/reviewRating',{ title: '', message: "", products: productDtl,productId, user: req.session.user })

// }
const posteditRating = async (req, res) => {
  try {
    const rating = req.body.rating; // Get the rating value
    const review = req.body.review;
    console.log("rating", rating);
    console.log("review", review);
    const userEmail = req.session.user;
    const productId = req.body.p_Id
    console.log("productId", productId);
    // Find the user's ID based on their email (assuming you have a usersModel)
    const userDtls = await usersModel.findOne({ email: userEmail });
    const userId = userDtls._id;


    const updatedProduct = await productsModel.findOneAndUpdate(
      { _id: productId },
      {
        $set: {
          ratings: {
            userId: userId,
            rating: rating,
            review: review,
          },
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.redirect('/order')
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Internal server error" });
  }
}
const geteditRating = async (req, res) => {
  try {

    const productName = req.params.productName;
    const orderId = req.body.id;
    const foundProduct = await productsModel.findOne({ p_name: productName });
    console.log("foundProduct", foundProduct)
    const productId = foundProduct._id.toString()
    res.render('user/getEditRating', { title: '', message: "", products: foundProduct, productId, user: req.session.user });

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Internal server error" });
  }
}

const deleteReview = async (req, res) => {
  try {
    console.log("hai")
    const productName = req.params.productName
    console.log("productName", productName);
    const productDtl = await productsModel.findOne({ p_name: productName });
    console.log("productDtl", productDtl)
    console.log("ratings", productDtl.ratings)
    productDtl.ratings = []
    productDtl.save()
    res.redirect('/order')

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Internal server error" });
  }
}
const ratingValidation = async (req, res) => {
  try {
    const productName = req.body.productName;
    const orderId = req.body.id;
    console.log("productName", productName)
    console.log("orderId", orderId)
    const orderDtl = await orderModel.findById(orderId);
    const userEmail = req.session.user;
    const userDtls = await usersModel.findOne({ email: userEmail });
    console.log("userDtls", userDtls);
    const userId = userDtls._id;
    console.log("userId", userId);

    const productDtl = await productsModel.findOne({ p_name: productName });
    console.log("productDtl", productDtl);

    if (!productDtl) {
      // Product not found, handle this case appropriately (e.g., send an error response)
      return res.status(404).json({ error: "Product not found" });
    }

    const ratings = productDtl.ratings;
    const userRating = ratings ? ratings.find((rating) => rating.userId.toString() === userId.toString()) : null;
    console.log("ratings", ratings);

    if (ratings.length > 0) {
      // Rating already exists, show SweetAlert
      return res.json({ message: "exists" });
    }
    else {
      const productId = productDtl._id.toString();
      // Include the product data in the query parameters of the URL
      const redirectUrl = `/reviewRating?productName=${productName}`;
      return res.json({ message: "success", redirectUrl });
    }
    //  else{
    //   const productId = productDtl._id.toString();

    //   // Render the rating view
    //   res.render('user/reviewRating', { title: '', message: "", products: productDtl, productId, user: req.session.user });
    //  }
  } catch (error) {
    // Handle any errors that occur during database queries or rendering
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getreview = async (req, res) => {
  try {
    const productName = req.query.productName
    const foundProduct = await productsModel.findOne({ p_name: productName });
    const productId = foundProduct._id.toString()
    res.render('user/reviewRating', { title: '', message: "", products: foundProduct, productId, user: req.session.user });
  } catch (error) {
    console.log(error)
  }
}


const addingReview = async (req, res) => {
  try {
    const rating = req.body.rating; // Get the rating value
    const review = req.body.review;
    console.log("rating", rating);
    console.log("review", review);
    const userEmail = req.session.user;
    const productId = req.body.p_Id
    console.log("productId", productId);
    // Find the user's ID based on their email (assuming you have a usersModel)
    const userDtls = await usersModel.findOne({ email: userEmail });
    const userId = userDtls._id;


    const updatedProduct = await productsModel.findOneAndUpdate(
      { _id: productId },
      {
        $push: {
          ratings: {
            userId: userId,
            rating: rating,
            review: review,
          },
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.redirect('/order')

    // // Return a success response or perform any other actions you need
    // res.status(200).json({ message: 'Rating and review added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


//profile 
const profile = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await usersModel.findOne({ email: user })
    console.log("userData", userData)
    const cart = userData.cart
    const cartCount = cart.length
    res.render('user/profile', { title: "Profile", user, userData, cartCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const profileUpdate = async (req, res) => {
  try {
    const user = req.session.user
    const userData = await usersModel.findOne({ email: user })
    const cart = userData.cart
    const cartCount = cart.length
    const { username, email, phone, password, password1, password2 } = req.body
    if (password1 !== password2) {
      res.render('/profile', { title: "Profile", user, userData, error: "Check the password currectly" });
    }
    const isMatch = await bcrypt.compare(password, userData.password);
    if (isMatch) {
      const encryptedPwd = await pwdEncription(password1);
      userData.name = username,
        userData.email = email,
        userData.number = phone,
        userData.password = encryptedPwd;
      await userData.save();
      req.session.user = userData.email
      res.render('user/profile', { title: "Profile", user, userData, success: "Successfully Updated", cartCount });
    } else {
      res.render('user/profile', { title: "Profile", user, userData, error: "Please check Your Current Password & Updated Email ID", cartCount });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

//PROFILE CONTROLL       
const profileAddress = async (req, res) => {
  try {
    const user = req.session.user
    const userEmail = req.session.user
    const userDetails = await usersModel.findOne({ email: userEmail })
    const cart = userDetails.cart
    const cartCount = cart.length
    const userAdress = userDetails.address
    res.render('user/account/address', { title: 'e-Commerce', message: "", user, cartCount: cartCount, userAdress })
  } catch (error) {
    console.log(error)
  }
}

//ORDER HISTORY
const loadorders = async (req, res) => {
  try {
    const user = req.session.user
    const userDtl = await usersModel.findOne({ email: req.session.user }, { cart: 1 });
    if (userDtl) {
      const pageNum = parseInt(req.query.page) || 1
      const perpage = 1
      const user_Id = userDtl._id.toString()
      //console.log(user_Id)
      const orderOfUser = await orderModel.find({ userId: user_Id }).sort({ createdAt: -1 }).skip((pageNum - 1) * perpage).limit(perpage);
      console.log("orderOfUser", orderOfUser);
      const cartData = userDtl.cart;
      const cartcount = cartData.length;
      if (orderOfUser.length > 0) {
        const productNames = orderOfUser[0].products.map(item => item.p_name);
        const prodDtl = await productsModel.find({ p_name: { $in: productNames } });
        const ratingDtls = prodDtl.map(product => !!product.ratings.length);
        
        res.render('user/orderdetails', { title: 'e-Commerce', message: "", user: req.session.user, orders: orderOfUser, cartcount, ratingDtls });
      } else {
        // Handle the case where there are no orders for this user
        res.render('user/orderdetails', { title: 'e-Commerce', message: "No orders found.",user: req.session.user, orders: orderOfUser, cartcount, ratingDtls:null });
      }
      // const productNames = orderOfUser[0].products.map(item => item.p_name)   
      // console.log("productNames", productNames);
      // const prodDtl = await productsModel.find({ p_name: { $in: productNames } })
      // const ratingDtls = prodDtl.map(product => !!product.ratings.length);
      // console.log("ratingDtls", ratingDtls);
      // const cartData = userDtl.cart;
      // let cartcount = cartData.length;
      // //console.log('orderOfUser>>', orderOfUser);
      // res.render('user/orderdetails', { title: 'e-Commerce', message: "", user: req.session.user, orders: orderOfUser, cartcount, ratingDtls });
    }
  }
  catch (err) {
    console.log(err);
  }
}

//ADDING ADDRESS FROM PROFILE
const newAddress = async (req, res) => {
  try {
    const email = req.session.user;
    const { name, houseName, street, city, state, phone, postalCode, AddressId } = req.body;
    const userData = await usersModel.findOne({ email: email });
    const exisitingAddress = userData.address.find((data) => data._id.toString() === req.body.AddressId);

    if (exisitingAddress) {
      exisitingAddress.name = name;
      exisitingAddress.houseName = houseName;
      exisitingAddress.street = street;
      exisitingAddress.city = city;
      exisitingAddress.state = state;
      exisitingAddress.phone = phone;
      exisitingAddress.postalCode = postalCode;
    } else {
      const newAddress = {
        name: name,
        houseName: houseName,
        street: street,
        city: city,
        state: state,
        phone: phone,
        postalCode: postalCode
      };
      userData.address.push(newAddress);
    }
    await userData.save();
    res.redirect('/address');

  } catch (error) {
    console.log(error)
  }
}

//EDIT ADDRESS
const editAddress = async (req, res) => {
  try {
    const user = req.session.user;
    const addressId = req.body.selectedAddress;
    const userDetails = await usersModel.findOne({ email: user });
    const cart = userDetails.cart;
    const cartCount = cart.length;
    const address = userDetails.address;
    //console.log(address)
    const selectedAddress = address.find((data) => data._id.toString() === addressId);
    res.render('user/account/editAddress', { user, title: "Edit Address", selectedAddress, cartCount })

  } catch (error) {
    console.log(error);
  }
}
//ends PROFILE CONTROLL
const Wallet = async (req, res) => {
  try {

    const userDtl = await usersModel.findOne({ email: req.session.user })
    const wallet = userDtl.walletBalance;
    res.render('user/wallet', { title: 'e-Commerce', message: "", user: req.session.user, wallet });
  } catch (error) {
    console.log(error)
  }
}

const loadWalletHistory = async (req, res) => {

  try {
    const userDtl = await usersModel.findOne({ email: req.session.user })
    const userDetails = userDtl.wallethistory
    res.render('user/walletHistory', { title: '', message: "", user: req.session.user, userDetails });
  } catch (error) {
    console.log(error)
  }
}
// const topup=async(req,res)=>{
//   try {
//     const topUpAmount=req.body.topUpAmount
//     const userDtl= await usersModel.findOne({email:req.session.user})
//    const wallet=userDtl.walletBalance=topUpAmount;
//     await usersModel.save()
//    res.render('user/wallet',{ title: 'e-Commerce', message: "", user: req.session.user ,wallet});
//   } catch (error) {
//    console.log(error)
//   }
//  }

const topup = async (req, res) => {
  try {
    const topUpAmount = parseFloat(req.body.topUpAmount);
    const userDtl = await usersModel.findOne({ email: req.session.user });

    // Update the walletBalance field and save the changes
    userDtl.walletBalance += topUpAmount;
    userDtl.wallethistory.push({
      process: "TopUp",
      amount: topUpAmount
    });
    await userDtl.save();

    res.render('user/wallet', {
      title: 'e-Commerce',
      message: "",
      user: req.session.user,
      wallet: userDtl.walletBalance // Pass the updated wallet balance
    });
  } catch (error) {
    console.log(error);
  }
};


//#LOGOUT
const logout = async (req, res) => {
  try {
    req.session.user = null;
    res.render('./user/login', { title: 'e-Commerce', message: "", user: req.session.user });
  }
  catch (err) {
    console.log(err);
  }
}
module.exports = {
  home,
  signup,
  signupPost,
  login,
  validation,
  otpGeneration,
  sendTextMessage,
  verifyOtp,
  detaildView,
  logout,
  shop,
  productFilter,
  Search,
  forgotPassword,
  numberValidation,
  couponCalcu,
  cartDtls,
  profileAddress,
  profile,
  profileUpdate,
  newAddress,
  editAddress,
  addtoCart,
  cartQuantityUpdate,
  deleteFromCart,
  checkout,
  addressAdding,
  orderSuccess,
  cancelOrder,
  returnOrder,
  successTick,
  loadorders,
  savingData,
  wishlistLoading,
  addToWishlist,
  deleteFromWishlist,
  wishlistToCart,
  pdf,
  Wallet,
  loadWalletHistory,
  topup,
  ratingValidation,
  geteditRating,
  addingReview,
  posteditRating,
  deleteReview,
  getreview,
  generateReferralCode
}
