import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Modal } from './ui';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'select';
  options?: string[]; // for select type
  required?: boolean;
}

interface CustomFieldsModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitting?: boolean;
  initialFields?: CustomField[];
  baseFields?: CustomField[]; // fields that always show (non-removable)
  submitLabel?: string;
  suggestions?: Omit<CustomField, 'id' | 'value'>[]; // quick-add suggestions
}

export function CustomFieldsModal({
  open,
  title,
  onClose,
  onSubmit,
  submitting = false,
  initialFields = [],
  baseFields = [],
  submitLabel = 'Save',
  suggestions = [],
}: CustomFieldsModalProps) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [baseFieldValues, setBaseFieldValues] = useState<Record<string, string>>({});

  // Initialize base field values
  const handleBaseFieldChange = (fieldId: string, value: string) => {
    setBaseFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, value } : f));
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      label: '',
      value: '',
      type: 'text',
      required: false,
    };
    setFields(prev => [...prev, newField]);
  };

  const removeCustomField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Collect all field values
    const data: Record<string, any> = { ...baseFieldValues };
    
    fields.forEach(field => {
      if (field.label.trim()) {
        let value: any = field.value;
        if (field.type === 'number') {
          value = value ? Number(value) : 0;
        }
        data[field.label.trim().toLowerCase().replace(/\s+/g, '_')] = value;
      }
    });

    await onSubmit(data);
  };

  const renderField = (field: CustomField, _index: number, isBase: boolean) => (
    <div key={field.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 relative">
      {!isBase && (
        <button
          type="button"
          onClick={() => removeCustomField(field.id)}
          className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
          aria-label="Remove field"
        >
          <Trash2 size={18} />
        </button>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={field.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) => 
            handleCustomFieldChange(field.id, e.target.value)
          }
          placeholder="Field label (e.g. Sodium, Fiber, Tempo)"
          className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
        />
        <select
          value={field.type}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => 
            handleCustomFieldChange(field.id, e.target.value)
          }
          className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
        </select>
      </div>

      <div>
        {field.type === 'select' && field.options && field.options.length > 0 ? (
          <select
            value={field.value}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => 
              handleCustomFieldChange(field.id, e.target.value)
            }
            className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
          >
            {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={field.value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => 
              handleCustomFieldChange(field.id, e.target.value)
            }
            placeholder={`Enter ${field.label || 'value'}`}
            className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
            step={field.type === 'number' ? '0.1' : undefined}
          />
        )}
      </div>

      {field.type === 'select' && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add option (press Enter)"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newOption = e.currentTarget.value.trim();
                setFields(prev => prev.map(f => 
                  f.id === field.id 
                    ? { ...f, options: [...(f.options || []), newOption] }
                    : f
                ));
                e.currentTarget.value = '';
              }
            }}
            className="flex-1 p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
          />
          {field.options && field.options.map((opt, i) => (
            <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 flex items-center gap-1">
              {opt}
              <button type="button" onClick={() => {
                setFields(prev => prev.map(f => 
                  f.id === field.id 
                    ? { ...f, options: f.options?.filter((_, idx) => idx !== i) || [] }
                    : f
                ));
              }} className="text-slate-500 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Modal open={open} title={title} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Base fields (always shown, non-removable) */}
        {baseFields.map((field, _index) => (
          <div key={field.id} className="space-y-2">
            <label className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            {field.type === 'select' && field.options ? (
              <select
                value={baseFieldValues[field.id] || ''}
                onChange={(e) => handleBaseFieldChange(field.id, e.target.value)}
                className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
                required={field.required}
              >
                <option value="">Select {field.label}</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={baseFieldValues[field.id] || ''}
                onChange={(e) => handleBaseFieldChange(field.id, e.target.value)}
                placeholder={field.label}
                className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
                step={field.type === 'number' ? '0.1' : undefined}
                required={field.required}
              />
            )}
          </div>
        ))}

        {/* Custom fields (user can add/remove) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <GripVertical size={16} className="text-slate-500" />
              Custom Fields
            </h4>
            <button
              type="button"
              onClick={addCustomField}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              <Plus size={14} /> Add Field
            </button>
          </div>
          
          {fields.map((field, _index) => renderField(field, _index, false))}
          
          {fields.length === 0 && suggestions && suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 text-center">Quick add common fields:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.label}
                    onClick={() => {
                      const newField: CustomField = {
                        id: `custom_${Date.now()}_${Math.random()}`,
                        label: suggestion.label,
                        value: '',
                        type: suggestion.type,
                        required: false,
                      };
                      setFields(prev => [...prev, newField]);
                    }}
                    className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {fields.length === 0 && (!suggestions || suggestions.length === 0) && (
            <p className="text-xs text-slate-500 text-center py-4">
              No custom fields yet. Click "Add Field" to create custom labels.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold disabled:opacity-50"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </form>
    </Modal>
  );
}

// Pre-configured modals for Food and Exercise
export const FOOD_BASE_FIELDS: CustomField[] = [
  { id: 'name', label: 'Food Name', value: '', type: 'text', required: true },
  { id: 'serving_size', label: 'Serving Size', value: '100', type: 'number', required: true },
  { id: 'serving_unit', label: 'Unit', value: 'g', type: 'select', required: true, options: ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice'] },
  { id: 'calories', label: 'Calories (kcal)', value: '0', type: 'number', required: true },
  { id: 'protein', label: 'Protein (g)', value: '0', type: 'number' },
  { id: 'carbohydrates', label: 'Carbs (g)', value: '0', type: 'number' },
  { id: 'fat', label: 'Fat (g)', value: '0', type: 'number' },
  { id: 'fiber', label: 'Fiber (g)', value: '0', type: 'number' },
];

export const EXERCISE_BASE_FIELDS: CustomField[] = [
  { id: 'name', label: 'Exercise Name', value: '', type: 'text', required: true },
  { id: 'exercise_type', label: 'Type', value: 'Strength', type: 'select', required: true, options: ['Strength', 'Cardio', 'Flexibility', 'Sports', 'Other'] },
  { id: 'description', label: 'Description', value: '', type: 'text' },
];

// Default custom field suggestions for Food
export const FOOD_CUSTOM_FIELD_SUGGESTIONS: Omit<CustomField, 'id' | 'value'>[] = [
  { label: 'Sodium (mg)', type: 'number' },
  { label: 'Sugar (g)', type: 'number' },
  { label: 'Cholesterol (mg)', type: 'number' },
  { label: 'Potassium (mg)', type: 'number' },
  { label: 'Vitamin C (mg)', type: 'number' },
  { label: 'Calcium (mg)', type: 'number' },
  { label: 'Iron (mg)', type: 'number' },
];

// Default custom field suggestions for Exercise
export const EXERCISE_CUSTOM_FIELD_SUGGESTIONS: Omit<CustomField, 'id' | 'value'>[] = [
  { label: 'Tempo', type: 'text' },
  { label: 'RPE', type: 'number' },
  { label: 'Rest Time (sec)', type: 'number' },
  { label: 'Weight (kg)', type: 'number' },
  { label: 'Distance (km)', type: 'number' },
  { label: 'Heart Rate (bpm)', type: 'number' },
  { label: 'Notes', type: 'text' },
];