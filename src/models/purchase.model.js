import mongoose from 'mongoose'
import { Product } from './product.model.js'

const purchaseSchema = new mongoose.Schema({
    orderId:{
        type:String,
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
    },
    otherExpenses: {
        type: Number,
        default: 0
    },
    comments: [
      {
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
      }
    ],
    orderSource: {
        type: String,
        enum: ['facebook', 'instagram', 'whatsapp', 'phone', 'walk-in', 'other'],
        default: 'other'
    },
    rawMessage: {
        type: String,
        default: ''
    }
}, { timestamps: true })

// Virtual for net profit
purchaseSchema.virtual('netProfit').get(function() {
    // Calculate gross profit from items
    let grossProfit = 0;
    if (Array.isArray(this.item)) {
        grossProfit = this.item.reduce((sum, i) => {
            // Use salePrice if present, else price
            const sale = typeof i.salePrice === 'number' ? i.salePrice : i.price;
            return sum + ((sale - i.price) * i.quantity);
        }, 0);
    }
    if (this.status === 'returned' || this.status === 'canceled') {
        // For returned/canceled, loss is only shippingCharges + otherExpenses
        return -((this.shippingCharges || 0) + (this.otherExpenses || 0));
    }
    return grossProfit - (this.otherExpenses || 0);
});

purchaseSchema.set('toObject', { virtuals: true });
purchaseSchema.set('toJSON', { virtuals: true });

purchaseSchema.index({ user: 1, orderId: 1 }, { unique: true });

export const Purchase = mongoose.model('Purchase', purchaseSchema)