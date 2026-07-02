import { X, FileText, Download, Calendar, User } from 'lucide-react';
import { komService, type KOM } from '@/services/komService';

interface ViewKOMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  komData: KOM | null;
}

export function ViewKOMModal({ open, onOpenChange, komData }: ViewKOMModalProps) {
  if (!open || !komData) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: KOM['status']) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'in-progress': 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels = {
      completed: 'Completed',
      pending: 'Pending',
      'in-progress': 'In Progress'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleDownload = async (filePath: string) => {
    try {
      const url = komService.getFileUrl(filePath, false); // false = download mode
      
      // For images, we need to fetch and create blob to force download
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
        // Fetch the image as blob
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Create blob URL and download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filePath.split('/').pop() || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // For other files, use standard download method
        const link = document.createElement('a');
        link.href = url;
        link.download = filePath.split('/').pop() || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: try direct download
      const url = komService.getFileUrl(filePath, false);
      window.location.href = url;
    }
  };

  const isImageFile = (filePath: string): boolean => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '');
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      // Get file extension
      const extension = filePath.split('.').pop()?.toLowerCase();
      
      // For images, use direct inline display
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
        const fileUrl = komService.getFileUrl(filePath, true); // inline=true
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // For Office documents and PDFs, use Microsoft Office Online Viewer
      if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
        const fileUrl = komService.getFileUrl(filePath, true);
        const fullUrl = `${window.location.origin}${fileUrl}`;
        
        // Get viewer URL from backend
        const response = await fetch(
          `/api/kom/viewer?file_url=${encodeURIComponent(fullUrl)}&viewer=microsoft`
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to get viewer URL');
        }
        
        const data = await response.json();
        window.open(data.viewer_url, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // For other files, force download
      handleDownload(filePath);
      
    } catch (error) {
      console.error('Error viewing file:', error);
      // Fallback: try to open file directly
      const fileUrl = komService.getFileUrl(filePath, true);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white shadow-2xl w-full flex flex-col" style={{ 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
        maxHeight: '85vh',
        maxWidth: '900px',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between bg-gradient-to-r from-[#003A70] to-[#0078D7]">
          <div className="flex-1">
            <h3 className="text-white text-xl font-bold">{komData.project_name}</h3>
            <p className="text-blue-200 text-sm mt-1">KOM Details</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(komData.status)}
            <button 
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-gray-50 to-white">
          {/* Date Information */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Start Date</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(komData.kom_start_date)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">End Date</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(komData.kom_end_date)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* KOM Venue */}
          {komData.kom_venue && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Venue (Tempat KOM)</h4>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-900">{komData.kom_venue}</p>
              </div>
            </div>
          )}

          {/* Remarks */}
          {komData.remarks && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Remarks
              </h4>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{komData.remarks}</p>
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </h4>

            {/* KOM MoM File */}
            {komData.kom_mom_file && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 font-medium mb-2">Minutes of Meeting (MoM)</p>
                <div className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {komData.kom_mom_file.split('/').pop()}
                        </p>
                        <p className="text-xs text-gray-500">KOM MoM Document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isImageFile(komData.kom_mom_file!) && (
                        <button
                          onClick={() => handleViewDocument(komData.kom_mom_file!)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(komData.kom_mom_file!)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Documents */}
            {komData.other_docs_files && komData.other_docs_files.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">
                  Other Documents ({komData.other_docs_files.length})
                </p>
                <div className="space-y-2">
                  {komData.other_docs_files.map((filePath, index) => (
                    <div 
                      key={index}
                      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {filePath.split('/').pop()}
                            </p>
                            <p className="text-xs text-gray-500">Document #{index + 1}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isImageFile(filePath) && (
                            <button
                              onClick={() => handleViewDocument(filePath)}
                              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                            >
                              View
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(filePath)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Documents */}
            {!komData.kom_mom_file && (!komData.other_docs_files || komData.other_docs_files.length === 0) && (
              <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No documents uploaded</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Created At</p>
                <p className="text-gray-900 font-medium">{formatDate(komData.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Last Updated</p>
                <p className="text-gray-900 font-medium">{formatDate(komData.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-white">
          <button 
            onClick={() => onOpenChange(false)}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
