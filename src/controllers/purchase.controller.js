import { Purchase } from '../models/purchase.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Product } from '../models/product.model.js';
import { Inventory } from '../models/inventory.model.js';

// Helper to update inventory for an order
async function adjustInventoryForOrder(order, type = 'decrement') {
  if (!order || !order.item) return;
  for (const i of order.item) {
    if (!i.product || !i.quantity) continue;
    const inv = await Inventory.findOne({ product: i.product });
    if (inv) {
      let newQty = inv.quantity;
      if (type === 'decrement') newQty = Math.max(0, inv.quantity - i.quantity);
      if (type === 'increment') newQty = inv.quantity + i.quantity;
      inv.quantity = newQty;
      await inv.save();
      // Also update the product's quantity
      await Product.findByIdAndUpdate(inv.product, { quantity: newQty });
    }
  }
}

// Create a new order
export const createOrder = asyncHandler(async (req, res, next) => {
    const { orderId, customerName, phoneNumber, customerAddress, item, totalPrice, shippingCharges, trackingNumber, courierCompany, otherExpenses } = req.body;
    if (!orderId || !customerName || !phoneNumber || !customerAddress || !item) {
        throw new ApiError(400, 'All fields are required');
    }
    try {
        // item should be array of {product, quantity, price, salePrice}
        const order = await Purchase.create({ orderId, customerName, phoneNumber, customerAddress, item, totalPrice, shippingCharges, trackingNumber, courierCompany, otherExpenses, user: req.user._id });
        return res.status(201).json(new ApiResponse(201, order.toObject(), 'Order created successfully'));
    } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.orderId) {
            // Duplicate orderId error
            return res.status(409).json({
                success: false,
                message: 'Order ID already exists. Please use a unique Order ID.',
                errors: [],
                data: null
            });
        }
        throw err;
    }
});

// Utility to get order count for a phone number
async function getOrderCountByPhone(phoneNumber) {
    return await Purchase.countDocuments({ phoneNumber });
}

// Get all orders
export const getAllOrders = asyncHandler(async (req, res) => {
    let orders = await Purchase.find({ user: req.user._id }).populate('item.product');
    // Add orderCountForCustomer to each order
    orders = await Promise.all(orders.map(async (order) => {
        const orderCountForCustomer = await getOrderCountByPhone(order.phoneNumber);
        return { ...order.toObject(), orderCountForCustomer };
    }));
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
    return res.status(200).json(new ApiResponse(200, order.toObject(), 'Order updated successfully'));
});

// Delete an order
export const deleteOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findById(id);
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    if (order.status === 'complete') {
        await adjustInventoryForOrder(order, 'increment');
    }
    await Purchase.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, order, 'Order deleted successfully'));
});

// Cancel an order (set status to 'canceled')
export const cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findById(id);
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    if (order.status === 'canceled') {
        return res.status(200).json(new ApiResponse(200, order, 'Order already canceled'));
    }
    // If was complete, re-add inventory
    const wasComplete = order.status === 'complete';
    order.status = 'canceled';
    await order.save();
    if (wasComplete) await adjustInventoryForOrder(order, 'increment');
    return res.status(200).json(new ApiResponse(200, order, 'Order canceled successfully'));
});

// Return an order (set status to 'returned')
export const returnOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findById(id);
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    if (order.status === 'returned') {
        return res.status(200).json(new ApiResponse(200, order, 'Order already returned'));
    }
    // If was complete, re-add inventory
    const wasComplete = order.status === 'complete';
    order.status = 'returned';
    await order.save();
    if (wasComplete) await adjustInventoryForOrder(order, 'increment');
    return res.status(200).json(new ApiResponse(200, order, 'Order returned successfully'));
});

// Get a single order by ID
export const getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findById(id).populate('item.product');
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    // Only allow the user who owns the order to fetch it
    if (order.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized to view this order');
    }
    const orderCountForCustomer = await getOrderCountByPhone(order.phoneNumber);
    return res.status(200).json(new ApiResponse(200, { ...order.toObject(), orderCountForCustomer }, 'Order fetched successfully'));
});

// Get dashboard stats for current and last year
export const getOrderStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    // Helper to get year range
    const getYearRange = (year) => [
        new Date(year, 0, 1, 0, 0, 0),
        new Date(year + 1, 0, 1, 0, 0, 0)
    ];

    // Orders for current and last year
    const [startThis, endThis] = getYearRange(currentYear);
    const [startLast, endLast] = getYearRange(lastYear);

    const ordersThisYear = await Purchase.find({ user: userId, createdAt: { $gte: startThis, $lt: endThis } });
    const ordersLastYear = await Purchase.find({ user: userId, createdAt: { $gte: startLast, $lt: endLast } });

    // Unique customers (by phone) for each year
    const usersThisYear = new Set(ordersThisYear.map(o => o.phoneNumber)).size;
    const usersLastYear = new Set(ordersLastYear.map(o => o.phoneNumber)).size;

    // Products for each year
    const productsThisYear = await Product.countDocuments({ createdBy: userId, createdAt: { $gte: startThis, $lt: endThis } });
    const productsLastYear = await Product.countDocuments({ createdBy: userId, createdAt: { $gte: startLast, $lt: endLast } });

    // Orders and sales (sales only for completed orders)
    const ordersCountThisYear = ordersThisYear.length;
    const ordersCountLastYear = ordersLastYear.length;
    const salesThisYear = ordersThisYear.filter(o => o.status === 'complete').reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const salesLastYear = ordersLastYear.filter(o => o.status === 'complete').reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    return res.status(200).json({
        currentYear: {
            users: usersThisYear,
            products: productsThisYear,
            orders: ordersCountThisYear,
            sales: salesThisYear
        },
        lastYear: {
            users: usersLastYear || 0,
            products: productsLastYear || 0,
            orders: ordersCountLastYear || 0,
            sales: salesLastYear || 0
        }
    });
});

// Add a PATCH endpoint for /orders/:id/complete to set status to 'complete'
export const completeOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Purchase.findById(id);
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    if (order.status === 'complete') {
        return res.status(200).json(new ApiResponse(200, order, 'Order already marked as complete'));
    }
    // Mark as complete and decrement inventory
    order.status = 'complete';
    await order.save();
    await adjustInventoryForOrder(order, 'decrement');
    return res.status(200).json(new ApiResponse(200, order, 'Order marked as complete'));
});

// Add a comment to an order
export const addOrderComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
        throw new ApiError(400, 'Comment text is required');
    }
    const order = await Purchase.findByIdAndUpdate(
        id,
        { $push: { comments: { text, date: new Date() } } },
        { new: true }
    );
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }
    return res.status(200).json(new ApiResponse(200, order.comments, 'Comment added successfully'));
}); 