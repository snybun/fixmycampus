import React, { useEffect, useId, useRef, useState } from 'react';
import {
  MessageSquare,
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ChevronDown,
  Check,
  ArrowRight,
} from 'lucide-react';
import { fetchFeedback } from '../../services/api';
import { FeedbackStars, feedbackDate } from './ReportFeedback';
import './feedback.css';

const FEEDBACK_FILTER_OPTIONS = [
  { key: 'all', label: 'All Reviews', color: '#64748b', star: null },
  { key: '5', label: '5 Stars (Excellent)', color: '#a855f7', star: 5 },
  { key: '4', label: '4 Stars (Very Good)', color: '#3b82f6', star: 4 },
  { key: '3', label: '3 Stars (Average)', color: '#059669', star: 3 },
  { key: '2', label: '2 Stars (Poor)', color: '#f59e0b', star: 2 },
  { key: '1', label: '1 Star (Terrible)', color: '#dc2626', star: 1 },
];

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

export default function FeedbackOverview({ scopeKey = 'admin', maintenance = false, onViewReport = null }) {
  const headingId = useId();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | '5' | '4' | '3' | '2' | '1'
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input for smooth live filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async () => {
      const params = { page, limit };
      if (ratingFilter !== 'all') {
        params.rating = ratingFilter;
      }
      if (appliedSearch) {
        params.search = appliedSearch;
      }
      const response = await fetchFeedback(params);
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
  }, [page, limit, ratingFilter, appliedSearch, retry, scopeKey]);

  const allTotal = result?.summary?.total ?? 0;
  const distribution = result?.summary?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = result?.pagination?.total ?? (result?.summary?.filtered_total ?? allTotal);
  const totalPages = Math.max(1, result?.pagination?.total_pages || Math.ceil(total / limit) || 1);
  const currentPage = Math.min(totalPages, Math.max(1, result?.pagination?.page || page));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setPage(1);
  };

  return (
    <section className="feedback-card feedback-overview" aria-labelledby={headingId}>
      <div className="feedback-overview-header">
        <div>
          <div className="feedback-heading"><MessageSquare size={21} aria-hidden="true" /><h2 id={headingId}>Repair feedback</h2></div>
          <p className="feedback-muted">{maintenance ? 'Ratings and comments from reporters of your assigned jobs.' : 'Ratings and comments from reporters across campus.'}</p>
        </div>
        {allTotal > 0 && (
          <div className="feedback-summary">
            <Star size={24} aria-hidden="true" />
            <strong>{Number(result.summary.average_rating).toFixed(1)}<small>/5</small></strong>
            <span>{allTotal} {allTotal === 1 ? 'review' : 'reviews'}</span>
          </div>
        )}
      </div>

      {/* Full-Width Search & 1-5 Star Filter Bar */}
      <form className="feedback-search-filter-bar" onSubmit={handleSearchSubmit}>
        <div className="feedback-search-box">
          <Search size={16} className="feedback-search-icon" />
          <input
            type="text"
            className="feedback-search-input"
            placeholder="Search by ticket (e.g. FMC-202610), report title, reporter, or comment..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            id="maint-feedback-search-input"
          />
          {searchInput && (
            <button
              type="button"
              className="feedback-search-clear-icon"
              onClick={handleClearSearch}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button type="submit" className="feedback-search-submit-btn">
          Search
        </button>

        {appliedSearch && (
          <button
            type="button"
            className="feedback-search-reset-btn"
            onClick={handleClearSearch}
          >
            Clear
          </button>
        )}

        {/* 1-5 Stars Filter Dropdown */}
        <div className="feedback-filter-dropdown-wrap" ref={filterDropdownRef}>
          <button
            type="button"
            className={`feedback-filter-btn ${isFilterOpen ? 'open' : ''} ${ratingFilter !== 'all' ? 'has-active' : ''}`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            title="Filter feedback by star rating (1-5 stars)"
            id="maint-feedback-filter-btn"
          >
            <Filter size={15} />
            <span className="feedback-filter-btn-text">
              {ratingFilter === 'all'
                ? 'Filter'
                : `${ratingFilter} Star${ratingFilter === '1' ? '' : 's'}`}
            </span>
            {ratingFilter !== 'all' && (
              <span className="feedback-filter-badge">
                {distribution[Number(ratingFilter)] || 0}
              </span>
            )}
            <ChevronDown size={14} className={`feedback-filter-chevron ${isFilterOpen ? 'rotate' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="feedback-filter-menu" role="menu">
              <div className="feedback-filter-menu-header">
                <span>Filter by Rating (1–5★)</span>
                {ratingFilter !== 'all' && (
                  <button
                    type="button"
                    className="feedback-filter-menu-reset"
                    onClick={() => {
                      setRatingFilter('all');
                      setIsFilterOpen(false);
                      setPage(1);
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="feedback-filter-menu-list">
                {FEEDBACK_FILTER_OPTIONS.map((opt) => {
                  const isActive = ratingFilter === opt.key;
                  const count = opt.key === 'all' ? allTotal : (distribution[opt.star] || 0);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`feedback-filter-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setRatingFilter(opt.key);
                        setIsFilterOpen(false);
                        setPage(1);
                      }}
                      role="menuitem"
                    >
                      <span
                        className="feedback-filter-item-dot"
                        style={{ backgroundColor: opt.color }}
                      />
                      <span className="feedback-filter-item-label">{opt.label}</span>
                      <span className="feedback-filter-item-count">{count}</span>
                      {isActive && <Check size={14} className="feedback-filter-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </form>

      {error && <div className="feedback-error" role="alert">{error} <button type="button" className="feedback-retry" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {loading && !result && <p className="feedback-muted" role="status">Loading feedback…</p>}
      {!loading && !error && total === 0 && (
        <div className="feedback-empty-box">
          <p className="feedback-empty">
            {appliedSearch || ratingFilter !== 'all'
              ? 'No feedback entries matched your search query or star rating filter.'
              : 'No feedback yet. Ratings and comments will appear here when reporters review completed repairs.'}
          </p>
          {(appliedSearch || ratingFilter !== 'all') && (
            <button
              type="button"
              className="feedback-search-reset-btn"
              style={{ marginTop: 10 }}
              onClick={() => {
                setRatingFilter('all');
                handleClearSearch();
              }}
            >
              Show All Reviews
            </button>
          )}
        </div>
      )}
      {result && result.data && result.data.length > 0 && (
        <ul className="feedback-list">
          {result.data.map((item) => {
            const isClickable = typeof onViewReport === 'function' && Boolean(item.report_id || item.ticket_number);
            return (
              <li
                key={item.id}
                className={isClickable ? 'feedback-list-item clickable' : 'feedback-list-item'}
                onClick={() => {
                  if (isClickable) onViewReport(item);
                }}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onViewReport(item);
                  }
                }}
                title={isClickable ? `Click to view report ${item.ticket_number || ''}` : undefined}
              >
                <div className="feedback-item-header">
                  <div>
                    <span className="feedback-ticket">{item.ticket_number}</span>
                    <h3>{item.report_title}</h3>
                  </div>
                  <FeedbackStars rating={item.rating} />
                </div>
                {item.comments ? <p className="feedback-comment">{item.comments}</p> : <p className="feedback-muted">No written feedback.</p>}
                <div className="feedback-item-footer">
                  <p className="feedback-muted" style={{ margin: 0 }}>{item.reporter_name} · {feedbackDate(item.created_at)}</p>
                  {isClickable && (
                    <span className="feedback-view-report-btn">
                      <span>View Report</span>
                      <ArrowRight size={14} />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Bottom Pagination Toolbar */}
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
            disabled={currentPage <= 1 || loading || total === 0}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {total === 0 ? (
            <button type="button" className="maint-page-btn active" disabled title="Page 1">
              1
            </button>
          ) : (
            getPageNumbers(currentPage, totalPages).map((pg, idx) =>
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
            )
          )}

          <button
            type="button"
            className="maint-page-btn arrow-btn"
            disabled={currentPage >= totalPages || loading || total === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
