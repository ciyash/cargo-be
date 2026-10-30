import auth from "../config/auth.middleware.js";
import express from 'express';
import itemController from '../controllers/item.controller.js';

const router = express.Router();

router.post('/create', auth, itemController.createItem);

router.get('/get', auth, itemController.getItems);

router.get('/items/:id', auth, itemController.getItemById);

router.patch('/items/:id', auth, itemController.updateItem);

router.delete('/items/:id', auth, itemController.deleteItem);

export default router;
