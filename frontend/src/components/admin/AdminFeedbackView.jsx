import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star,
  MessageSquareQuote,
  Search,
  RefreshCw,
  CheckCircle2,
  User,
  Wrench,
  Calendar,
  ArrowUpRight,
  Award,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  Check,
} from 'lucide-react';
import { fetchFeedback } from '../../services/api';
import { FeedbackStars, feedbackDate } from '../feedback/ReportFeedback';
import './adminFeedback.css';

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

export default function AdminFeedbackView({ onViewReport }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    average_rating: null,
    filtered_total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | '5' | '4' | '3' | '2' | '1'
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load feedback from API
  const loadFeedbackData = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = {
      page: currentPage,
      limit: pageSize,
    };
    if (ratingFilter !== 'all') {
      params.rating = ratingFilter;
    }
    if (appliedSearch) {
      params.search = appliedSearch;
    }

    try {
      const res = await fetchFeedback(params);
      if (res && res.success) {
        setFeedbackList(res.data || []);
        if (res.summary) {
          setSummary({
            total: res.summary.total ?? 0,
            average_rating: res.summary.average_rating ?? null,
            filtered_total: res.summary.filtered_total ?? (res.data ? res.data.length : 0),
            distribution: res.summary.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          });
        }
        if (res.pagination) {
          setTotalPages(Math.max(1, res.pagination.total_pages || 1));
        }
      } else {
        setError(res?.message || 'Failed to load feedback records.');
        setFeedbackList([]);
      }
    } catch (err) {
      console.error('Error fetching admin feedback:', err);
      setError('Error connecting to the feedback server.');
      setFeedbackList([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, ratingFilter, appliedSearch]);

  useEffect(() => {
    loadFeedbackData();
  }, [loadFeedbackData]);

  // Auto-refresh when tab is focused
  useEffect(() => {
    const handleFocus = () => loadFeedbackData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadFeedbackData]);

  // Compute satisfaction rate (% of ratings that are 4 or 5 stars)
  const positiveCount = (summary.distribution[5] || 0) + (summary.distribution[4] || 0);
  const satisfactionRate = summary.total > 0
    ? Math.round((positiveCount / summary.total) * 100)
    : 100;

  return (
    <div className="admin-feedback-view" id="admin-feedback-view-container">
      {/* --------------------------------------------------------------------
          Page Header
          -------------------------------------------------------------------- */}
      <div className="admin-feedback-header">
        <div>
          <div className="admin-breadcrumb">OVERVIEW &nbsp;/&nbsp; REPAIR FEEDBACK</div>
          <h1 className="admin-feedback-title">Repair Feedback &amp; Ratings</h1>
          <p className="admin-feedback-subtitle">
            Review reporter ratings, student comments, and overall service satisfaction across all completed facility repairs.
          </p>
        </div>

        <div className="admin-feedback-actions">
          <button
            type="button"
            className="admin-feedback-btn-secondary"
            onClick={loadFeedbackData}
            disabled={loading}
            title="Refresh feedback entries"
            id="admin-feedback-refresh-btn"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          KPI Metric Stat Cards (4 Cards)
          -------------------------------------------------------------------- */}
      <div className="admin-feedback-stats-grid" aria-label="Feedback Metrics Overview">
        {/* Card 1: Average Rating */}
        <div className="admin-feedback-stat-card">
          <div className="admin-feedback-stat-meta">
            <span className="admin-feedback-stat-label">AVERAGE RATING</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="admin-feedback-stat-val">
                {summary.average_rating !== null ? Number(summary.average_rating).toFixed(1) : '5.0'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>/ 5.0</span>
            </div>
            <span className="admin-feedback-stat-sub">
              {summary.total} {summary.total === 1 ? 'total review' : 'total reviews'}
            </span>
          </div>
          <div className="admin-feedback-stat-icon amber" title="Average Rating">
            <Star size={22} fill="#d97706" color="#d97706" />
          </div>
        </div>

        {/* Card 2: Total Reviews */}
        <div className="admin-feedback-stat-card">
          <div className="admin-feedback-stat-meta">
            <span className="admin-feedback-stat-label">TOTAL REVIEWS</span>
            <span className="admin-feedback-stat-val">{summary.total}</span>
            <span className="admin-feedback-stat-sub">Submitted by reporters</span>
          </div>
          <div className="admin-feedback-stat-icon emerald" title="Total Reviews">
            <MessageSquareQuote size={22} />
          </div>
        </div>

        {/* Card 3: Satisfaction Rate */}
        <div className="admin-feedback-stat-card">
          <div className="admin-feedback-stat-meta">
            <span className="admin-feedback-stat-label">SATISFACTION RATE</span>
            <span className="admin-feedback-stat-val">{satisfactionRate}%</span>
            <span className="admin-feedback-stat-sub">4★ and 5★ positive ratings</span>
          </div>
          <div className="admin-feedback-stat-icon blue" title="Positive Satisfaction">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card 4: 5-Star Excellence */}
        <div className="admin-feedback-stat-card">
          <div className="admin-feedback-stat-meta">
            <span className="admin-feedback-stat-label">5-STAR RATINGS</span>
            <span className="admin-feedback-stat-val">{summary.distribution[5] || 0}</span>
            <span className="admin-feedback-stat-sub">Highest excellence score</span>
          </div>
          <div className="admin-feedback-stat-icon purple" title="5 Star Ratings">
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          Filter Pills & Search Controls Card
          -------------------------------------------------------------------- */}
      <div className="admin-feedback-controls-card">
        {/* Upper Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.86rem', color: '#64748b' }}>
            Showing {summary.filtered_total === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(summary.filtered_total, currentPage * pageSize)} of {summary.filtered_total} review{summary.filtered_total === 1 ? '' : 's'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Per page:</span>
            <select
              className="admin-filter-select"
              style={{ padding: '4px 8px', fontSize: '0.82rem', height: 34, minWidth: 'unset' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Reviews per page"
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="admin-feedback-pagination-controls" style={{ marginLeft: 4 }}>
            <button
              type="button"
              className="admin-feedback-page-btn arrow-btn"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {getPageNumbers(currentPage, totalPages).map((pg, idx) =>
              pg === '...' ? (
                <span
                  key={`top-ellipsis-${idx}`}
                  style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={`top-page-${pg}`}
                  type="button"
                  className={`admin-feedback-page-btn ${pg === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pg)}
                  disabled={loading}
                  title={`Page ${pg}`}
                >
                  {pg}
                </button>
              )
            )}

            <button
              type="button"
              className="admin-feedback-page-btn arrow-btn"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div className="admin-feedback-search-box">
            <Search size={16} className="admin-feedback-search-icon" />
            <input
              type="text"
              className="admin-feedback-search-input"
              placeholder="Search ticket, reporter, comment..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              id="admin-feedback-search-input"
            />
          </div>

          {/* Filter Symbol Button & Dropdown Menu */}
          <div className="admin-filter-dropdown-wrap" ref={filterDropdownRef}>
            <button
              type="button"
              className={`admin-filter-btn ${isFilterOpen ? 'open' : ''} ${ratingFilter !== 'all' ? 'has-active' : ''}`}
              onClick={() => setIsFilterOpen((prev) => !prev)}
              aria-expanded={isFilterOpen}
              title="Filter feedback by rating"
              id="admin-feedback-filter-btn"
            >
              <Filter size={15} />
              <span className="admin-filter-btn-text">
                {ratingFilter === 'all'
                  ? 'Filter'
                  : `${ratingFilter} Star${ratingFilter === '1' ? '' : 's'}`}
              </span>
              {ratingFilter !== 'all' && (
                <span className="admin-filter-badge">
                  {summary.distribution[Number(ratingFilter)] || 0}
                </span>
              )}
              <ChevronDown size={14} className={`admin-filter-chevron ${isFilterOpen ? 'rotate' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="admin-filter-menu" role="menu">
                <div className="admin-filter-menu-header">
                  <span>Filter by Rating</span>
                  {ratingFilter !== 'all' && (
                    <button
                      type="button"
                      className="admin-filter-reset-btn"
                      onClick={() => {
                        setRatingFilter('all');
                        setIsFilterOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="admin-filter-menu-list">
                  {FEEDBACK_FILTER_OPTIONS.map((opt) => {
                    const isActive = ratingFilter === opt.key;
                    const count = opt.key === 'all' ? summary.total : (summary.distribution[opt.star] || 0);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`admin-filter-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setRatingFilter(opt.key);
                          setIsFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        role="menuitem"
                      >
                        <span className="admin-filter-item-dot" style={{ backgroundColor: opt.color }} />
                        <span className="admin-filter-item-label">{opt.label}</span>
                        <span className="admin-filter-item-count">{count}</span>
                        {isActive && <Check size={14} className="admin-filter-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          Error or Loading States
          -------------------------------------------------------------------- */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: 10,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadFeedbackData}
            style={{
              background: 'none',
              border: 'none',
              color: '#b91c1c',
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------
          Feedback List Cards
          -------------------------------------------------------------------- */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ margin: 0, fontSize: '0.92rem' }}>Loading reporter feedback…</p>
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="admin-feedback-empty">
          <div className="admin-feedback-empty-icon">
            <MessageSquare size={26} />
          </div>
          <h3 className="admin-feedback-empty-title">No Feedback Records Found</h3>
          <p className="admin-feedback-empty-text">
            {appliedSearch || ratingFilter !== 'all'
              ? 'No feedback entries matched your selected filters or search query.'
              : 'Ratings and written comments will appear here once reporters review completed campus repairs.'}
          </p>
          {(appliedSearch || ratingFilter !== 'all') && (
            <button
              type="button"
              className="admin-feedback-btn-secondary"
              onClick={() => {
                setRatingFilter('all');
                setSearchInput('');
                setAppliedSearch('');
                setCurrentPage(1);
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="admin-feedback-list">
          {feedbackList.map((item) => (
            <article key={item.id} className="admin-feedback-card" id={`admin-feedback-item-${item.id}`}>
              {/* Card Top: Ticket, Title & Stars */}
              <div className="admin-feedback-card-top">
                <div className="admin-feedback-card-title-group">
                  <span className="admin-feedback-ticket-tag">{item.ticket_number}</span>
                  <h3 className="admin-feedback-report-title">{item.report_title}</h3>
                </div>

                <div className="admin-feedback-rating-badge" title={`${item.rating} out of 5 stars`}>
                  <div className="admin-feedback-rating-stars">
                    <FeedbackStars rating={item.rating} />
                  </div>
                  <span className="admin-feedback-rating-num">{item.rating}.0</span>
                </div>
              </div>

              {/* Card Middle: Comments */}
              <div className="admin-feedback-comment-box">
                {item.comments ? (
                  <p style={{ margin: 0, fontStyle: 'normal' }}>“{item.comments}”</p>
                ) : (
                  <p className="admin-feedback-no-comment">No written feedback provided with this rating.</p>
                )}
              </div>

              {/* Card Bottom Meta Row */}
              <div className="admin-feedback-meta-row">
                <div className="admin-feedback-meta-items">
                  <div className="admin-feedback-meta-item">
                    <User size={14} style={{ color: '#059669' }} />
                    <span>
                      Reporter: <strong>{item.reporter_name}</strong>
                    </span>
                  </div>

                  {item.worker_name && (
                    <div className="admin-feedback-meta-item">
                      <Wrench size={14} style={{ color: '#3b82f6' }} />
                      <span>
                        Technician: <strong>{item.worker_name}</strong>
                      </span>
                    </div>
                  )}

                  <div className="admin-feedback-meta-item">
                    <Calendar size={14} />
                    <span>{feedbackDate(item.created_at)}</span>
                  </div>
                </div>

                {onViewReport && item.report_id && (
                  <button
                    type="button"
                    className="admin-feedback-view-report-btn"
                    onClick={() => onViewReport({ id: item.report_id, ticket_number: item.ticket_number })}
                    title={`View report ${item.ticket_number}`}
                    id={`admin-feedback-view-report-${item.id}`}
                  >
                    <span>View Associated Report</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
