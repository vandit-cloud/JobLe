export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
        Previous
      </button>
      <p className="text-sm font-medium text-slate-600">
        Page {page} of {totalPages}
      </p>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
        Next
      </button>
    </div>
  );
}

