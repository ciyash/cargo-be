import auth from "../middleware/auth.middleware.js";
import express from 'express';
import bankController from '../controllers/bank.controller.js';

const router = express.Router();

router.post('/create', auth, bankController.createBank);

router.get('/get', auth, bankController.getAllBanks);

router.get('/banks/:id', auth, bankController.getBankById);

router.patch('/banks/:id', auth, bankController.updateBank);

router.delete('/banks/:id', auth, bankController.deleteBank);

export default router;
