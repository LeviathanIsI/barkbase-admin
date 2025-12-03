import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CreateIncidentInput, IncidentSeverity, IncidentStatus } from '@/types';

interface IncidentFormProps {
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

export function IncidentForm({ onSubmit, onCancel, isLoading }: IncidentFormProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Create Incident
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
              placeholder="Brief description of the incident"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value as IncidentSeverity })
                }
                className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
              >
                {severityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as IncidentStatus })
                }
                className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
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
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Affected Components
            </label>
            <div className="flex flex-wrap gap-2">
              {componentOptions.map((component) => (
                <button
                  key={component}
                  type="button"
                  onClick={() => toggleComponent(component)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.components.includes(component)
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]'
                  }`}
                >
                  {component}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Customer Message
            </label>
            <textarea
              value={formData.customerMessage}
              onChange={(e) =>
                setFormData({ ...formData, customerMessage: e.target.value })
              }
              required
              rows={3}
              className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
              placeholder="This message will be shown to customers on the status page"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Internal Notes (optional)
            </label>
            <textarea
              value={formData.internalNotes || ''}
              onChange={(e) =>
                setFormData({ ...formData, internalNotes: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
              placeholder="Internal notes visible only to the ops team"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
