import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';

interface LogoUploadProps {
    currentLogo?: string;
    onLogoChange: (logo: string | undefined) => void;
    vendorName: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ currentLogo, onLogoChange, vendorName }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string>('');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be smaller than 2MB');
            return;
        }

        // Read and convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            onLogoChange(base64);
            setError('');
        };
        reader.onerror = () => {
            setError('Failed to read image');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        onLogoChange(undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Vendor Logo</label>

            <div className="flex items-center gap-3">
                {/* Logo Preview */}
                {currentLogo ? (
                    <div className="relative group">
                        <img
                            src={currentLogo}
                            alt={`${vendorName} logo`}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-slate-200"
                        />
                        <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                            title="Remove logo"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                        <ImageIcon size={24} className="text-slate-400" />
                    </div>
                )}

                {/* Upload Button */}
                <div className="flex-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="logo-upload"
                    />
                    <label
                        htmlFor="logo-upload"
                        className={clsx(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all",
                            currentLogo
                                ? "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                : "border-keeta-primary text-keeta-primary hover:bg-keeta-primary hover:text-slate-900"
                        )}
                    >
                        <Upload size={16} />
                        <span className="text-sm font-bold">
                            {currentLogo ? 'Change Logo' : 'Upload Logo'}
                        </span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                        PNG, JPG, SVG (max 2MB)
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
};
