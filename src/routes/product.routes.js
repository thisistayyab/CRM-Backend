import { Router } from 'express';
import { getAllProducts, addProduct, deleteProduct, updateProduct, migrateProductsToInventory } from '../controllers/product.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import {
  createOrder,
  getAllOrders,
  updateOrder,
  deleteOrder,
  cancelOrder,
  returnOrder,
  getOrderById,
  getOrderStats,
  completeOrder,
  addOrderComment
} from '../controllers/purchase.controller.js';

const router = Router();

router.route('/')
  .get(verifyJWT, getAllProducts)
  .post(verifyJWT, upload.single('image'), addProduct);

router.route('/:id')
  .delete(verifyJWT, deleteProduct)
  .patch(verifyJWT, updateProduct);

// Order routes
router.post('/orders', verifyJWT, createOrder);
router.get('/orders', verifyJWT, getAllOrders);
router.get('/orders/stats', verifyJWT, getOrderStats);
router.get('/orders/:id', verifyJWT, getOrderById);
router.put('/orders/:id', verifyJWT, updateOrder);
router.delete('/orders/:id', verifyJWT, deleteOrder);
router.patch('/orders/:id/cancel', verifyJWT, cancelOrder);
router.patch('/orders/:id/return', verifyJWT, returnOrder);
router.patch('/orders/:id/complete', verifyJWT, completeOrder);
router.post('/orders/:id/comments', verifyJWT, addOrderComment);
router.post('/migrate-inventory', verifyJWT, migrateProductsToInventory);

export { router }; 