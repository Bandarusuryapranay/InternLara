import React, { useRef, useState } from 'react';
import api from '../services/api';

function FileUploader({ onFileUploaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    for (const file of files) {
      try {
        const result = await api.uploadFile(file);
        const newFile = {
          name: file.name,
          size: file.size,
          path: result.path || result.filename,
          id: Date.now() + Math.random()
        };
        setUploadedFiles(prev => [...prev, newFile]);
        if (onFileUploaded) onFileUploaded(newFile);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="file-uploader">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          onChange={handleFileSelect}
        />
        {uploading ? (
          <div className="drop-zone-uploading">
            <div className="upload-spinner"></div>
            <p>Uploading...</p>
          </div>
        ) : (
          <>
            <div className="drop-zone-icon">📤</div>
            <p className="drop-zone-text">
              {isDragging ? 'Drop files here!' : 'Drag & drop files or click to select'}
            </p>
            <p className="drop-zone-sub">Files will be available for automation</p>
          </>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <p className="uploaded-files-title">Uploaded Files</p>
          {uploadedFiles.map(file => (
            <div key={file.id} className="uploaded-file-item">
              <span className="file-icon">📄</span>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
              </div>
              <button
                className="file-remove-btn"
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUploader;
