import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
    id: string;
    name: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const VendorSchema: Schema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model<IVendor>('Vendor', VendorSchema);
