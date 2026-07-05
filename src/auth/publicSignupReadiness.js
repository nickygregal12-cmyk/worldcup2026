const PUBLIC_SIGNUP_GATE_ITEMS = Object.freeze([
  Object.freeze({
    label: 'Support contact',
    status: 'Owner decision',
    detail: 'Choose the dedicated scalable contact for help, deletion requests and scoring questions.',
  }),
  Object.freeze({
    label: 'Capacity and tiers',
    status: 'Owner decision',
    detail: 'Record the planning number, hosting capacity and account-email budget.',
  }),
  Object.freeze({
    label: 'Email confirmation',
    status: 'Owner decision',
    detail: 'Record whether confirmation is enabled before registration opens beyond the trusted test group.',
  }),
  Object.freeze({
    label: 'Privacy region',
    status: 'Owner decision',
    detail: 'Confirm the data-hosting region before publishing the privacy note.',
  }),
  Object.freeze({
    label: 'Name moderation',
    status: 'Implementation gate',
    detail: 'Add blocked-word checks and admin rename proof for player and league names.',
  }),
])

export const PUBLIC_SIGNUP_READINESS = Object.freeze({
  eyebrow: 'Before public signups',
  title: 'Public registration still has owner gates',
  badge: 'Not open yet',
  isOpenForPublic: false,
  detail: 'The rules hub is visible now, but wider registration must wait until the remaining trust, privacy, support and capacity decisions are closed.',
  items: PUBLIC_SIGNUP_GATE_ITEMS,
})

export function buildPublicSignupReadiness() {
  return PUBLIC_SIGNUP_READINESS
}
