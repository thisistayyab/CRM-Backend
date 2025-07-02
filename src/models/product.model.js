import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
    productname: {
        type:String, 
        required:true,
    },
    description: {
        type:String, 
        required:true,
    },
    category:{
        type:String
    },
    price:{
        type:Number,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    quantity:{
        type:Number,
        required:true,
        min:0
    }
},{timestamps:true})

export const Product = mongoose.model('Product', productSchema)