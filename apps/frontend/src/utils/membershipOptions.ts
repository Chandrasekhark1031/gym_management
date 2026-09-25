export function formatMembershipOption(m: {
  id: string;
  plan_name?: string;
  planName?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
}): { id: string; label: string } {
  const plan = m.plan_name || m.planName || 'Plan';
  const start = m.start_date || m.startDate;
  const end = m.end_date || m.endDate;
  const startLabel = start ? new Date(start).toLocaleDateString() : '?';
  const endLabel = end ? new Date(end).toLocaleDateString() : '?';
  return { id: m.id, label: `${plan} (${startLabel} – ${endLabel})` };
}
