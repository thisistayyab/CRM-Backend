import mongoose from 'mongoose'
import { Product } from './product.model.js'

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
    customerAddress: {
        type: String,
        required: true
    },
    item:[{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        price: {
            type: Number,
            required: true
        },
        salePrice: {
            type: Number
        }
    }],
    totalPrice:{
        type:Number,
        default:0
    },
    shippingCharges: {
        type: Number,
        default: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'returned', 'complete'],
        default: 'active'
    },
    trackingNumber: {
        type: String,
        default: ''
    },
    courierCompany: {
        type: String,
        enum: ['TCS', 'Leopard', 'Custom'],
        default: 'Custom'
    }
}, { timestamps: true })

purchaseSchema.index({ user: 1, orderId: 1 }, { unique: true });

export const Purchase = mongoose.model('Purchase', purchaseSchema)