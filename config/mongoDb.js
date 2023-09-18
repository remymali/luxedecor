const mongoose = require('mongoose')
const db =mongoose.connect('mongodb+srv://remynisam:EPqK8FqqYM37wXC1@cluster0.87w979c.mongodb.net/?retryWrites=true&w=majority')
.then(()=>{
    console.log("Mongo is connected")
}).catch((err)=>{
    console.log(err)
})

module.exports = db
