import mongoose from 'mongoose'

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    logo: {
        type: String,
        default: ""
    },
    location: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    website: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    businessHours: {
        type: String,
        trim: true
    },
    taxId: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        default: "PKR",
        enum: ["PKR", "USD", "EUR"]
    },
    timezone: {
        type: String,
        default: "Asia/Karachi"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    }
}, {
    timestamps: true
})

// Index for faster queries
storeSchema.index({ owner: 1 })

export const Store = mongoose.model('Store', storeSchema) 