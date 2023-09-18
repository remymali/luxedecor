var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session= require('express-session')
var logger = require('morgan');
var ejs=require('ejs')  
var app = express();

//pORT SETUP
var dotenv=require('dotenv')
dotenv.config({path:'config.env'})
var PORT=process.env.PORT||3000

// SESSION SETTING
app.use(cookieParser());
const key = process.env.KEY;
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: key,
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: true 
}));
  
// CONNECTION FOR DATABASE    
var db=require('./config/mongoDb')



// ROUTER IMPORTING   
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
app.use('/', userRouter);
app.use('/admin', adminRouter);



// VIEW ENGINE SETUP
app.set('views', path.join(__dirname, 'views'));

// EJS SETTING
app.set('view engine', 'ejs');




app.use(logger('dev'));



app.use(function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate');
  next();
});
//ACCESSING PUBLIC ASSETS
app.use(express.static(path.join(__dirname, 'public')));//'../public'
app.use('/assets',express.static(path.join(__dirname,'./public/assets')))
// MULTER IMAGE PATH FOR FROND END
app.use('/productImages', express.static(path.resolve(__dirname, 'productImages')));
// MULTER IMAGE PATH FOR banner 
app.use('/banner', express.static(path.resolve(__dirname, 'banner')));

// catch 404 and forward to error handler  
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });


// PORT LISTEN
app.listen(PORT,()=>{
  console.log(`Server is on port http://localhost:${PORT}`);
})

//module.exports = app;
