const adminModel = require('../models/admin');
const usersModel = require('../models/user');
const categoryModel = require('../models/category');
const productsModel = require('../models/products');
const orderModel = require('../models/order');
const couponModel = require('../models/coupon');
const bannerModel=require('../models/banner');
const easyinvoice = require('easyinvoice');
const PDFDocument = require('pdfkit');





const Sharp = require('sharp')
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { Console } = require('console');
//const { default: items } = require('razorpay/dist/types/items');

const userView = async (req, res) => {
    try {

        if (req.session.admin) {
            const userDtls = await usersModel.find()
            res.render('./admin/userView', { title: 'Express', message: "admin dashboard", data: userDtls });
        }
        else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

};
const userBlocking = async (req, res) => {
    try {
        console.log("params>>", req.params.id)
        const userId = req.params.id
        await usersModel.findByIdAndUpdate({ _id: userId }, {
            $set: {
                status: true
            }

        })
        res.redirect('/admin/userView')
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const userUnBlocking = async (req, res) => {
    try {
        console.log("params>>", req.params.id)
        const userId = req.params.id
        await usersModel.findByIdAndUpdate({ _id: userId }, {
            $set: {
                status: false
            }
        })
        res.redirect('/admin/userView')
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
const productView = async (req, res) => {
    try {
        if (req.session.admin) {
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
            ])
            res.render('admin/productView', { title: "Products", admin: req.session.admin, message: "Product DTLS", products })
        }
        else {
            res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const addProduct = async (req, res) => {
    try {
        const category = await categoryModel.find({ isAvailable: true }, { categoryName: 1 })
        res.render('admin/productAdding', { title: "Add Products", admin: req.session.admin, message: "", category })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const addProductPost = async (req, res) => {
    try {
//==,productOffer
        const { p_name, price,originalprice,productStock,productOffer, category, description, quantity, addedby } = req.body;
        const files = req.files;
        //console.log(req.files)
        const filename = files.map(file => file.filename)
        //console.log("filename>>",filename)

        if (!req.files) return next();

        req.body.images = [];
        await Promise.all(
            req.files.map(async file => {
                const newFilename = filename

                await Sharp({
                    create: {
                        width: 48,
                        height: 48,
                        channels: 4,
                        background: { r: 255, g: 0, b: 0, alpha: 0.5 }
                    }
                })
                    .png()
                    .toBuffer()

                req.body.images.push(newFilename);
                //console.log("req.body.images>>",req.body.images);  
            })
        )
        const productExist = await productsModel.find({ p_name: p_name })
        console.log("productExist>>", productExist);
        if (productExist.length===0) {
            const product = {
                productID:'PId-' + uuidv4(),
                p_name: req.body.p_name,
                price: Math.floor(req.body.originalprice * (1 - req.body.productOffer / 100)),
                originalprice:req.body.originalprice,
                productStock:req.body.productStock,
                category: req.body.category,
                productOffer:req.body.productOffer,
                disc_Amount:Math.floor(req.body.originalprice - Math.floor(req.body.originalprice * (1 - req.body.productOffer / 100))),
                //color: req.body.color,
                description: req.body.description,
                //quantity: req.body.quantity,
                images: files.map(file => file.filename)
            };

            // Save the product to the database
            await productsModel.insertMany([product]);

            res.redirect('/admin/productView');
        }
        else {

            const msg = "Product with the same name already exists.";
            const category = await categoryModel.find({ isAvailable: true }, { categoryName: 1 })
            res.render('admin/productAdding', { title: "", admin: req.session.admin, message: msg, category })

        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const editProduct = async (req, res, next) => {
    try {
        const id = req.params.id
        const products = await productsModel.findById({ _id: id })
        const categorydata = await categoryModel.find({}, { categoryName: 1 });
        res.render('admin/productEdit', { title: "", admin: req.session.admin, message: "", products, categorydata })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const editProductPost = async (req, res) => {
    try {
        const files = req.files;
        const existingImages = req.body.existingImages.split(','); // Convert CSV string to an array
        let imagesToDelete = [];
        //     console.log("body",req.body); 
        //    console.log("imagesToDelete",req.body.imagesToDelete);
        if (req.body.imagesToDelete) {
            imagesToDelete = req.body.imagesToDelete; // New field for deleted images

            // Delete the images from the filesystem
            for (const imageToDelete of imagesToDelete) {
                const imagePath = `/productImages/${imageToDelete}`;

                try {
                    await fs.access(imagePath); // Check if the file exists
                    await fs.unlink(imagePath); // Delete the file
                } catch (error) {
                    console.error(`Error deleting ${imagePath}: ${error.message}`);
                }
            }
        }

        // console.log("files>>", files);
        // console.log("existingImages>>", existingImages);

        const updatedImages = [
            ...existingImages.filter(image => !imagesToDelete.includes(image)),
            ...files.map(file => file.filename)
        ];

        const product = {
            p_name: req.body.p_name,
            price:  Math.floor(req.body.originalprice * (1 - req.body.productOffer / 100)),
            originalprice:req.body.originalprice,
            productStock:req.body.productStock,
            category: req.body.category,
            productOffer:req.body.productOffer,
            disc_Amount:Math.floor(req.body.originalprice - Math.floor(req.body.originalprice * (1 - req.body.productOffer / 100))),
            //color: req.body.color,
            description: req.body.description,
            //quantity: req.body.quantity,
            images: updatedImages // Combine existing and new images
        };

        await productsModel.updateOne({ _id: req.body._id }, {
            $set: product
        });

        res.redirect('/admin/productView');
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const prodUnlist = async (req, res) => {
    try {
        const prod_Id = req.params.id
        await productsModel.findByIdAndUpdate({ _id: prod_Id }, {
            $set: {
                availability: false
            }
        })
        res.redirect('/admin/productView')
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const prodlist = async (req, res) => {
    try {
        const prod_Id = req.params.id
        await productsModel.findByIdAndUpdate({ _id: prod_Id }, {
            $set: {
                availability: true
            }
        })
        res.redirect('/admin/productView')
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const categoryDetails = async (req, res, next) => {
    try {
        if (req.session.admin) {
            const categoryDtl = await categoryModel.find()
            res.render('admin/category', { title: "Category", admin: req.session.admin, message: "CATEGORY DTLS", data: categoryDtl })
        }
        else {
            res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
const createCategory = async (req, res) => {
    try {
        res.render('admin/createCategory', { title: "Add Category", admin: req.session.admin, message: "" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
const createCategoryPost = async (req, res) => {

    try {
        const CategoryExist = await categoryModel.find({ categoryName:req.body.categoryName})
        if(CategoryExist.length===0)
        {
        const data = {
            categoryName: req.body.categoryName,
            description: req.body.description,
            isAvailable: req.body.isAvailable
        }
        await categoryModel.insertMany([data])
        res.redirect('/admin/category')
        }
        else{
            const msg="The category already exist"
            res.render('admin/createCategory', { title: "", admin: req.session.admin, message: msg })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const unlistCategory = async (req, res) => {
    try {
        const categoryId = req.params.id
        await categoryModel.findByIdAndUpdate({ _id: categoryId },
            {
                $set: { isAvailable: false }
            })

        res.redirect('/admin/category')
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
const listCategory = async (req, res) => {
    try {
        const categoryId = req.params.id
        await categoryModel.findByIdAndUpdate({ _id: categoryId },
            {
                $set: { isAvailable: true }
            })
        res.redirect('/admin/category')
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
// const deleteCategory= async (req,res)=>{
//     try {

//         await categoryModel.findByIdAndDelete({_id:req.params.id})
//         res.redirect('/admin/category')

//     } catch (error) {
//         console.log(error)
//     }

// }

const editCategory = async (req, res) => {
    try {
        const id = req.params.id
        const category = await categoryModel.findById({ _id: id })
        res.render('admin/categoryEdit', { title: "Edit Category", admin: req.session.admin, message: "", category })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const categoryEditPost = async (req, res) => {
    console.log("hai")
    try {
        console.log("hai")
        console.log(req.body)
        const data = {
            categoryName: req.body.categoryName,
            description: req.body.description,
            isAvailable: req.body.isAvailable
        }
        await categoryModel.findByIdAndUpdate({ _id: req.body._id }, {
            $set: {
                categoryName: req.body.categoryName,
                description: req.body.description,
                isAvailable: req.body.isAvailable
            }
        })
        res.redirect('/admin/category')
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//CouponManagement
const couponList=async(req,res)=>{
    try{
        if (req.session.admin) {
        const coupons=await couponModel.find()
        res.render('admin/coupon', { title: "", admin: req.session.admin, message: "", coupons })
        }
        else {
            res.redirect('/admin/login')
        }
    }catch(error)
    {
        console.log(error);
        res.send(500).json({error:'Internal server error'})
    }
    
}

const addCoupon=async(req,res)=>{
    try {
        res.render('admin/couponAdding', { title: "", admin: req.session.admin, message: "" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
}
const addCouponPost=async(req,res)=>{

    try {
        const data={
        couponName: req.body.couponName,
        disc_Perc:req.body.disc_Perc ,
        minValue:req.body.minValue,
        expiryDate: req.body.expiryDate
        }
        await couponModel.insertMany(data)
        res.redirect('admin/coupon')

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

const couponRemove=async(req,res)=>{

    try {
        
    console.log("req.body>>",req.params.id)
    await couponModel.findByIdAndDelete(req.params.id)
    res.redirect('admin/coupon')
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
}


const listCoupon=async(req,res)=>{
    try {
        const couponId = req.params.id
        await couponModel.findByIdAndUpdate({ _id: couponId },
            {
                $set: { isAvailable: true }
            })

        res.redirect('/admin/coupon')

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

const unlistCoupon=async(req,res)=>{
    try {
        const couponId = req.params.id
        await couponModel.findByIdAndUpdate({ _id: couponId },
            {
                $set: { isAvailable: false }
            })

        res.redirect('/admin/coupon')
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
}
const bannerView=async(req,res)=>{
    try {
        if (req.session.admin) {
        const banners= await bannerModel.find()

        res.render('admin/banner', { title: "", admin: req.session.admin, message: "", banners })
        }
        else {
            res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const addBanner=async (req,res)=>{
    try {
        res.render('admin/bannerAdding', { title: "", admin: req.session.admin, message: "" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
 const addBannerPost=async(req,res)=>{
    try {
        //console.log("banner>>",req.body)
        const{bannerName,description}=req.body
        const files = req.files;
       // console.log("image>>>", files)
        const banner={
            bannerName:bannerName,
            description:description,
            images:files.map(file => file.filename)
        }

        await bannerModel.insertMany(banner)
        res.redirect('/admin/banner');
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
 }

const bannerDelete=async(req,res)=>{
    try {
        // console.log('hai')
        const id=req.params.id
        await bannerModel.findByIdAndDelete(id)
        res.redirect('/admin/banner');
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const orderList = async (req, res) => {
    try {
        if (req.session.admin) {
            const orders = await orderModel.find({});
            //console.log(orders)
            res.render('admin/orderManagement', { title: "Order management", orders, admin: req.session.admin, message: "" });
        }
        else {
            res.redirect('/admin/login')
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const orderDetails = async (req, res) => {
    try {
        console.log("hai");
        const admin = req.session.admin;
        console.log("id>>", req.params.id);
        const orderId = req.params.id;
        const orders = await orderModel.find({ _id: orderId });
        //console.log("order>>",orders);       
        res.render('admin/orderDetails', { title: "Order management", admin: req.session.admin, orders, message: "" })
    } catch (error) {
        console.log(error + "orderdetailing error")
        res.status(500).json({ error: 'Internal server error' });
    }
}
const changeorderstatus = async (req, res) => {
    try {
        const id = req.query.id
        console.log(req.body);
        await orderModel.findByIdAndUpdate({ _id: id }, {
            $set: {
                status: req.body.status
            }
        })

        const orders = await orderModel.find({ _id: id })
        res.render('admin/orderDetails', { title: "Order management", admin: req.session.admin, message: "", orders })
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const changedate = async (req, res) => {
    try {
        const id = req.query.id
        console.log(req.body);
        await orderModel.findByIdAndUpdate({ _id: id }, {
            $set: {
                expectedDelivery: req.body.deliverydate
            }
        })
        const orders = await orderModel.find({ _id: id })
        res.render('admin/orderDetails', { title: "Order management", admin: req.session.admin, message: "", orders })
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const adminLogout = async (req, res) => {
    try {
        req.session.admin = null;
        res.render('admin/adminLogin', { title: "Admin Login", fail: "", admin: req.session.admin, message: "" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const adminLogin = async (req, res) => {
    try {
        res.render('admin/adminLogin', { title: 'Express', fail: "", message: "" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const adminVerification = async (req, res) => {
    try {
        // session=req.session;
        const email = req.body.email;
        const password = req.body.password;
        const adminData = await adminModel.findOne({ email: email });
        if (adminData) {

            console.log(adminData)
            const adminpassword = adminData.password
            if (adminpassword === password) {
                req.session.admin = adminData.email;
                res.redirect('admin/dashboard');
            } else {
                res.render("admin/adminLogin", { fail: "", title: "Admin Login", message: "Ckeck Your Password" })
            }
        } else {
            res.render('admin/adminLogin', { fail: "", title: "Admin Login", message: "Check Your Email" })
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//searchFilter
const productSearch = async (req, res) => {
    try {
        const key = req.body.search;

        const searchPattern = { $regex:  '^' +key, $options: 'i' };

        if (key == ' ') {
            res.redirect('admin/productView')
        }
        else {
            const products = await productsModel.find({ p_name: searchPattern }).exec();
            console.log("products>>",products)
            res.render("admin/productView", { title: "Admin System", products, name: req.session.admin })
        }
    } catch (err) {
        console.log(`Error while performing search: ${err}`);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//searchFilter
const orderSearch = async (req, res) => {
    try {
        const key = req.body.search;
        console.log("key>>", key)
        const searchPattern = { $regex: key, $options: 'i' };
        if (key == ' ') {
            res.redirect('admin/orderManagement')
        }
        else {
            const orders = await orderModel.find({ status: searchPattern });
            //console.log(orders)
            res.render('admin/orderManagement', { title: "Order management", orders, admin: req.session.admin, message: "" });
        }
    } catch (err) {
        console.log(`Error while performing search: ${err}`);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// const salesReportPdf = async (req, res) => {
//     try {    
//       // Fetch orders from the database
//       const order = await orderModel.find({status:"Delivered"});
//       console.log("order",order)
  
//       // Create the data for the PDF invoice
//       const invoiceOptions = {
//         currency: 'USD',
//         taxNotation: 'vat',
//         marginTop: 25,
//         marginRight: 25,
//         marginLeft: 25,
//         marginBottom: 25,
       
//         sender: {
//           company: 'Royal Furnitures',
//           address: 'Aluva',
//           zip: '681371',
//           city: 'Ernakulam',
//           country: 'Kerala',
//           phone: '9048098002',
//         },
//         client: {
//           company: ' ',
//           address: ' ',
//           zip: ' ',
//           city: ' ',
//           country: ' ',
//           phone: ' ',
//         },
//         information: {
//             invoiceNumber: 'INV-12345',
//             invoiceDate: new Date().toISOString().slice(0, 10), // Current date in YYYY-MM-DD format
//             product: [],
//             bottomNotice: 'Thank you for your business!',
//         },
//           products: [],
    
//           bottomNotice: 'Discount: $10',
//           subtotal: 185,
//           total: 175,
//         };
//         order.forEach((data) => {
//             if (data.products && data.products.length > 0) {
//               data.products.forEach((product) => {
//                 invoiceOptions.products.push({
//                   quantity: product.quantity,
//                   description: product.p_name, // Assuming p_name is the product name field
//                   price: product.price, // Include product price
//                   status: 'Delivered',
//                   'tax-rate': 0, // Set tax rate to 0 if there's no VAT
//                 });
//               });
//             }
//           });
          
      
//       const result = await easyinvoice.createInvoice(invoiceOptions);
//       const pdfBuffer = Buffer.from(result.pdf, 'base64');
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.pdf');
//     res.send(pdfBuffer);
//     } catch (error) {
//       console.error(error);
//       res.status(500).send('Internal Server Error: ' + error.message);
//     }
//   };

const salesReportPdf = async(req, res) => {
    try {
        let fs = require('fs');
        let orders =  await orderModel.find();   
        const doc = new PDFDocument({margin: 50})
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline; filename=Report.pdf')
        doc.pipe(res)
        doc.pipe(fs.createWriteStream('Report.pdf'))
        doc.fontSize(12).text('Report ', { align: 'center' });
        doc.text('--------------------------');
        if(req.query.key == 'delivery') {
            orders.forEach((order) => {
                doc.text(`Order Id: ${order._id}`)
                doc.text(`Order Status: ${order.status}`)
                doc.text(`Total Amount: ${order.totalAmount}`)
                doc.text(`Date of Delivery: ${order.expectedDelivery.toLocaleDateString()}`)
                doc.text('--------------------------');
                doc.text( ' ')
                doc.text( ' ')
            })
        } else {
            orders.forEach((order) => {
                doc.text(`Order Id: ${order._id}`)
                doc.text(`Order Status: ${order.status}`)
                doc.text(`Payment Method: ${order.payment.method}`)
                doc.text(`Total Amount: ${order.payment.amount}`)
                doc.text(`Date of Delivery: ${order.expectedDelivery.toLocaleDateString()}`)
                doc.text('--------------------------');
                doc.text( ' ')
                doc.text( ' ')
            })
        }       
        doc.end();
        console.log('PDF report generated successfully.');
    }
    catch (err) {
        console.log(err);
    }
}

// const salesReportPdf = async (req, res) => {
//   try {
//     // Fetch orders from the database
//     const orders = await orderModel.find();
//     let fs = require('fs');

//     // Create a PDF document
//     const doc = new PDFDocument();
//     doc.pipe(fs.createWriteStream('SalesReport.pdf')); // Create the PDF file

//     // Iterate through the orders and add order details to the PDF
//     orders.forEach((order, index) => {
//       // Start a new page for each order except the first one
//       if (index > 0) {
//         doc.addPage();
//       }

//       // Add order information to the PDF
//       doc.fontSize(16).text(`Order ID: ${order._id}`);
//       doc.fontSize(12).text(`Status: ${order.status}`);
//       doc.text(`Payment Method: ${order.payment.method}`);
//       doc.text(`Total Amount: ${order.payment.amount}`);

//       // Add products for this order
//       doc.fontSize(16).text('Products:');
//       order.products.forEach((product) => {
//         doc.fontSize(12).text(`- ${product.description}`);
//         doc.text(`  Quantity: ${product.quantity}`);
//         doc.text(`  Price: ${product.price}`);
//       });

//       // Add spacing between orders
//       if (index < orders.length - 1) {
//         doc.moveDown(2);
//       }
//     });

//     // Finalize PDF file
//     doc.end();

//     // Set the response headers to send the generated PDF as a download
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.pdf');

//     // Stream the PDF to the response
//     const pdfStream = fs.createReadStream('SalesReport.pdf');
//     pdfStream.pipe(res);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error: ' + error.message);
//   }
// };

  

const salesReport=async(req,res)=>{    
    try {
        const order = await orderModel.aggregate([
            {
                $unwind: '$products' // Unwind the products array
            },
            {
                $group: {
                    orderId:{$first:'$_id'},
                    _id: {
                        p_name: '$products.p_name',
                        price: '$products.realPrice',
                        category:'$products.category'
                    },
                    payment: { $first: '$payment.method' },
                    status: { $first: '$status' },
                    count: { $sum: 1 } // Count the number of occurrences
                }
            },
            {
                $project: {
                    _id: 0, // Exclude the _id field
                    p_name: '$_id.p_name',
                    price: '$_id.price',
                    payment: 1,
                    status: 1,
                    orderId:{$toString:'$orderId'},
                    count: 1
                }
            }
        ]);
        
          res.render('admin/salesReport',{ title: " ", orders:order, admin: req.session.admin, message: "" });
        }

    
     catch (error) {
        console.log(error)
    }
}
const dashboard = async (req, res) => {
    try {

        if (req.session.admin) {
            const userData = await usersModel.find()
            const order = (await orderModel.find()).flat();
            const orderedProduct=order.find(item=>item.products)   
            const numberOfProducts = orderedProduct.products.filter(product => product.productStatus === false).length;       
            console.log("orderedProduct>>",orderedProduct);
            console.log("numberOfProducts>>",numberOfProducts);
           // const orderPdf = await orderModel.find({}, { _id: 1, status: 1, payment: 1 })
            //console.log("orderPdf>>",orderPdf)
            const product = await productsModel.find()
            const orderDeliverd = order.filter((data) => data.status === "Delivered");
            const totalAmount = orderDeliverd.reduce((total, product) => total + parseInt(product.payment.amount), 0);
            const totalSales = orderDeliverd.length;
            const totalUser = userData.length;   
            const totalOrder = order.length;
            const totalProduct = product.length;
            const orderCanceled = order.filter((data) => data.status === "Canceled");
            const canceled = numberOfProducts;
            const orderStatus = {};
            // Retrieve all unique status values from the database
            const uniqueStatusValues = [...new Set(order.map((data) => data.status))];
            // Initialize the orderStatus object with the status values
            uniqueStatusValues.forEach((status) => {
                orderStatus[status] = 0;
            });
            // Count the occurrences of each status
            order.forEach((data) => {
                orderStatus[data.status]++;
            });

            const cata = await categoryModel.find();
            res.render('admin/dashboard', {
                title: "Dashboard",
                admin: req.session.admin,
                totalSales,
                totalAmount: totalAmount,
                totalUser,
                canceled,
                totalOrder,
                order,
                totalProduct,   
                cata,
                orderStatus: JSON.stringify(orderStatus),
                message: "admin dashboard"
            })
            // res.render('admin/dashboard', { title: 'Express', message: "admin dashboard" });
        }
        else {
            res.render('admin/adminLogin', { fail: "", title: "Admin Login", message: "" })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const graphcategory= async (req,res)=>{
    console.log("hai")
 const categoryName=req.body.category;
 try {
    // Fetch and aggregate data based on the selected category
    const data = await orderModel.aggregate([
      { $unwind: '$products' },
      {
        $match: {
          'products.category': categoryName,
          'products.productStatus': true 
        }
      },
      {
        $group: {
          _id: '$products.p_name', // Group by product name
          totalPrice: { $sum: '$products.quantity' }
        }
      },
      {
        $project: {
          _id: 0,
          label: '$_id', // Use product name as the label
          value: '$totalPrice'
        }
      },
      {
        $sort: { value: -1 } // Sort by total price in descending order
      }
    ]);

    console.log("data>>", data);
    res.json(data); // Send the data as a JSON response
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
};
 
const graph = async (req, res) => {
  try {
    console.log("req.body",req.body);
   const { categoryname, salesRe, year, month, today } = req.body;
    
     let data 
    if(req.body.salesRe == "Yearly") {
        const targetYear = parseInt(req.body.year)
       
        data = await orderModel.aggregate([
            {
              $match: {
                //status: { $in: ["Delivered", "Returned", "Cancelled","Processing"] },
                // Add your matching conditions here
                createdAt: {
                  $gte: new Date(targetYear, 0, 1),
                  $lt: new Date(targetYear + 1, 0, 1)
                }
              }
            },
            {
              $group: {
                _id: "$status", // Group by status
                count: { $sum: 1 } // Count occurrences of each status
              }
            },
            {
              $project: {
                _id: 0, // Exclude _id field
                label: "$_id", // Create a 'label' field with status value
                value: "$count" // Create a 'value' field with count value
              }
            }
          ]);
          
        console.log("allOrder>>",data);
        res.json(data);
    }
    else if(req.body.salesRe ==='Monthly' )
    {
        const [targetYear, targetMonth] = month.split("-");
      
      const data = await orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(targetYear, targetMonth - 1, 1),
              $lt: new Date(targetYear, targetMonth, 1)
            }
          }
        },
        {
          $group: {
            _id: "$status", // Group by status
            count: { $sum: 1 } // Count occurrences of each status
          }
        },
        {
          $project: {
            _id: 0, // Exclude _id field
            label: "$_id", // Create a 'label' field with status value
            value: "$count" // Create a 'value' field with count value
          }
        }
      ]);

      console.log("data>>", data);
      res.json(data);
    }
    else if(req.body.salesRe ==='Daily')
    {
        data = await orderModel.aggregate([
            {
              $match: {
                // Add your matching conditions here
                createdAt: {
                  $gte: new Date(today), // Start of the given date
                  $lt: new Date(today + 'T23:59:59.999Z') // End of the given date
                }
              }
            },
            {
              $group: {
                _id: "$status", // Group by status
                count: { $sum: 1 } // Count occurrences of each status
              }
            },
            {
              $project: {
                _id: 0, // Exclude _id field
                label: "$_id", // Create a 'label' field with status value
                value: "$count" // Create a 'value' field with count value
              }
            }
          ]);
          console.log("data>>",data);
          res.json(data)
    }
   else{
    data={}
    res.json(data);
   }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// const graph = async (req, res) => {
//     // try {
//     //     const cataValue = req.body.category;
//     //     const orders = await orderModel.find();
//     //     const orderProducts = orders.map(order => order.products.map(product => product)).flat();
//     //     const cataData = orderProducts.filter(item=> item.category[0] ==cataValue);
//     // } catch (error) {
//     //  console.log(error);
//     // }
//     try {
//         // const cataValue = req.body.category;
//         // const orders = await orderModel.find();
//         // //console.log("orders>>",orders);
//         // const orderProducts = orders.map(order => order.products.filter(item => item.category[0] === cataValue)).flat();
//         // console.log("orderProducts>>", orderProducts);
//         // const cataData = orderProducts.filter(item => item.status);
//         // console.log("cataData>>", cataData);
//         // res.json(orderProducts)
//         const cataValue = req.body.category;
//     const orders = await orderModel.find();
//     const orderProducts = orders.map(order => order.products.filter(item => item.category[0] === cataValue)).flat();
//     console.log("orderProducts>>", orderProducts);
//     const cataData = orderProducts.filter(item => item.status);
//     console.log("cataData>>", cataData);
//     const newData = Object.values(cataData);
//     res.json(newData);
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }
const pdfDownload = async (req, res) => {    
    try {                  
        const orderId=req.params.id;    
        console.log("orderId>>",orderId)
        const orderDtl=await orderModel.findOne({_id:orderId})
        console.log("orderDtl>>",orderDtl)
        const userId=orderDtl.userId
        const userDtl=await usersModel.findOne({_id:userId})
       
        console.log("userDtl>>",userDtl)
        

        // let data = {};
        // const result = await easyinvoice.createInvoice(data);
        // await fs.writeFileSync("invoice.pdf", result.pdf, 'base64');
    }
    catch (err) {
        console.log("error in pdf", err)
    }


}

const adminSignup = async (req, res) => {
    try {
        res.render('admin/adminSignup', { title: 'Express', message: "admin Signup" })
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const adminSignupPost = async (req, res) => {
    console.log(req.body)
    try {
        const currentDate = new Date()
        const data = {
            username: req.body.name,
            email: req.body.email,
            phone: req.body.Phone,
            password: req.body.password,
            created_at: currentDate
        }
        await adminModel.insertMany([data])
        res.redirect('/login');
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    userView,
    adminLogout,
    dashboard,
    graph,
    salesReport,
    salesReportPdf,
    pdfDownload,
    adminLogin,
    adminVerification,
    adminSignup,
    adminSignupPost,
    userBlocking,
    userUnBlocking,
    categoryDetails,
    createCategory,
    createCategoryPost,
    unlistCategory,
    listCategory,
    editCategory,
    categoryEditPost,
    productView,
    addProduct,
    addProductPost,
    editProduct,
    editProductPost,
    prodUnlist,
    prodlist,
    orderList,
    orderDetails,
    changeorderstatus,
    changedate,
    productSearch,
    orderSearch,
    graphcategory,
    couponList,
    addCoupon,
    addCouponPost,
    listCoupon,
    unlistCoupon,
    couponRemove,
    bannerView,
    addBanner,
    addBannerPost,
    bannerDelete
}    