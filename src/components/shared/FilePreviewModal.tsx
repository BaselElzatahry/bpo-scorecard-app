import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { indexedDBService } from '../../services/indexedDB.service';

interface FilePreviewModalProps {
    attachmentId: string;
    fileName: string;
    fileType: string;
    onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    attachmentId,
    fileName,
    fileType,
    onClose
}) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(100);

    // Load file from IndexedDB on mount
    React.useEffect(() => {
        const loadFile = async () => {
            try {
                setIsLoading(true);
                const attachment = await indexedDBService.getAttachment(attachmentId);

                if (!attachment) {
                    setError('File not found');
                    return;
                }

                // Create object URL from Blob
                const url = URL.createObjectURL(attachment.blob);
                setFileUrl(url);
            } catch (err) {
                console.error('Failed to load file:', err);
                setError('Failed to load file');
            } finally {
                setIsLoading(false);
            }
        };

        loadFile();

        // Cleanup: revoke object URL on unmount
        return () => {
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [attachmentId]);

    const handleDownload = async () => {
        if (!fileUrl) return;

        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === '+' || e.key === '=') {
            setZoom(prev => Math.min(prev + 10, 200));
        } else if (e.key === '-') {
            setZoom(prev => Math.max(prev - 10, 50));
        }
    };

    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div
                className="relative max-w-6xl max-h-[90vh] w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{fileName}</h3>
                        <p className="text-sm text-slate-500">{fileType}</p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        {isImage && (
                            <>
                                <button
                                    onClick={() => setZoom(prev => Math.max(prev - 10, 50))}
                                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Zoom Out (−)"
                                >
                                    <ZoomOut size={20} />
                                </button>
                                <span className="text-sm font-medium text-slate-600 w-12 text-center">
                                    {zoom}%
                                </span>
                                <button
                                    onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
                                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Zoom In (+)"
                                >
                                    <ZoomIn size={20} />
                                </button>
                                <div className="w-px h-6 bg-slate-300 mx-2" />
                            </>
                        )}
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Download"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Close (ESC)"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-auto max-h-[calc(90vh-80px)] bg-slate-100 p-6">
                    {isLoading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-keeta-primary" />
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="text-red-500 text-lg font-bold mb-2">Error</div>
                            <div className="text-slate-600">{error}</div>
                        </div>
                    )}

                    {!isLoading && !error && fileUrl && (
                        <>
                            {isImage && (
                                <div className="flex items-center justify-center">
                                    <img
                                        src={fileUrl}
                                        alt={fileName}
                                        className="max-w-full h-auto rounded-lg shadow-lg transition-transform"
                                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                                    />
                                </div>
                            )}

                            {isPdf && (
                                <iframe
                                    src={fileUrl}
                                    className="w-full h-[70vh] rounded-lg shadow-lg"
                                    title={fileName}
                                />
                            )}

                            {!isImage && !isPdf && (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="text-slate-600 mb-4">Preview not available for this file type</div>
                                    <button
                                        onClick={handleDownload}
                                        className="px-4 py-2 bg-keeta-primary text-white rounded-lg hover:bg-keeta-primary/90 transition-colors"
                                    >
                                        Download File
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
