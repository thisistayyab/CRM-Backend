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
  const { productname, description, category, price, quantity, salePrice } = req.body;
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
  return res.status(201).json(new ApiResponse(201, product, 'Product added successfully'));
});

// Delete a product
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
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
  return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
}); 