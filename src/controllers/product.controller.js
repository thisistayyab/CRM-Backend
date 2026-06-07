import { Product } from '../models/product.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// Get all products
export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ createdBy: req.user._id });
  return res.status(200).json(new ApiResponse(200, products, 'Products fetched successfully'));
});

// Add a product
export const addProduct = asyncHandler(async (req, res) => {
  const { productname, description, category, price, quantity, salePrice, location, minStock } = req.body;
  let imageUrl = '';
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.buffer);
    imageUrl = uploadResult?.secure_url;
  }
  if (!productname || !description || !price || !quantity || !imageUrl) {
    throw new ApiError(400, 'All fields including image and price are required');
  }
  const product = await Product.create({
    productname,
    description,
    category,
    price,
    salePrice,
    quantity,
    image: imageUrl,
    createdBy: req.user._id
  });
  // Create inventory item for this product
  try {
    const { Inventory } = await import('../models/inventory.model.js');
    await Inventory.create({
      product: product._id,
      quantity,
      location: location || 'Default',
      minStock: minStock || 1
    });
  } catch {
    // Non-blocking: product created even if inventory sync fails
  }
  return res.status(201).json(new ApiResponse(201, product, 'Product added successfully'));
});

// Delete a product
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  // Also delete the associated inventory item
  try {
    const { Inventory } = await import('../models/inventory.model.js');
    await Inventory.findOneAndDelete({ product: id });
  } catch {
    // Non-blocking
  }
  return res.status(200).json(new ApiResponse(200, product, 'Product deleted successfully'));
});

// Update a product
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { productname, description, category, price, quantity, salePrice } = req.body;
  const updateFields = {};
  if (productname) updateFields.productname = productname;
  if (description) updateFields.description = description;
  if (category) updateFields.category = category;
  if (price) updateFields.price = price;
  if (salePrice) updateFields.salePrice = salePrice;
  if (quantity) updateFields.quantity = quantity;
  const product = await Product.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  // Update inventory quantity if exists
  if (quantity !== undefined) {
    try {
      const { Inventory } = await import('../models/inventory.model.js');
      await Inventory.findOneAndUpdate(
        { product: product._id },
        { quantity },
        { new: true }
      );
    } catch {
      // Non-blocking
    }
  }
  return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
});

// Migration endpoint: create inventory items for all products without one
export const migrateProductsToInventory = asyncHandler(async (req, res) => {
  const { Inventory } = await import('../models/inventory.model.js');
  const products = await Product.find();
  let created = 0;
  for (const prod of products) {
    const exists = await Inventory.findOne({ product: prod._id });
    if (!exists) {
      await Inventory.create({
        product: prod._id,
        quantity: prod.quantity || 0,
        location: 'Default',
        minStock: 1
      });
      created++;
    }
  }
  res.json({ message: `Migration complete. Inventory items created: ${created}` });
}); 