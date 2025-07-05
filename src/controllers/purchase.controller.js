import { Purchase } from '../models/purchase.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Create a new order
export const createOrder = asyncHandler(async (req, res) => {
    const { orderId, customerName, phoneNumber, customerAddress, item, totalPrice, shippingCharges } = req.body;
    if (!orderId || !customerName || !phoneNumber || !customerAddress || !item) {
        throw new ApiError(400, 'All fields are required');
    }
    // item should be array of {product, quantity, price, salePrice}
    const order = await Purchase.create({ orderId, customerName, phoneNumber, customerAddress, item, totalPrice, shippingCharges, user: req.user._id });
    return res.status(201).json(new ApiResponse(201, order, 'Order created successfully'));
});

// Get all orders
export const getAllOrders = asyncHandler(async (req, res) => {
    const orders = await Purchase.find({ user: req.user._id }).populate('item.product');
    return res.status(200).json(new ApiResponse(200, orders, 'Orders fetched successfully'));
});

// Update an order
export const updateOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateFields = req.body;
    const order = await Purchase.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    return res.status(200).json(new ApiResponse(200, order, 'Order updated successfully'));
});

// Delete an order
export const deleteOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findByIdAndDelete(id);
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    return res.status(200).json(new ApiResponse(200, order, 'Order deleted successfully'));
});

// Cancel an order (set status to 'canceled')
export const cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findByIdAndUpdate(id, { $set: { status: 'canceled' } }, { new: true });
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    return res.status(200).json(new ApiResponse(200, order, 'Order canceled successfully'));
});

// Return an order (set status to 'returned')
export const returnOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findByIdAndUpdate(id, { $set: { status: 'returned' } }, { new: true });
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    return res.status(200).json(new ApiResponse(200, order, 'Order returned successfully'));
}); 