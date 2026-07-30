import { useState, useEffect } from 'react'

/**
 * A form to create or edit a Secure Note entry.
 *
 * Props:
 *   initialData: (Optional) If provided, populates the form for editing.
 *   onSave: (Function) Called with the form data when "Save" is clicked.
 *   onCancel: (Function) Called when "Cancel" is clicked.
 */
export function NoteForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  })

  // Populate form if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || ''
      })
    }
  }, [initialData])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Note Title is required.')
      return
    }
    onSave(formData)
  }

  return (
    <div className="flex-1 flex justify-center p-container-padding overflow-y-auto w-full">
      <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-component-gap-md mt-4">
        
        <div className="flex items-center gap-component-gap-md text-on-surface font-headline-sm text-headline-sm mb-2">
          {initialData ? 'Edit Secure Note' : 'Add Secure Note'}
        </div>

        <div className="flex flex-col gap-component-gap-md border border-outline-variant bg-surface-container-lowest rounded-DEFAULT p-container-padding">
          <div className="border-b border-outline-variant pb-3 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">description</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Note Details</h2>
          </div>
          
          <div className="flex flex-col gap-gutter">
            {/* Field: Title */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="title">Note Title</label>
              <input
                id="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Server Configuration Keys"
                type="text"
                className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-body-md text-body-md text-on-surface h-[36px] px-3"
                required
              />
            </div>

            {/* Field: Content */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="content">Note Content</label>
              <textarea
                id="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Enter information here..."
                rows="10"
                className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-body-md text-body-md text-on-surface h-auto py-3 px-3 resize-none w-full"
              />
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
            className="h-[36px] px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center hover:bg-primary transition-colors gap-2"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
            Save Note
          </button>
        </div>
      </form>
    </div>
  )
}
