import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, MessageSquare, Star } from 'lucide-react';
import { fetchFeedback, submitFeedback } from '../../services/api';
import './feedback.css';

const ratingLabels = ['Very dissatisfied', 'Dissatisfied', 'Okay', 'Satisfied', 'Very satisfied'];

export function FeedbackStars({ rating }) {
  return (
    <span className="feedback-stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={19} aria-hidden="true" className={value <= Number(rating) ? 'is-filled' : ''} />
      ))}
    </span>
  );
}

export function feedbackDate(value) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReportFeedback({ reportId }) {
  const formId = useId();
  const [result, setResult] = useState(null);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retry, setRetry] = useState(0);
  const requestVersion = useRef(0);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (submitting.current) return;
      const version = ++requestVersion.current;
      const response = await fetchFeedback({ report_id: reportId });
      if (!active || version !== requestVersion.current) return;
      if (response.success || response.httpStatus === 403) {
        setResult(response);
        setError('');
      } else {
        setError(response.message);
      }
    };
    load();
    const interval = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [reportId, retry]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current || !rating) return;
    submitting.current = true;
    requestVersion.current += 1;
    setSaving(true);
    setError('');
    const response = await submitFeedback({ report_id: reportId, rating, comments });
    submitting.current = false;
    requestVersion.current += 1;
    setSaving(false);
    if (response.success) {
      setResult({ ...response, is_reporter: true });
      setSuccess(response.message);
    } else {
      setError(response.message);
      if (response.error_code === 'FEEDBACK_EXISTS') setRetry((value) => value + 1);
    }
  };

  // Reports confirmed by other students can appear in My Reports, but only the author can review them.
  if (result?.httpStatus === 403) return null;

  const feedback = result?.data;
  return (
    <section className="feedback-card" aria-labelledby={`${formId}-heading`}>
      <div className="feedback-heading">
        <MessageSquare size={21} aria-hidden="true" />
        <h2 id={`${formId}-heading`}>{feedback ? (result.is_reporter ? 'Your feedback' : 'Reporter feedback') : 'Repair feedback'}</h2>
      </div>
      {error && <p className="feedback-error" role="alert">{error}</p>}
      {!result && !error && <p className="feedback-muted" role="status">Loading feedback…</p>}
      {!result && error && <button type="button" className="feedback-button secondary" onClick={() => setRetry((value) => value + 1)}>Try again</button>}
      {feedback ? (
        <div className="feedback-saved">
          {success && <p className="feedback-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />{success}</p>}
          <div className="feedback-rating-line"><FeedbackStars rating={feedback.rating} /><strong>{feedback.rating}/5</strong></div>
          {feedback.comments && <p className="feedback-comment">{feedback.comments}</p>}
          <p className="feedback-muted">{feedback.reporter_name} · {feedbackDate(feedback.created_at)}</p>
        </div>
      ) : result?.can_submit ? (
        <form onSubmit={handleSubmit}>
          <p className="feedback-muted">Your repair is complete. Let us know how it went. Your feedback will be visible to the admin and assigned maintenance staff.</p>
          <fieldset className="feedback-rating-field" disabled={saving}>
            <legend>How was the repair?</legend>
            <div className="feedback-star-picker">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="feedback-star-choice">
                  <input type="radio" name={`${formId}-rating`} value={value} checked={rating === value}
                    onChange={() => setRating(value)} required aria-label={`${value} ${value === 1 ? 'star' : 'stars'}: ${ratingLabels[value - 1]}`} />
                  <Star size={34} aria-hidden="true" className={value <= rating ? 'is-filled' : ''} />
                </label>
              ))}
              <span className="feedback-rating-description" aria-live="polite">{rating ? ratingLabels[rating - 1] : 'Choose 1–5 stars'}</span>
            </div>
          </fieldset>
          <label className="feedback-label" htmlFor={`${formId}-comments`}>Your feedback <span>(optional)</span></label>
          <textarea id={`${formId}-comments`} value={comments} onChange={(event) => setComments(event.target.value)}
            rows={4} maxLength={2000} disabled={saving} aria-describedby={`${formId}-count`}
            placeholder="Was the issue fixed? Tell us about the repair and service you received." />
          <div className="feedback-form-footer">
            <span id={`${formId}-count`} className="feedback-muted">{comments.length}/2,000 characters</span>
            <button className="feedback-button" type="submit" disabled={!rating || saving}>{saving ? 'Submitting…' : 'Submit feedback'}</button>
          </div>
        </form>
      ) : result && <p className="feedback-muted">{result.is_reporter ? 'You can rate this repair once it is marked as fixed.' : 'The reporter has not submitted feedback yet.'}</p>}
    </section>
  );
}
