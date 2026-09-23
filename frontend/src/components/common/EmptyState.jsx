import React from 'react';
import { Clipboard, Bell, Wrench, Search, Plus } from 'lucide-react';
import './modals.css';

export const EMPTY_STATE_PRESETS = {
  'no-reports': {
    id: 'no-reports',
    title: 'No Reports Yet',
    desc: "You haven't submitted any maintenance reports yet.",
    icon: Clipboard,
    actionText: 'Report an Issue',
    hasPlus: true,
    actionClass: 'empty-state-btn-primary',
  },
  'no-notifications': {
    id: 'no-notifications',
    title: 'No Notifications',
    desc: "You're all caught up! No new notifications.",
    icon: Bell,
    actionText: 'Back to Dashboard',
    hasPlus: false,
    actionClass: 'empty-state-btn-outline',
  },
  'no-assigned': {
    id: 'no-assigned',
    title: 'No Assigned Jobs',
    desc: 'No maintenance jobs are currently assigned to you.',
    icon: Wrench,
    actionText: 'View Completed Jobs',
    hasPlus: false,
    actionClass: 'empty-state-btn-outline',
  },
  'no-results': {
    id: 'no-results',
    title: 'No Results Found',
    desc: "We couldn't find any reports matching your search.",
    icon: Search,
    actionText: 'Clear Filters',
    hasPlus: false,
    actionClass: 'empty-state-btn-outline',
  },
};

export default function EmptyState({
  presetId = 'no-reports',
  title,
  desc,
  icon: CustomIcon,
  actionText,
  actionClass,
  onAction,
}) {
  const preset = EMPTY_STATE_PRESETS[presetId] || EMPTY_STATE_PRESETS['no-reports'];
  const IconComp = CustomIcon || preset.icon;
  const resolvedTitle = title || preset.title;
  const resolvedDesc = desc || preset.desc;
  const resolvedActionText = actionText || preset.actionText;
  const resolvedActionClass = actionClass || preset.actionClass;

  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-circle">
        <IconComp size={24} strokeWidth={1.75} />
      </div>
      <h3 className="empty-state-title">{resolvedTitle}</h3>
      <p className="empty-state-desc">{resolvedDesc}</p>
      {resolvedActionText && (
        <button
          type="button"
          className={resolvedActionClass}
          onClick={onAction}
        >
          {preset.hasPlus && <Plus size={16} strokeWidth={2.5} />}
          <span>{resolvedActionText}</span>
        </button>
      )}
    </div>
  );
}
