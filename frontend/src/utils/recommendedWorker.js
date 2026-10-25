/**
 * Helper to determine the recommended maintenance specialist for a defect report
 * based on the report category, title/description keywords, and staff departments.
 */

const CATEGORY_KEYWORDS_MAP = {
  'air-conditioning': ['hvac', 'air', 'cooling', 'ventilation', 'aircon', 'split', 'ac'],
  'electrical': ['electrical', 'electrician', 'power', 'lighting', 'light', 'wiring', 'circuit', 'breaker', 'socket'],
  'furniture': ['carpentry', 'woodwork', 'furniture', 'chair', 'armchair', 'table', 'desk', 'podium', 'door', 'cabinet'],
  'classroom': ['audio', 'visual', 'classroom', 'av', 'tech', 'projector', 'tv', 'speaker', 'display'],
  'restroom': ['plumbing', 'pipe', 'restroom', 'water', 'drainage', 'toilet', 'faucet', 'sink', 'leak', 'bidet', 'flusher'],
  'internet': ['network', 'telecommunications', 'internet', 'wifi', 'lan', 'telecom', 'router', 'cable', 'ethernet'],
  'cleaning': ['janitorial', 'sanitation', 'cleaning', 'waste', 'trash', 'garbage', 'custodial', 'hygiene'],
  'safety': ['safety', 'hazard', 'general', 'grounds', 'security', 'fire', 'extinguisher', 'railing'],
  'other': ['general', 'maintenance', 'physical plant'],
};

export function getRecommendedWorker(report, staff = []) {
  if (!report || !Array.isArray(staff) || staff.length === 0) return null;

  // Extract category attributes
  const catSlug = (report.category_slug || report.slug || '').toLowerCase();
  const catName = (report.category_name || report.category || '').toLowerCase();
  const catId = Number(report.category_id || 0);
  const title = (report.title || '').toLowerCase();

  let targetCategoryKey = 'other';

  if (
    catSlug === 'air-conditioning' ||
    catId === 1 ||
    catName.includes('air') ||
    catName.includes('hvac') ||
    title.includes('air') ||
    title.includes('ac ') ||
    title.includes('hvac')
  ) {
    targetCategoryKey = 'air-conditioning';
  } else if (
    catSlug === 'electrical' ||
    catId === 2 ||
    catName.includes('electr') ||
    catName.includes('light') ||
    title.includes('electr') ||
    title.includes('power') ||
    title.includes('light')
  ) {
    targetCategoryKey = 'electrical';
  } else if (
    catSlug === 'furniture' ||
    catId === 3 ||
    catName.includes('furnit') ||
    catName.includes('chair') ||
    catName.includes('carp') ||
    title.includes('chair') ||
    title.includes('desk') ||
    title.includes('table')
  ) {
    targetCategoryKey = 'furniture';
  } else if (
    catSlug === 'classroom' ||
    catId === 4 ||
    catName.includes('class') ||
    catName.includes('audio') ||
    catName.includes('projector') ||
    catName.includes('av') ||
    title.includes('projector') ||
    title.includes('tv')
  ) {
    targetCategoryKey = 'classroom';
  } else if (
    catSlug === 'restroom' ||
    catId === 5 ||
    catName.includes('restroom') ||
    catName.includes('plumb') ||
    catName.includes('water') ||
    catName.includes('toilet') ||
    catName.includes('leak') ||
    title.includes('restroom') ||
    title.includes('leak') ||
    title.includes('faucet')
  ) {
    targetCategoryKey = 'restroom';
  } else if (
    catSlug === 'internet' ||
    catId === 6 ||
    catName.includes('internet') ||
    catName.includes('wifi') ||
    catName.includes('net') ||
    title.includes('wifi') ||
    title.includes('internet')
  ) {
    targetCategoryKey = 'internet';
  } else if (
    catSlug === 'cleaning' ||
    catId === 7 ||
    catName.includes('clean') ||
    catName.includes('janitor') ||
    catName.includes('sanitat') ||
    title.includes('clean') ||
    title.includes('trash')
  ) {
    targetCategoryKey = 'cleaning';
  } else if (
    catSlug === 'safety' ||
    catId === 8 ||
    catName.includes('safe') ||
    catName.includes('hazard') ||
    title.includes('safe') ||
    title.includes('hazard')
  ) {
    targetCategoryKey = 'safety';
  }

  const keywords = CATEGORY_KEYWORDS_MAP[targetCategoryKey] || CATEGORY_KEYWORDS_MAP['other'];

  // 1. First priority: Find active technician whose department or role matches keywords
  const matchedStaff = staff.find((member) => {
    const dept = (member.department || '').toLowerCase();
    const role = (member.role_display || member.role_name || '').toLowerCase();
    const spec = (member.specialization || '').toLowerCase();
    return keywords.some((kw) => dept.includes(kw) || role.includes(kw) || spec.includes(kw));
  });

  if (matchedStaff) return matchedStaff;

  // 2. Second priority: Match against General Maintenance technician
  const generalStaff = staff.find((member) => {
    const dept = (member.department || '').toLowerCase();
    return dept.includes('general') || dept.includes('maintenance');
  });

  return generalStaff || staff[0] || null;
}
