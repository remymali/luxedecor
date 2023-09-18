const mongoose = require("mongoose");

const productsSchema = new mongoose.Schema({
  productID: {
    type: String,
  },
  p_name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  originalprice: {
    type: String,
    require: true,
  },
  productStock: {
    type: Number,

  },
  productOffer: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true
  },
  disc_Amount:{
    type: String,
    require: true,
  },
  // color: {
  //   type: String,
  //   required: true
  // },
  images: [{
    type: String,
    require: true
  }],
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
  },
  addedby: {
    type: String,
    require: true,
    default:'admin'
  },
  availability: {
    type: Boolean,
    required: true,
    default: true
  },
  ratings: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users", // Reference to the user who gave the rating
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      review: {
        type: String,
      },
    },
  ]
})

const products = mongoose.model('products', productsSchema)
module.exports = products 