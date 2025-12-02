import { Response } from 'express';
import Audit from '../models/Audit';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

// @desc    Check if audit exists (for duplicate prevention)
// @route   GET /api/audits/check/:vendorId/:period
// @access  Private
export const checkAuditExists = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, period } = req.params;

        const audit = await Audit.findOne({ vendorId, period });

        if (!audit) {
            return res.json({
                success: true,
                exists: false
            });
        }

        return res.json({
            success: true,
            exists: true,
            audit: {
                status: audit.status,
                score: 0, // Will be calculated on frontend
                lastModified: audit.lastModified,
                auditorName: audit.auditorName,
                entryCount: audit.entries.length
            }
        });
    } catch (error) {
        logger.error('Error checking audit existence:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking audit existence'
        });
    }
};

// @desc    Create new audit
// @route   POST /api/audits
// @access  Private
export const createAudit = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, period, entries } = req.body;

        // Check for duplicate
        const existingAudit = await Audit.findOne({ vendorId, period });
        if (existingAudit) {
            return res.status(409).json({
                success: false,
                message: 'An audit already exists for this vendor and period',
                audit: {
                    status: existingAudit.status,
                    lastModified: existingAudit.lastModified
                }
            });
        }

        // Create audit
        const audit = await Audit.create({
            vendorId,
            period,
            entries,
            auditorName: req.user?.name || 'Unknown',
            auditorEmail: req.user?.email || 'unknown@example.com',
            status: 'draft',
            version: 1
        });

        logger.info(`Audit created: ${vendorId}-${period} by ${req.user?.email}`);

        return res.status(201).json({
            success: true,
            data: audit
        });
    } catch (error: any) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An audit already exists for this vendor and period'
            });
        }

        logger.error('Error creating audit:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating audit',
            error: error.message
        });
    }
};

// @desc    Get audit by vendor and period
// @route   GET /api/audits/:vendorId/:period
// @access  Private
export const getAudit = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, period } = req.params;

        const audit = await Audit.findOne({ vendorId, period });

        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        return res.json({
            success: true,
            data: audit
        });
    } catch (error) {
        logger.error('Error fetching audit:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching audit'
        });
    }
};

// @desc    Get all audits
// @route   GET /api/audits
// @access  Private
export const getAllAudits = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, status, startDate, endDate } = req.query;

        const query: any = {};

        if (vendorId) query.vendorId = vendorId;
        if (status) query.status = status;
        if (startDate && endDate) {
            query.period = { $gte: startDate, $lte: endDate };
        }

        const audits = await Audit.find(query).sort({ period: -1, updatedAt: -1 });

        return res.json({
            success: true,
            count: audits.length,
            data: audits
        });
    } catch (error) {
        logger.error('Error fetching audits:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching audits'
        });
    }
};

// @desc    Update audit (save draft)
// @route   PUT /api/audits/:vendorId/:period
// @access  Private  
export const updateAudit = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, period } = req.params;
        const updates = req.body;

        const audit = await Audit.findOne({ vendorId, period });

        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        // Prevent editing finalized audits unless admin
        if (audit.status === 'finalized' && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot edit finalized audit'
            });
        }

        // Update fields
        if (updates.entries) audit.entries = updates.entries;
        if (updates.status) audit.status = updates.status;

        audit.version += 1;
        audit.lastModified = new Date();

        await audit.save();

        logger.info(`Audit updated: ${vendorId}-${period} by ${req.user?.email}`);

        return res.json({
            success: true,
            data: audit
        });
    } catch (error) {
        logger.error('Error updating audit:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating audit'
        });
    }
};

// @desc    Finalize audit
// @route   POST /api/audits/:vendorId/:period/finalize
// @access  Private
export const finalizeAudit = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, period } = req.params;

        const audit = await Audit.findOne({ vendorId, period });

        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        if (audit.status === 'finalized') {
            return res.status(400).json({
                success: false,
                message: 'Audit is already finalized'
            });
        }

        // Validate all entries have data
        const invalidEntries = audit.entries.filter(e => e.auditsDone === 0);
        if (invalidEntries.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot finalize audit with incomplete entries',
                invalidEntries: invalidEntries.map(e => e.kpiId)
            });
        }

        // Validate failed items have comments
        const missingComments = audit.entries.filter(
            e => e.auditsMissed > 0 && !e.commentsForMissed
        );
        if (missingComments.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed items must have comments',
                missingComments: missingComments.map(e => e.kpiId)
            });
        }

        audit.status = 'finalized';
        audit.finalizedAt = new Date();
        audit.version += 1;

        await audit.save();

        logger.info(`Audit finalized: ${vendorId}-${period} by ${req.user?.email}`);

        return res.json({
            success: true,
            data: audit
        });
    } catch (error) {
        logger.error('Error finalizing audit:', error);
        return res.status(500).json({
            success: false,
            message: 'Error finalizing audit'
        });
    }
};

// @desc    Delete audit
// @route   DELETE /api/audits/:vendorId/:period
// @access  Private (Admin only)
export const deleteAudit = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorId, period } = req.params;

        const audit = await Audit.findOne({ vendorId, period });

        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        // Optional: Prevent deletion of old finalized audits
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        if (audit.status === 'finalized' &&
            audit.finalizedAt &&
            audit.finalizedAt < ninetyDaysAgo &&
            req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete finalized audits older than 90 days. Contact administrator.'
            });
        }

        await Audit.deleteOne({ vendorId, period });

        logger.info(`Audit deleted: ${vendorId}-${period} by ${req.user?.email}`);

        return res.json({
            success: true,
            message: 'Audit deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting audit:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting audit'
        });
    }
};
