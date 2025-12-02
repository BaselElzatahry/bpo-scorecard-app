import express from 'express';
import {
    checkAuditExists,
    createAudit,
    getAudit,
    getAllAudits,
    updateAudit,
    finalizeAudit,
    deleteAudit
} from '../controllers/auditController';
import { protect, authorize } from '../middleware/auth';
import { validateRequest, auditSchemas } from '../middleware/validation';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Check if audit exists (for duplicate prevention)
router.get('/check/:vendorId/:period', checkAuditExists);

// CRUD operations
router.post('/', validateRequest(auditSchemas.create), createAudit);
router.get('/', getAllAudits);
router.get('/:vendorId/:period', getAudit);
router.put('/:vendorId/:period', validateRequest(auditSchemas.update), updateAudit);
router.delete('/:vendorId/:period', authorize('admin', 'auditor'), deleteAudit);

// Finalize audit
router.post('/:vendorId/:period/finalize', finalizeAudit);

export default router;
