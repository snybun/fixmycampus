import React, { useEffect, useId, useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { fetchFeedback } from '../../services/api';
import { FeedbackStars, feedbackDate } from './ReportFeedback';
import './feedback.css';

export default function FeedbackOverview({ scopeKey = 'admin', maintenance = false }) {
  const headingId = useId();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setResult(null);
    const load = async () => {
      const response = await fetchFeedback({ page, limit: 5 });
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
  }, [page, retry, scopeKey]);

  const total = result?.summary?.total || 0;
  return (
    <section className="feedback-card feedback-overview" aria-labelledby={headingId}>
      <div className="feedback-overview-header">
        <div>
          <div className="feedback-heading"><MessageSquare size={21} aria-hidden="true" /><h2 id={headingId}>Repair feedback</h2></div>
          <p className="feedback-muted">{maintenance ? 'Ratings and comments from reporters of your assigned jobs.' : 'Ratings and comments from reporters across campus.'}</p>
        </div>
        {total > 0 && <div className="feedback-summary"><Star size={24} aria-hidden="true" /><strong>{Number(result.summary.average_rating).toFixed(1)}<small>/5</small></strong><span>{total} {total === 1 ? 'review' : 'reviews'}</span></div>}
      </div>
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
      {result?.pagination.total_pages > 1 && <nav className="feedback-pagination" aria-label="Feedback pages">
        <button type="button" className="feedback-button secondary" disabled={loading || result.pagination.page <= 1} onClick={() => setPage(result.pagination.page - 1)}>Previous</button>
        <span>Page {result.pagination.page} of {result.pagination.total_pages}</span>
        <button type="button" className="feedback-button secondary" disabled={loading || result.pagination.page >= result.pagination.total_pages} onClick={() => setPage(result.pagination.page + 1)}>Next</button>
      </nav>}
    </section>
  );
}
