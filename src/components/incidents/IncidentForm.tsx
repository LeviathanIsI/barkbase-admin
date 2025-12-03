import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import type { CreateIncidentInput, IncidentSeverity, IncidentStatus } from '@/types';

interface IncidentFormProps {
  isOpen: boolean;
  onSubmit: (data: CreateIncidentInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const severityOptions: { value: IncidentSeverity; label: string }[] = [
  { value: 'degraded', label: 'Degraded Performance' },
  { value: 'partial_outage', label: 'Partial Outage' },
  { value: 'major_outage', label: 'Major Outage' },
];

const statusOptions: { value: IncidentStatus; label: string }[] = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified', label: 'Identified' },
  { value: 'monitoring', label: 'Monitoring' },
];

const componentOptions = [
  'auth',
  'booking',
  'payments',
  'notifications',
  'reports',
  'api',
];

export function IncidentForm({ isOpen, onSubmit, onCancel, isLoading }: IncidentFormProps) {
  const [formData, setFormData] = useState<CreateIncidentInput>({
    title: '',
    severity: 'degraded',
    status: 'investigating',
    customerMessage: '',
    internalNotes: '',
    components: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleComponent = (component: string) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.includes(component)
        ? prev.components.filter((c) => c !== component)
        : [...prev.components, component],
    }));
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onCancel}
      title="Create Incident"
      width="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title || !formData.customerMessage}
            className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Incident
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Title <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            placeholder="Brief description of the incident"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) =>
                setFormData({ ...formData, severity: e.target.value as IncidentSeverity })
              }
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as IncidentStatus })
              }
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Affected Components
          </label>
          <div className="flex flex-wrap gap-2">
            {componentOptions.map((component) => (
              <button
                key={component}
                type="button"
                onClick={() => toggleComponent(component)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  formData.components.includes(component)
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                }`}
              >
                {component}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Customer Message <span className="text-[var(--color-error)]">*</span>
          </label>
          <textarea
            value={formData.customerMessage}
            onChange={(e) =>
              setFormData({ ...formData, customerMessage: e.target.value })
            }
            required
            rows={3}
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            placeholder="This message will be shown to customers on the status page"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Internal Notes (optional)
          </label>
          <textarea
            value={formData.internalNotes || ''}
            onChange={(e) =>
              setFormData({ ...formData, internalNotes: e.target.value })
            }
            rows={2}
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            placeholder="Internal notes visible only to the ops team"
          />
        </div>
      </form>
    </SlideOutPanel>
  );
}
