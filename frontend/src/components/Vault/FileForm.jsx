import { useState, useRef } from 'react'

/**
 * A form to upload a File.
 *
 * Props:
 *   onSave: (Function) Called with the file data when "Upload File" is clicked.
 *   onCancel: (Function) Called when "Cancel" is clicked.
 */
export function FileForm({ onSave, onCancel }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      // Use an inline or design-consistent notification if we had a toast system, 
      // but standard alert is forbidden for quota errors. We can use standard alert for validation though,
      // but to be safe and consistent with the prompt ("Do not use native browser alert() for quota/storage errors. 
      // Display errors using an inline message"), I will use a simple inline state for errors here if I want to be strict,
      // but standard form validation can just use a simple flag.
      return
    }

    onSave({
      name: selectedFile.name,
      type: selectedFile.type || 'application/octet-stream',
      size: selectedFile.size,
      blob: selectedFile
    })
  }

  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex-1 flex justify-center p-container-padding overflow-y-auto w-full">
      <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-component-gap-md mt-4">
        
        <div className="flex items-center gap-component-gap-md text-on-surface font-headline-sm text-headline-sm mb-2">
          Upload File
        </div>

        <div className="flex flex-col gap-component-gap-md border border-outline-variant bg-surface-container-lowest rounded-DEFAULT p-container-padding">
          <div className="border-b border-outline-variant pb-3 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">upload_file</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Select File</h2>
          </div>
          
          <div 
            className={`relative border-2 border-dashed ${selectedFile ? 'border-primary-container bg-primary-container/5' : 'border-outline-variant hover:border-primary-container hover:bg-secondary-container/20'} rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer group`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center mb-4 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">draft</span>
                </div>
                <h3 className="font-label-bold text-label-bold text-on-surface mb-1 break-all px-4">{selectedFile.name}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{formatSize(selectedFile.size)}</p>
                <div className="px-4 py-2 border border-surface-container-high rounded-lg bg-surface-container-lowest font-label-md text-label-md text-on-surface shadow-sm group-hover:border-primary-container">
                  Change File
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined text-[24px] text-on-surface-variant group-hover:text-on-primary">upload_file</span>
                </div>
                <h3 className="font-label-bold text-label-bold text-on-surface mb-1">Drag and drop file here</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">or click to browse from your computer</p>
                <div className="px-4 py-2 border border-surface-container-high rounded-lg bg-surface-container-lowest font-label-md text-label-md text-on-surface shadow-sm group-hover:border-primary-container pointer-events-none">
                  Browse Files
                </div>
              </div>
            )}
          </div>
          
          {!selectedFile && (
            <p className="text-body-sm font-body-sm text-error mt-2 text-center">
              Please select a file to upload.
            </p>
          )}

          <div className="mt-4 p-4 border border-surface-container-high rounded-lg bg-surface-bright flex items-start gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] mt-0.5">offline_pin</span>
            <div>
              <p className="font-label-bold text-label-bold text-on-surface">Available Offline</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">This file will be stored locally in your browser and will be available without an internet connection.</p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 mt-4 border-t border-outline-variant pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-[36px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-[#BFDBF7] hover:border-[#BFDBF7] transition-colors font-label-md text-label-md flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile}
            className={`h-[36px] px-4 rounded-xl font-label-md text-label-md flex items-center justify-center transition-colors gap-2 ${selectedFile ? 'bg-primary-container text-on-primary hover:bg-primary' : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'}`}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>upload</span>
            Upload File
          </button>
        </div>
      </form>
    </div>
  )
}
