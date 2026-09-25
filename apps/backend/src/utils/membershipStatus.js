const EXPIRING_SOON_DAYS = 7;

const toDateOnly = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const computeMembershipStatus = (endDate) => {
  const today = toDateOnly(new Date());
  const end = toDateOnly(endDate);
  const diffMs = end.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'EXPIRED', daysRemaining };
  }
  if (daysRemaining <= EXPIRING_SOON_DAYS) {
    return { status: 'EXPIRING_SOON', daysRemaining };
  }
  return { status: 'ACTIVE', daysRemaining };
};

const addDays = (startDate, days) => {
  const date = toDateOnly(startDate);
  date.setDate(date.getDate() + Number(days));
  return date;
};

const durationToDays = (value, unit) => {
  const v = Number(value);
  if (unit === 'Months') return v * 30;
  if (unit === 'Years') return v * 365;
  return v;
};

module.exports = {
  EXPIRING_SOON_DAYS,
  computeMembershipStatus,
  addDays,
  durationToDays,
};
