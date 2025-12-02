import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
};

// Audit validation schemas
export const auditSchemas = {
    create: Joi.object({
        vendorId: Joi.string().required(),
        period: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
        entries: Joi.array().items(
            Joi.object({
                id: Joi.string().required(),
                kpiId: Joi.string().required(),
                categoryId: Joi.string().required(),
                auditsDone: Joi.number().min(0).required(),
                auditsMet: Joi.number().min(0).required(),
                auditsMissed: Joi.number().min(0).required(),
                commentsForMissed: Joi.string().allow(''),
                attachments: Joi.array().items(
                    Joi.object({
                        id: Joi.string().required(),
                        name: Joi.string().required(),
                        type: Joi.string().required(),
                        size: Joi.number().max(5242880).required(),
                        url: Joi.string().required()
                    })
                )
            })
        ).min(1)
    }),

    update: Joi.object({
        entries: Joi.array().items(
            Joi.object({
                id: Joi.string().required(),
                kpiId: Joi.string().required(),
                categoryId: Joi.string().required(),
                auditsDone: Joi.number().min(0).required(),
                auditsMet: Joi.number().min(0).required(),
                auditsMissed: Joi.number().min(0).required(),
                commentsForMissed: Joi.string().allow(''),
                attachments: Joi.array()
            })
        ),
        status: Joi.string().valid('draft', 'finalized', 'appealed')
    }),

    finalize: Joi.object({
        vendorId: Joi.string().required(),
        period: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
    })
};
