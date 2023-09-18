const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,        
        unique: true,
        required: true
      },
    description: {
        type: String,
        required: true
      },
    isAvailable: {
      type: Boolean,
      default: true
  }    
  //   created_at:
  //     {
  //         type: Date,
  //         required: true
  //     },
  //   modified_at:
  //     {
  //         type: Date,
  //         required: true
  //     }
})

const category = mongoose.model('category',categorySchema)
module.exports =category 