import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { indexedDBService, AttachmentMetadata } from '../../services/indexedDB.service';

interface AttachmentDisplayProps {
    attachment: AttachmentMetadata;
    onClick?: (url: string) => void;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({ attachment, onClick }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        loadAttachment();

        // Cleanup: revoke object URL when component unmounts
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [attachment.id]);

    const loadAttachment = async () => {
        try {
            setIsLoading(true);
            setError(false);

            const record = await indexedDBService.getAttachment(attachment.id);

            if (!record) {
                setError(true);
                return;
            }

            // Create object URL from Blob
            const url = URL.createObjectURL(record.blob);
            setImageUrl(url);
        } catch (err) {
            console.error('Failed to load attachment:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const isImage = attachment.type.startsWith('image/');

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl">
                <div className="w-8 h-8 border-3 border-slate-300 border-t-keeta-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !imageUrl) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                <FileText size={32} className="mb-2 text-red-400" />
                <span className="text-xs font-medium">Failed to load</span>
            </div>
        );
    }

    if (isImage) {
        return (
            <>
                <img
                    src={imageUrl}
                    alt={attachment.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-900">
                        Click to enlarge
                    </div>
                </div>
            </>
        );
    }

    // Non-image files
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <FileText size={32} className="mb-2" />
            <span className="text-xs font-medium truncate w-full px-2">{attachment.name}</span>
            <span className="text-[10px] text-slate-400 mt-1">
                {(attachment.size / 1024).toFixed(0)}KB
            </span>
        </div>
    );
};
