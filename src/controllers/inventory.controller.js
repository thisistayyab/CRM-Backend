import { Inventory } from '../models/inventory.model.js';
import { Product } from '../models/product.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Get all inventory items
export const getAllInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.find().populate('product');
  res.json({ data: inventory });
});

// Get single inventory item
export const getInventoryById = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id).populate('product');
  if (!item) throw new ApiError(404, 'Inventory item not found');
  res.json({ data: item });
});

// Create inventory item
export const createInventory = asyncHandler(async (req, res) => {
  const { product, quantity, location, minStock } = req.body;
  if (!product) throw new ApiError(400, 'Product is required');
  const item = await Inventory.create({ product, quantity, location, minStock });
  res.status(201).json({ data: item });
});

// Update inventory item
export const updateInventory = asyncHandler(async (req, res) => {
  const { quantity, location, minStock } = req.body;

  const updateFields = { lastUpdated: new Date() };
  if (quantity !== undefined) updateFields.quantity = quantity;
  if (location !== undefined) updateFields.location = location;
  if (minStock !== undefined) updateFields.minStock = minStock;

  const item = await Inventory.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true }
  );

  if (!item) throw new ApiError(404, 'Inventory item not found');

  let productUpdateSuccess = true;
  if (quantity !== undefined && item.product) {
    try {
      await Product.findByIdAndUpdate(item.product, { quantity });
    } catch (err) {
      productUpdateSuccess = false;
      console.error('Failed to update product quantity from inventory:', err);
    }
  }

  res.json({ data: item, productUpdated: productUpdateSuccess });
});


// Delete inventory item
export const deleteInventory = asyncHandler(async (req, res) => {
  const item = await Inventory.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Inventory item not found');
  // Also delete the associated product
  if (item.product) {
    await Product.findByIdAndDelete(item.product);
  }
  res.json({ message: 'Inventory item deleted' });
}); 