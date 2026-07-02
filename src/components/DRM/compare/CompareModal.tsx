import { useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, GitCompare, Filter } from 'lucide-react';
import {
  CompareColumn,
  CompareRow,
  diffRows,
  formatCell,
  PairedRow,
} from './compareAdapters';

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sub judul opsional, mis. nama link/ruas */
  subtitle?: string;
  columns: CompareColumn[];
  leftRows: CompareRow[];
  rightRows: CompareRow[];
  loadingLeft?: boolean;
  loadingRight?: boolean;
}

const LEFT_LABEL = 'SURVEY';
const RIGHT_LABEL = 'DRM';

export function CompareModal({
  open,
  onClose,
  title,
  subtitle,
  columns,
  leftRows,
  rightRows,
  loadingLeft,
  loadingRight,
}: CompareModalProps) {
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  const diff = useMemo(
    () => diffRows(leftRows, rightRows, columns),
    [leftRows, rightRows, columns]
  );

  // Filter rows: show only differences if toggled
  const visibleRows = useMemo(
    () => (onlyDiffs ? diff.rows.filter((r) => r.status !== 'same') : diff.rows),
    [diff.rows, onlyDiffs]
  );

  // Synchronized scroll refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const handleScroll = useCallback(
    (source: 'left' | 'right') => {
      if (isScrolling.current) return;
      isScrolling.current = true;

      const srcEl = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
      const tgtEl = source === 'left' ? rightScrollRef.current : leftScrollRef.current;

      if (srcEl && tgtEl) {
        tgtEl.scrollTop = srcEl.scrollTop;
        tgtEl.scrollLeft = srcEl.scrollLeft;
      }

      // Use rAF to release lock after browser paint
      requestAnimationFrame(() => {
        isScrolling.current = false;
      });
    },
    []
  );

  if (!open) return null;

  const loading = loadingLeft || loadingRight;

  const sameCount = diff.rows.length - diff.changedCount - diff.addedCount - diff.removedCount;

  // Render satu sisi (left/right) dari sebuah PairedRow.
  const renderRow = (pair: PairedRow, side: 'left' | 'right') => {
    const row = side === 'left' ? pair.left : pair.right;

    // Baris hanya ada di sisi lawan → tampilkan placeholder agar tetap sejajar.
    if (!row) {
      return (
        <tr key={pair.key} className="h-10 bg-gray-50">
          <td
            colSpan={columns.length}
            className="px-3 py-2 text-xs italic text-gray-400 text-center border-b border-gray-100"
          >
            {side === 'left' ? 'Tidak ada di Survey' : 'Tidak ada di DRM'}
          </td>
        </tr>
      );
    }

    const rowBg =
      pair.status === 'added'
        ? 'bg-emerald-50'
        : pair.status === 'removed'
        ? 'bg-rose-50'
        : '';

    return (
      <tr key={pair.key} className={`h-10 ${rowBg}`}>
        {columns.map((col) => {
          const isChanged = pair.status === 'changed' && pair.changedCells.has(col.key);
          return (
            <td
              key={col.key}
              className={`px-3 py-2 text-xs border-b border-gray-100 whitespace-nowrap ${
                col.type === 'number' ? 'text-right font-mono' : 'text-left'
              } ${isChanged ? 'bg-amber-200/70 font-semibold text-amber-900' : 'text-gray-700'}`}
              title={isChanged ? 'Nilai berbeda antara Survey & DRM' : undefined}
            >
              {formatCell(row.cells[col.key], col.type)}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderTable = (side: 'left' | 'right', isLoading?: boolean) => {
    const scrollRef = side === 'left' ? leftScrollRef : rightScrollRef;

    return (
      <div className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
        <div
          className={`px-4 py-2 text-sm font-bold text-white flex items-center justify-between ${
            side === 'left' ? 'bg-[#0078D7]' : 'bg-[#15396C]'
          }`}
        >
          <span>{side === 'left' ? LEFT_LABEL : RIGHT_LABEL}</span>
          <span className="text-xs font-normal opacity-80">
            {(side === 'left' ? leftRows : rightRows).length} baris
          </span>
        </div>
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={() => handleScroll(side)}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm gap-3">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#005EB8]" />
              Memuat data {side === 'left' ? LEFT_LABEL : RIGHT_LABEL}...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              {onlyDiffs ? 'Tidak ada perbedaan ditemukan' : 'Tidak ada data'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2 text-[10px] font-bold uppercase text-gray-600 border-b border-gray-200 whitespace-nowrap ${
                        col.type === 'number' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{visibleRows.map((pair) => renderRow(pair, side))}</tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: '1400px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-[#15396C] to-[#0078D7] rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <GitCompare className="w-5 h-5" />
            <div>
              <h3 className="text-lg font-bold leading-tight">{title}</h3>
              {subtitle && <p className="text-xs text-blue-100">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend + summary + filter */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-5 text-xs text-gray-600 flex-wrap flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-amber-200/70 border border-amber-300" />
            Nilai berbeda
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
            Hanya di DRM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-rose-50 border border-rose-200" />
            Hanya di Survey
          </span>

          {/* Filter toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none ml-4 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="checkbox"
              checked={onlyDiffs}
              onChange={(e) => setOnlyDiffs(e.target.checked)}
              className="accent-indigo-600 w-3.5 h-3.5"
            />
            <span className="text-xs font-medium text-gray-700">Hanya perbedaan</span>
          </label>

          {!loading && (
            <span className="ml-auto font-medium text-gray-700">
              {sameCount} identik · {diff.changedCount} berubah · {diff.addedCount} hanya DRM ·{' '}
              {diff.removedCount} hanya Survey
            </span>
          )}
        </div>

        {/* Split body */}
        <div className="flex-1 overflow-hidden p-6 flex gap-4">
          {renderTable('left', loadingLeft)}
          {renderTable('right', loadingRight)}
        </div>
      </div>
    </div>,
    document.body
  );
}
