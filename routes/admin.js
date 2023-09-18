var express = require('express');
var router = express.Router();
const multer = require('multer');


// MULTER  
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'productImages'); // Destination folder for uploaded images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname); // Unique filename for each uploaded image
  }
});     
          
const upload = multer({ storage: storage });

//banner multer
// MULTER  
const banner = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'banner'); // Destination folder for uploaded images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname); // Unique filename for each uploaded image
  }
});     
          
const update = multer({ storage: banner });

// ADMIN SIDE ROUTERS
const adminController = require('../controller/adminHelper');
const adminMiddleWare = require('../middleware/admin');
  
/* GET ADMIN LANDING */
router.get('/',adminMiddleWare.isAdmin,adminController.adminLogin)


/* GET DASHBOARD. */
router.get('/dashboard',adminController.dashboard)  
router.post('/dashboard/graph',adminController.graph) 
router.post('/dashboard/graphcategory',adminController.graphcategory)
//router.post('/dashboard/pdf/:id',adminController.pdfDownload)
router.get('/dashboard/salesReport',adminController.salesReport)
router.get('/Pdf',adminController.salesReportPdf)

/* GET ADMIN SIGNIN. */
router.get('/adminLogin',adminController.adminLogin)
router.post('/adminlogin',adminController.adminVerification)

router.get('/adminSignup',adminController.adminSignup)
router.post('/adminSignup',adminController.adminSignupPost) 

/** USER MANAGEMENT*/    
router.get('/userView',adminController.userView)
router.post('/userBlocking/:id', adminController.userBlocking);
router.post('/userUnBlocking/:id', adminController.userUnBlocking);


/**CATEGORY MANAGEMENT */ 
router.get('/category',adminController.categoryDetails)
router.get('/createCategory',adminController.createCategory)  
router.post('/createCategory',adminController.createCategoryPost)
router.post('/unlistCategory/:id',adminController.unlistCategory)
router.post('/listCategory/:id',adminController.listCategory)
//router.post('/deleteCategory/:id',adminController.deleteCategory) 
router.get('/categoryEdit/:id',adminController.editCategory)        
router.post('/categoryEdit',adminController.categoryEditPost)    


/**PRODUCT MANAGEMENT */
router.get('/productView',adminController.productView)  
router.get('/productAdding',adminController.addProduct)
router.post('/productAdding', upload.array('image'),adminController.addProductPost)   
router.get('/productEdit/:id',adminController.editProduct)
router.post('/productEdit',upload.array('image'),adminController.editProductPost) 
router.post('/p_unlist/:id',adminController.prodUnlist) 
router.post('/p_list/:id',adminController.prodlist) 
//router.post('/deleteProduct/:id',adminController.deleteProduct) 

/** ORDER MANAGEMENT*/ 
router.get('/order',adminController.orderList)
router.get('/orderDetails/:id',adminController.orderDetails)
router.post('/changeorderstatus',adminController.changeorderstatus)
router.post('/changeDeliverydate',adminController.changedate)

/** coupon management*/
router.get('/coupon',adminController.couponList) 
router.get('/couponAdding',adminController.addCoupon)
router.post('/couponAdding',adminController.addCouponPost)
// router.post('/couponDelete/:id',adminController.couponRemove)
router.post('/unlistCoupon/:id',adminController.unlistCoupon)
router.post('/listCoupon/:id',adminController.listCoupon)

/** search */
router.post('/productSearch',adminController.productSearch)
router.post('/orderSearch',adminController.orderSearch)



/**Banner management*/ 
router.get('/banner',adminController.bannerView)
router.get('/bannerAdding',adminController.addBanner)
router.post('/bannerAdding',update.array('images'),adminController.addBannerPost)
router.post('/bannerDelete/:id',adminController.bannerDelete)

// logOut
router.get('/logOut', adminController.adminLogout);
  
router.get('*', function (req, res) {   
res.redirect('/admin/dashboard')   
})   
   
module.exports = router;
 