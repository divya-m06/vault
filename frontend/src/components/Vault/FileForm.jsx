import { useState, useRef } from 'react'

/**
 * A modal-style form to upload a file.
 *
 * Props:
 *   onSave: (Function) Called with the file data when "Upload File" is clicked.
 *   onCancel: (Function) Called when "Cancel" or the close icon is clicked.
 *   errorMessage: (String) Inline storage or upload error to display.
 *   onClearError: (Function) Clears the inline error.
 */
export function FileForm({ onSave, onCancel, errorMessage, onClearError }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
      setValidationError(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0])
      setValidationError(null)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setValidationError('Please select a file to upload.')
      return
    }

    setValidationError(null)
    onSave({
      name: selectedFile.name,
      type: selectedFile.type || 'application/octet-stream',
      size: selectedFile.size,
      description: description.trim() || undefined,
      blob: selectedFile
    }, 'file')
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full" role="dialog" aria-modal="true" aria-labelledby="upload-file-title">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-bright">
        <h2 id="upload-file-title" className="text-headline-sm text-on-surface font-semibold">Upload File</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close upload dialog"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
        {(errorMessage || validationError) && (
          <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container shadow-sm">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <div className="flex-1">
                <p className="font-label-bold text-label-bold">Upload issue</p>
                <p className="font-body-sm text-body-sm">{errorMessage || validationError}</p>
              </div>
              {onClearError && (
                <button type="button" onClick={onClearError} className="opacity-70 transition-opacity hover:opacity-100">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200 ${selectedFile ? 'border-primary-container bg-primary-container/10' : 'border-outline-variant bg-surface-container-lowest hover:border-primary-container hover:bg-secondary-container/20'}`}
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
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[24px]">draft</span>
              </div>
              <h3 className="mb-1 max-w-full break-all px-4 text-label-bold text-on-surface">{selectedFile.name}</h3>
              <p className="mb-4 text-body-sm text-on-surface-variant">{formatSize(selectedFile.size)}</p>
              <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest px-4 py-2 text-label-md text-on-surface shadow-sm">
                Change File
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container transition-colors group-hover:bg-primary group-hover:text-on-primary">
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant transition-colors group-hover:text-on-primary">upload_file</span>
              </div>
              <h3 className="mb-1 text-label-bold text-on-surface">Drag and drop file here</h3>
              <p className="mb-4 text-body-sm text-on-surface-variant">or click to browse from your computer</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="rounded-lg border border-surface-container-high bg-surface-container-lowest px-4 py-2 text-label-md text-on-surface shadow-sm"
              >
                Browse Files
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface" htmlFor="file-description">
            File Description or Tags <span className="font-normal text-on-surface-variant">(Optional)</span>
          </label>
          <input
            id="file-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Financials 2023, Tax return..."
            type="text"
            className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-surface-container-high bg-surface-bright p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">cloud</span>
            <div>
              <p className="text-label-bold text-on-surface">Stored securely in Vault</p>
              <p className="mt-0.5 text-mono-label text-on-surface-variant">Encrypted and saved to your account</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary h-11 min-w-[112px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile}
            className="btn-primary h-11 min-w-[130px]"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>upload</span>
            Upload File
          </button>
        </div>
      </form>
    </div>
  )
}
