var express = require('express');
const userDts = require('../models/user');
var router = express.Router();

// Routers
const userMiddleware = require('../middleware/user');
const userController = require('../controller/userHelper');
// const profileController = require('../controllers/profileControllers');
        
/* GET home page. */ 
router.get('/',  userController.home);//userMiddleware.islogin,userMiddleware.userIsBlocked,

/* GET signup page. */
router.get('/signup', userMiddleware.isLogOut,userController.signup)
/* post signup page. */  
router.post('/signup',userController.signupPost)     

/* login page. */
router.get('/login',userMiddleware.isLogOut,userController.login)  
/* post login page. */
router.post('/login',userController.validation)


/*Success */
router.get('/success', userController.successTick);


//otp
router.get('/otp',userController.otpGeneration)
router.post('/otp',userController.verifyOtp)

//Forgot Password
router.get('/forGotPassword',userController.forgotPassword)
router.post('/numberValidation',userController.numberValidation)

//product detailed view
router.get('/detaildView/:id', userMiddleware.userIsBlocked,  userController.detaildView)

//search
router.get('/search', userController.Search);

//show product
router.get('/shop',userController.shop)
router.post('/productFilter', userController.productFilter); 
  

//cart 
router.get('/cart', userMiddleware.userCheking, userMiddleware.userIsBlocked,userController.cartDtls)
router.post('/getDiscountAmount',userMiddleware.userCheking, userMiddleware.userIsBlocked,userController.couponCalcu)
router.post('/quantityUpdate/:id',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.cartQuantityUpdate)
router.post('/addtoCart/:id',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.addtoCart)
router.post('/cartDelete/:id',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.deleteFromCart)
        
//profile details of user
//address
router.get('/profile',userMiddleware.userCheking,userMiddleware.userIsBlocked,userController.profile)
router.post('/profileUpdate',userMiddleware.userCheking,userMiddleware.userIsBlocked,userController.profileUpdate)
router.get('/address',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.profileAddress)
router.post('/addNewAddress',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.newAddress)
router.post('/editAddress',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.editAddress)
router.post('/updateAddress',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.newAddress)
router.get('/order',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.loadorders);
router.get('/invoice',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.pdf)
router.get('/cancelorder',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.cancelOrder)
router.get('/returnOrder',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.returnOrder)
router.post('/rating',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.ratingValidation)
router.post('/editReview',userMiddleware.userCheking,userMiddleware.userIsBlocked,userController.posteditRating)
router.get('/getEditRating/:productName',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.geteditRating)
router.get('/reviewRating',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.getreview)
router.post('/addReview',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.addingReview)
router.get('/deleteRating/:productName',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.deleteReview)
//END of profile details of user


//CHECKOUT PAGE
router.get('/checkOutPage', userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.checkout)
router.post('/AddressUpdate', userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.addressAdding)
router.post('/CheckOut', userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.orderSuccess)
router.post('/savingData',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.savingData)


//wallet
router.get('/wallet',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.Wallet)
router.post('/topup',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.topup)
router.get('/walletHistory',userMiddleware.userCheking, userMiddleware.userIsBlocked, userController.loadWalletHistory)


//WISHLIST PAGE
router.get('/wishlist',userMiddleware.userCheking, userMiddleware.userIsBlocked,userController.wishlistLoading)
router.post('/wishlist/:id',userMiddleware.userCheking, userMiddleware.userIsBlocked,userController.addToWishlist)
router.get('/wishlist/:id',userMiddleware.userCheking,userMiddleware.userIsBlocked,userController.deleteFromWishlist)
router.post('/wishlistToCart',userMiddleware.userCheking,userMiddleware.userIsBlocked,userController.wishlistToCart)


//logout
router.get('/logout',userController.logout)

  




module.exports = router;
