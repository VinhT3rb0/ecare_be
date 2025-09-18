const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');

router.get('/', medicineController.getAllMedicines);
router.get('/:id', medicineController.getMedicineById);
router.post('/', medicineController.createMedicine);
router.put('/:id', medicineController.updateMedicine);
router.delete('/:id', medicineController.deleteMedicine);
router.post('/update-stock', medicineController.updateMedicineStock);

module.exports = router;
