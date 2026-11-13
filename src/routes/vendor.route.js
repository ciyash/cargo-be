import auth from "../middleware/auth.middleware.js";
import  VendorController from '../controllers/vendor.controller.js';
import express from 'express';
const router = express.Router();

router.post('/create', auth, VendorController.createVendor);

router.get('/get', auth, VendorController.getAllVendors);

router.get('/:id', auth, VendorController.getVendorById);

router.patch('/:id', auth, VendorController.updateVendor);

router.delete('/:id', auth, VendorController.deleteVendor);

export default router;
