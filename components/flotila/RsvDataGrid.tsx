export interface RsvField {
  label: string;
  value: unknown;
  unit?: string;
  /** Render ;\n separated values as a list */
  multiline?: boolean;
}

export interface RsvSection {
  title: string;
  fields: RsvField[];
}

interface RsvDataGridProps {
  sections: RsvSection[];
  columns?: 1 | 2;
}

/** Format RSV field value for display. Exported for testing. */
export function formatValue(value: unknown, unit?: string): string {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'boolean') return value ? 'Ano' : 'Ne';

  if (typeof value === 'number') {
    if (value === 0) return '—';
    const formatted = value.toLocaleString('cs-CZ');
    return unit ? `${formatted} ${unit}` : formatted;
  }

  const str = String(value).trim();
  if (!str) return '—';

  // Try to detect and format ISO dates (e.g., "2021-12-20T00:00:00")
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch { /* fall through */ }
  }

  return unit ? `${str} ${unit}` : str;
}

/** Split ;\n separated values into a list of non-empty lines. Exported for testing. */
export function parseMultilineValue(value: string): string[] {
  return value
    .split(/;\s*\n|;\s*$/)
    .map(line => line.trim())
    .filter(line => line && line !== '/');
}

/**
 * Parse DalsiZaznamy pipe-separated string into structured records.
 * Records are separated by " | " (space-pipe-space). Pipes within values
 * (e.g. "*N.1/N.2|245/45") are kept together by re-joining fragments
 * that don't look like a new record start.
 * Exported for testing.
 */
export function parseDalsiZaznamy(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  // Split by pipe
  const fragments = raw.split('|');
  const records: string[] = [];
  let current = '';

  for (const fragment of fragments) {
    const trimmed = fragment.trim();
    if (!trimmed) continue;

    // A new record starts with: "Key:" / "Multi Word Key:" or "*X.N:" pattern
    const isNewRecord =
      /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž][A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž\s]+:/.test(trimmed) ||
      /^\*[A-Z]/.test(trimmed);

    if (isNewRecord && current) {
      records.push(current.trim());
      current = trimmed;
    } else if (current) {
      current += ' ' + trimmed;
    } else {
      current = trimmed;
    }
  }

  if (current.trim()) {
    records.push(current.trim());
  }

  return records;
}

function MultilineValue({ value }: { value: string }) {
  const lines = parseMultilineValue(value);
  if (lines.length <= 1) {
    return <>{lines[0] || '—'}</>;
  }
  return (
    <ul className="list-disc list-inside space-y-0.5">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

function FieldValue({ field }: { field: RsvField }) {
  if (field.multiline && typeof field.value === 'string' && field.value.includes(';')) {
    return <MultilineValue value={field.value} />;
  }
  return <>{formatValue(field.value, field.unit)}</>;
}

function SectionBlock({ section }: { section: RsvSection }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
        {section.title}
      </h4>
      <dl className="space-y-1.5">
        {section.fields.map((field, i) => (
          <div key={i} className="grid grid-cols-[minmax(120px,auto)_1fr] gap-x-3 text-sm">
            <dt className="text-slate-500 dark:text-slate-400 truncate">{field.label}</dt>
            <dd className="text-slate-900 dark:text-slate-100 font-medium break-words">
              <FieldValue field={field} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function RsvDataGrid({ sections, columns = 2 }: RsvDataGridProps) {
  if (sections.length === 0) return null;

  const gridClass = columns === 2
    ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
    : 'grid grid-cols-1 gap-6';

  return (
    <div className={gridClass}>
      {sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}
    </div>
  );
}

interface EmptyRsvStateProps {
  message?: string;
}

export function EmptyRsvState({ message }: EmptyRsvStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">&#128203;</div>
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        {message || 'Data z registru nejsou k dispozici.'}
      </p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
        {'Dekódujte VIN v záložce Základní údaje.'}
      </p>
    </div>
  );
}

// Re-export CzechVehicleData for convenience
export type { CzechVehicleData } from '@/lib/vehicles/czech-vehicle-api';
