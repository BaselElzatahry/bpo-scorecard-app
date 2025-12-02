import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedAt: Date;
}

export interface IAuditEntry {
    id: string;
    kpiId: string;
    categoryId: string;
    auditsDone: number;
    auditsMet: number;
    auditsMissed: number;
    commentsForMissed: string;
    attachments: IAttachment[];
}

export interface IAudit extends Document {
    vendorId: string;
    period: string;
    status: 'draft' | 'finalized' | 'appealed' | 'archived';
    entries: IAuditEntry[];
    auditorName: string;
    auditorEmail: string;
    version: number;
    lastModified: Date;
    finalizedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AttachmentSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const AuditEntrySchema = new Schema({
    id: { type: String, required: true },
    kpiId: { type: String, required: true },
    categoryId: { type: String, required: true },
    auditsDone: { type: Number, required: true, min: 0 },
    auditsMet: { type: Number, required: true, min: 0 },
    auditsMissed: { type: Number, required: true, min: 0 },
    commentsForMissed: { type: String, default: '' },
    attachments: [AttachmentSchema]
}, { _id: false });

const AuditSchema: Schema = new Schema({
    vendorId: {
        type: String,
        required: true,
        index: true
    },
    period: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}$/,
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'finalized', 'appealed', 'archived'],
        default: 'draft',
        index: true
    },
    entries: [AuditEntrySchema],
    auditorName: {
        type: String,
        required: true
    },
    auditorEmail: {
        type: String,
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    finalizedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound index for uniqueness
AuditSchema.index({ vendorId: 1, period: 1 }, { unique: true });

// Pre-save middleware to update lastModified
AuditSchema.pre('save', function (next) {
    this.lastModified = new Date();
    next();
});

export default mongoose.model<IAudit>('Audit', AuditSchema);
