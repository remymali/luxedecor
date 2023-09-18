const mongoose =require('mongoose');

const bannerSchema = new mongoose.Schema({
     bannerId:[{
        type:String
     }],
     bannerName:{
        type:String,
        require:true,
        unique: true
     },
    images: [{
        type: String,
        require: true
    }],
    description: {
        type: String,
        required: true
    },
    availability: {
        type: Boolean,
        required: true,
        default: true
      },
      url:{
        type: String,
        default:'/Shop'
      }
});

const bannerModel  = mongoose.model('banner',bannerSchema);
module.exports = bannerModel;