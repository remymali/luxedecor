const mongoose =require('mongoose');

const couponSchema = new mongoose.Schema({
     couponName:{
        type:String,
        require:true,
        unique: true,
        uppercase: true
     },
     disc_Perc:{
        type:Number,
        require:true
     },
     expiryDate:{
        type:String,
        require:true
     },
     minValue:{
        type:Number,
        require:true
     },
     isAvailable: {
      type: Boolean,
      default: true
  }
});

const couponModel  = mongoose.model('coupon',couponSchema);
module.exports = couponModel;