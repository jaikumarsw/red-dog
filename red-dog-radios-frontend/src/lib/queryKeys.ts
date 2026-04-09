export const qk = {
  dashboard: () => ["dashboard/stats"] as const,
  organizations: () => ["organizations"] as const,
  opportunities: () => ["opportunities"] as const,
  applications: () => ["applications"] as const,
  matches: () => ["matches"] as const,
  alerts: () => ["alerts"] as const,
  alertsUnread: () => ["alerts/unread"] as const,
  digests: () => ["digests"] as const,
  outbox: () => ["outbox"] as const,
  agencies: () => ["agencies"] as const,
  settings: () => ["settings"] as const,
};
