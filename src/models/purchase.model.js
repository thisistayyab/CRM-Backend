import mongoose from 'mongoose'
import { Product } from './product.model'

const purchaseSchema = new mongoose.Schema({
    orderId:{
        type:String,
        unique:true,
        required:true
    },
    customerName:{
        type:String, 
        required:true
    },
    phoneNumber:{
        type:Number,
        required:true
    },
    item:[Product],
    totalPrice:{
        type:Number,
        default:0
    }
})

export const Purchase = mongoose.model('Purchase', purchaseSchema)