import { Router } from 'express';
import { getAllInventory, getInventoryById, createInventory, updateInventory, deleteInventory } from '../controllers/inventory.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/', getAllInventory);
router.get('/:id', getInventoryById);
router.post('/', createInventory);
router.patch('/:id', updateInventory);
router.delete('/:id', deleteInventory);

export { router as inventoryRouter }; 