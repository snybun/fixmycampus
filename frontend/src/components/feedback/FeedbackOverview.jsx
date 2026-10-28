import React, { useEffect, useId, useState } from 'react';
import { MessageSquare, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchFeedback } from '../../services/api';
import { FeedbackStars, feedbackDate } from './ReportFeedback';
import './feedback.css';

const getPageNumbers = (current, total) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

export default function FeedbackOverview({ scopeKey = 'admin', maintenance = false }) {
  const headingId = useId();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setResult(null);
    const load = async () => {
      const response = await fetchFeedback({ page, limit });
      if (!active) return;
      setLoading(false);
      if (response.success) {
        setResult(response);
        setError('');
      } else {
        setError(response.message);
      }
    };
    load();
    const interval = setInterval(() => { if (!document.hidden) load(); }, 15000);
    window.addEventListener('focus', load);
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', load); };
  }, [page, limit, retry, scopeKey]);

  const total = result?.pagination?.total ?? (result?.summary?.filtered_total ?? (result?.summary?.total || 0));
  const totalPages = Math.max(1, result?.pagination?.total_pages || Math.ceil(total / limit) || 1);
  const currentPage = Math.min(totalPages, Math.max(1, result?.pagination?.page || page));

  return (
    <section className="feedback-card feedback-overview" aria-labelledby={headingId}>
      <div className="feedback-overview-header">
        <div>
          <div className="feedback-heading"><MessageSquare size={21} aria-hidden="true" /><h2 id={headingId}>Repair feedback</h2></div>
          <p className="feedback-muted">{maintenance ? 'Ratings and comments from reporters of your assigned jobs.' : 'Ratings and comments from reporters across campus.'}</p>
        </div>
        {total > 0 && <div className="feedback-summary"><Star size={24} aria-hidden="true" /><strong>{Number(result.summary.average_rating).toFixed(1)}<small>/5</small></strong><span>{total} {total === 1 ? 'review' : 'reviews'}</span></div>}
      </div>

      {/* Upper Pagination Toolbar */}
      {total > 0 && (
        <div className="feedback-pagination-toolbar" aria-label="Feedback pagination">
          <div className="feedback-pagination-left">
            <span className="feedback-pagination-count">
              Showing {total === 0 ? 0 : (currentPage - 1) * limit + 1}–{Math.min(total, currentPage * limit)} of {total} review{total === 1 ? '' : 's'}
            </span>
            <div className="feedback-pagination-limit">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="feedback-pagination-select"
                aria-label="Reviews per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="feedback-pagination-controls">
            <button
              type="button"
              className="maint-page-btn arrow-btn"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {getPageNumbers(currentPage, totalPages).map((pg, idx) =>
              pg === '...' ? (
                <span key={`ellipsis-${idx}`} className="maint-page-ellipsis">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${pg}`}
                  type="button"
                  className={`maint-page-btn ${pg === currentPage ? 'active' : ''}`}
                  onClick={() => setPage(pg)}
                  disabled={loading}
                  title={`Page ${pg}`}
                >
                  {pg}
                </button>
              )
            )}

            <button
              type="button"
              className="maint-page-btn arrow-btn"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {error && <div className="feedback-error" role="alert">{error} <button type="button" className="feedback-retry" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {loading && <p className="feedback-muted" role="status">Loading feedback…</p>}
      {!loading && !error && !total && <p className="feedback-empty">No feedback yet. Ratings and comments will appear here when reporters review completed repairs.</p>}
      {!loading && result && <ul className="feedback-list">
        {result.data.map((item) => <li key={item.id}>
          <div className="feedback-item-header"><div><span className="feedback-ticket">{item.ticket_number}</span><h3>{item.report_title}</h3></div><FeedbackStars rating={item.rating} /></div>
          {item.comments ? <p className="feedback-comment">{item.comments}</p> : <p className="feedback-muted">No written feedback.</p>}
          <p className="feedback-muted">{item.reporter_name} · {feedbackDate(item.created_at)}</p>
        </li>)}
      </ul>}
    </section>
  );
}
