import { Store } from "../models/store.model.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// Get store information for the authenticated user
const getStore = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id

        // Find store by owner (user)
        const store = await Store.findOne({ owner: userId })

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Store not found for this user",
                data: null
            })
        }

        return res.status(200).json({
            success: true,
            message: "Store information retrieved successfully",
            data: store
        })
    } catch (error) {
        throw new ApiError(500, "Error fetching store information")
    }
})

// Create or update store information
const updateStore = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id
        const {
            name,
            logo,
            location,
            address,
            phone,
            email,
            website,
            description,
            businessHours,
            taxId,
            currency,
            timezone
        } = req.body

        // Validate required fields
        if (!name) {
            throw new ApiError(400, "Store name is required")
        }

        // Validate logo size if provided (max 5MB for base64)
        if (logo && logo.length > 5 * 1024 * 1024) {
            throw new ApiError(400, "Logo image is too large. Please use an image smaller than 5MB")
        }

        // Check if store exists for this user
        let store = await Store.findOne({ owner: userId })

        if (store) {
            // Update existing store - user can only have one store
            store.name = name
            store.logo = logo || store.logo
            store.location = location || store.location
            store.address = address || store.address
            store.phone = phone || store.phone
            store.email = email || store.email
            store.website = website || store.website
            store.description = description || store.description
            store.businessHours = businessHours || store.businessHours
            store.taxId = taxId || store.taxId
            store.currency = currency || store.currency
            store.timezone = timezone || store.timezone

            await store.save()
        } else {
            // Create new store - only one store per user
            store = new Store({
                name,
                logo,
                location,
                address,
                phone,
                email,
                website,
                description,
                businessHours,
                taxId,
                currency,
                timezone,
                owner: userId
            })

            await store.save()
        }

        return res.status(200).json({
            success: true,
            message: "Store information updated successfully",
            data: store
        })
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError(500, "Error updating store information")
    }
})

export {
    getStore,
    updateStore
} 