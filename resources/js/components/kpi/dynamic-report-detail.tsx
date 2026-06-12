import type { ReportField } from './dynamic-report-form';

interface Props {
  fields: Record<string, unknown>;
  reportFields: ReportField[];
}

/**
 * Get a value from nested object using dot notation key.
 */
function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[part];
  }
  return String(current ?? '');
}

export default function DynamicReportDetail({ fields, reportFields }: Props) {
  // Group by group_label
  const grouped: { label: string; items: ReportField[] }[] = [];
  let lastGroup: string | null = null;

  for (const field of reportFields) {
    const groupLabel = field.group_label || 'Detail';
    if (groupLabel !== lastGroup) {
      grouped.push({ label: groupLabel, items: [field] });
      lastGroup = groupLabel;
    } else {
      grouped[grouped.length - 1].items.push(field);
    }
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.label}>
          <h3 className="mb-2 font-semibold">{group.label}</h3>
          <div className="space-y-1 rounded bg-muted p-3 text-sm">
            {group.items.map((field) => {
              const value = getNestedValue(fields, field.field_key);
              return (
                <div key={field.field_key}>
                  <p className="font-medium">{field.field_label}:</p>
                  <p className="whitespace-pre-wrap">{value || '-'}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
