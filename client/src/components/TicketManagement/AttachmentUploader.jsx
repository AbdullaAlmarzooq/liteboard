import React, { useState } from 'react';
import { Upload } from 'lucide-react';


const AttachmentUploader = ({ onAttachmentsChange }) => {
  const [newAttachments, setNewAttachments] = useState([]);
  const [showSizeWarningModal, setShowSizeWarningModal] = useState(false);
  const MAX_FILE_SIZE = 1048576; // 1 MB in bytes

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachmentsPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        if (file.size > MAX_FILE_SIZE) {
          setShowSizeWarningModal(true);
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target.result;
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64String,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newAttachmentsPromises).then(validAttachments => {
      const filteredAttachments = validAttachments.filter(file => file !== null);
      setNewAttachments(filteredAttachments);
      onAttachmentsChange(filteredAttachments);
      // Clear the input value to allow re-uploading the same file
      e.target.value = null;
    });
  };

  const handleRemoveAttachment = (fileToRemove) => {
    const updatedAttachments = newAttachments.filter(file => file !== fileToRemove);
    setNewAttachments(updatedAttachments);
    onAttachmentsChange(updatedAttachments);
  };

  const closeModal = () => {
    setShowSizeWarningModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Container for the styled input */}
      <div className="flex items-center space-x-4">
        <label
          htmlFor="attachment-input"
          className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Upload className="w-4 h-4 mr-2 inline" />
          Choose File
        </label>
        {/* The hidden file input */}
        <input
          id="attachment-input"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden" // Hides the native file input
        />
        {/* Display file names next to the button */}
        {newAttachments.length > 0 && (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {newAttachments.map(file => file.name).join(', ')}
          </span>
        )}
      </div>

      {/* Render the list of NEW attachments */}
      {newAttachments.length > 0 && (
        <div className="space-y-3">
          {newAttachments.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const isDocument = (
              file.type === 'application/msword' ||
              file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.type === 'application/vnd.ms-excel' ||
              file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              file.type === 'application/pdf'
            );
            return (
              <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md flex items-center justify-between bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
                  {isImage && (
                    <img src={file.data} alt="Attachment preview" className="w-16 h-16 object-cover rounded" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                    {isDocument && (
                      <a
                        href={file.data}
                        download={file.name}
                        className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(file)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showSizeWarningModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center dark:bg-gray-800">
            <h3 className="text-lg font-bold text-red-600 mb-4">File Too Large!</h3>
            <p className="text-sm text-gray-700 mb-6 dark:text-gray-300">
              The selected file is too large. Maximum size allowed is 1MB.
            </p>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;