// Adapters + diff utility untuk fitur Compare (Survey vs DRM) di modul DRM.
// Menormalkan berbagai bentuk respons API (BOQ / Matrix / Redline, sisi survey & DRM)
// menjadi struktur baris seragam yang bisa dipasangkan berdasarkan key dan
// dibandingkan kolom-per-kolom.

export interface CompareColumn {
  key: string;
  label: string;
  /** 'number' diformat dengan pemisah ribuan; 'text' apa adanya. Default 'text'. */
  type?: 'number' | 'text';
}

export interface CompareRow {
  key: string;
  cells: Record<string, string | number>;
}

const toNum = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// Memastikan key unik bila ada duplikat (mis. designator yang sama muncul >1x).
const dedupeKeys = (rows: CompareRow[]): CompareRow[] => {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const count = seen.get(r.key) ?? 0;
    seen.set(r.key, count + 1);
    return count === 0 ? r : { ...r, key: `${r.key}#${count + 1}` };
  });
};

/* ============================ BOQ ============================ */

export const BOQ_COLUMNS: CompareColumn[] = [
  { key: 'designator', label: 'Designator' },
  { key: 'uraian', label: 'Uraian Pekerjaan' },
  { key: 'satuan', label: 'Satuan' },
  { key: 'material', label: 'Material', type: 'number' },
  { key: 'jasa', label: 'Jasa', type: 'number' },
  { key: 'drm', label: 'DRM', type: 'number' },
  { key: 'actual', label: 'Actual', type: 'number' },
  { key: 'tambah', label: 'Tambah', type: 'number' },
  { key: 'kurang', label: 'Kurang', type: 'number' },
];

const normalizeBoqItem = (item: any): CompareRow => {
  const designator = item.designator || '';
  return {
    key: designator || (item.uraian_pekerjaan || item.uraianPekerjaan || ''),
    cells: {
      designator,
      uraian: item.uraian_pekerjaan || item.uraianPekerjaan || '',
      satuan: item.satuan || '',
      material: toNum(item.harga_satuan_material ?? item.material) || 100,
      jasa: toNum(item.harga_satuan_jasa ?? item.jasa) || 100,
      drm: toNum(item.drm),
      actual: toNum(item.aktual ?? item.planned ?? item.actual),
      tambah: toNum(item.tambah),
      kurang: toNum(item.kurang),
    },
  };
};

/** Survey BOQ: array item langsung, atau { doc: [...] }, atau { items: [...] }. */
export const normalizeBoq = (raw: any): CompareRow[] => {
  const items: any[] = Array.isArray(raw)
    ? raw
    : raw?.doc ?? raw?.items ?? raw?.data?.doc ?? [];
  return dedupeKeys(items.map(normalizeBoqItem));
};

/* ============================ MATRIX ============================ */

export const MATRIX_COLUMNS: CompareColumn[] = [
  { key: 'span', label: 'Span' },
  { key: 'offset_from', label: 'Offset From', type: 'number' },
  { key: 'offset_to', label: 'Offset To', type: 'number' },
  { key: 'designator', label: 'Designator' },
  { key: 'length', label: 'Length', type: 'number' },
  { key: 'slack_berbayar', label: 'Slack Berbayar', type: 'number' },
  { key: 'fo_total', label: 'FO Total', type: 'number' },
  { key: 'slack_tidak_berbayar', label: 'Slack Tidak Berbayar', type: 'number' },
  { key: 'tol_2_persen', label: 'Tol 2%', type: 'number' },
  { key: 'pengadaan', label: 'Pengadaan', type: 'number' },
];

/** Matrix survey: { spans: [...] }; Matrix DRM: { doc: [...] } / { data: { doc } }. */
export const normalizeMatrix = (raw: any): CompareRow[] => {
  const spans: any[] = raw?.spans ?? raw?.doc ?? raw?.data?.doc ?? (Array.isArray(raw) ? raw : []);
  const rows: CompareRow[] = [];
  spans.forEach((span: any) => {
    const spanName = span.span_name || 'Unknown Span';
    (span.span_items || []).forEach((item: any, idx: number) => {
      const offFrom = item.offset_from ?? '-';
      const offTo = item.offset_to ?? '-';
      rows.push({
        key: `${spanName}|${offFrom}|${offTo}|${item.designator || ''}|${idx}`,
        cells: {
          span: spanName,
          offset_from: item.offset_from != null ? toNum(item.offset_from) : '-',
          offset_to: item.offset_to != null ? toNum(item.offset_to) : '-',
          designator: item.designator || '-',
          length: toNum(item.length),
          slack_berbayar: toNum(item.slack_berbayar),
          fo_total: toNum(item.fo_total),
          slack_tidak_berbayar: toNum(item.slack_tidak_berbayar),
          tol_2_persen: toNum(item.tol_2_persen),
          pengadaan: toNum(item.pengadaan),
        },
      });
    });
  });
  return dedupeKeys(rows);
};

/* ============================ REDLINE ============================ */

export const REDLINE_COLUMNS: CompareColumn[] = [
  { key: 'span', label: 'Span' },
  { key: 'item_name', label: 'Item / Designator' },
  { key: 'length', label: 'Length', type: 'number' },
  { key: 'redline', label: 'Redline', type: 'number' },
];

/**
 * Redline survey: { spans: [...] } atau array span langsung.
 * Redline DRM: { doc: [...] } / { data: { doc } } / sudah ter-map [{span_name, span_items}].
 */
export const normalizeRedline = (raw: any): CompareRow[] => {
  const spans: any[] = raw?.spans ?? raw?.doc ?? raw?.data?.doc ?? (Array.isArray(raw) ? raw : []);
  const rows: CompareRow[] = [];
  spans.forEach((span: any) => {
    const spanName = span.span_name || 'Unknown Span';
    (span.span_items || []).forEach((item: any, idx: number) => {
      const itemName = item.item_name || item.designator || '';
      rows.push({
        key: `${spanName}|${itemName}|${idx}`,
        cells: {
          span: spanName,
          item_name: itemName,
          length: toNum(item.length),
          redline: toNum(item.redline),
        },
      });
    });
  });
  return dedupeKeys(rows);
};

/* ============================ DIFF ============================ */

export type RowStatus = 'same' | 'changed' | 'added' | 'removed';

export interface PairedRow {
  key: string;
  left: CompareRow | null;
  right: CompareRow | null;
  status: RowStatus;
  /** key kolom yang nilainya berbeda antara left & right */
  changedCells: Set<string>;
}

export interface DiffResult {
  rows: PairedRow[];
  changedCount: number;
  addedCount: number;
  removedCount: number;
}

const valuesEqual = (a: string | number | undefined, b: string | number | undefined): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  return String(a ?? '') === String(b ?? '');
};

/**
 * Pasangkan baris left (survey) & right (DRM) berdasarkan key, pertahankan urutan,
 * dan tandai cell yang berbeda. Baris yang hanya ada di satu sisi → added/removed.
 */
export const diffRows = (
  left: CompareRow[],
  right: CompareRow[],
  columns: CompareColumn[]
): DiffResult => {
  const leftMap = new Map(left.map((r) => [r.key, r]));
  const rightMap = new Map(right.map((r) => [r.key, r]));

  // Urutan: semua key left dulu (sesuai urutan survey), lalu key right yang belum muncul.
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  left.forEach((r) => { if (!seen.has(r.key)) { seen.add(r.key); orderedKeys.push(r.key); } });
  right.forEach((r) => { if (!seen.has(r.key)) { seen.add(r.key); orderedKeys.push(r.key); } });

  let changedCount = 0;
  let addedCount = 0;
  let removedCount = 0;

  const rows: PairedRow[] = orderedKeys.map((key) => {
    const l = leftMap.get(key) ?? null;
    const r = rightMap.get(key) ?? null;
    const changedCells = new Set<string>();

    let status: RowStatus;
    if (l && r) {
      columns.forEach((col) => {
        if (!valuesEqual(l.cells[col.key], r.cells[col.key])) changedCells.add(col.key);
      });
      status = changedCells.size > 0 ? 'changed' : 'same';
      if (status === 'changed') changedCount++;
    } else if (l && !r) {
      status = 'removed'; // ada di survey, tidak ada di DRM
      removedCount++;
    } else {
      status = 'added'; // ada di DRM, tidak ada di survey
      addedCount++;
    }

    return { key, left: l, right: r, status, changedCells };
  });

  return { rows, changedCount, addedCount, removedCount };
};

export const formatCell = (value: string | number | undefined, type?: 'number' | 'text'): string => {
  if (value === undefined || value === null || value === '') return '';
  if (type === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
  }
  return String(value);
};
