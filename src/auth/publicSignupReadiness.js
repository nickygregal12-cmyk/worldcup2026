const PUBLIC_SIGNUP_GATE_ITEMS = Object.freeze([
  Object.freeze({
    label: 'Support contact',
    status: 'Ready for later',
    detail: 'Help, scoring questions and deletion requests will use a simple contact line before accounts are opened more widely.',
  }),
  Object.freeze({
    label: 'Capacity and tiers',
    status: 'Ready for later',
    detail: 'The first public phase is planned as a small opening: 50 users and 20 leagues, with a later target of 100 users after email delivery is reviewed.',
  }),
  Object.freeze({
    label: 'Email confirmation',
    status: 'Ready for later',
    detail: 'Email confirmation will be required for public registration.',
  }),
  Object.freeze({
    label: 'Privacy wording',
    status: 'Ready for later',
    detail: 'The privacy note will explain what account and prediction information the game uses.',
  }),
  Object.freeze({
    label: 'Name moderation',
    status: 'Ready for later',
    detail: 'Names are checked before an account is created, so racist, discriminatory, sectarian, abusive or inflammatory wording is blocked early.',
  }),
  Object.freeze({
    label: 'Registration mode',
    status: 'Ready for later',
    detail: 'Accounts can open more widely later, once the remaining launch checks are complete.',
  }),
])

export const PUBLIC_SIGNUP_OWNER_DECISIONS = Object.freeze({
  supportContact: Object.freeze({
    decision: 'Contact admin',
    internalRouting: 'Owner-managed admin contact, without publishing a personal address by default.',
  }),
  initialCapacity: Object.freeze({
    userCap: 50,
    leagueCap: 20,
    reviewBeforeIncrease: true,
    targetAfterEmailSenderUserCap: 100,
    reviewPoint: Object.freeze({
      userCount: 75,
      leagueCount: 15,
    }),
  }),
  hostingAndEmailTier: Object.freeze({
    decision: 'Plan against the current low-cost/free setup initially.',
    review: 'Use a branded email sender before increasing beyond the first small public phase.',
  }),
  emailConfirmation: Object.freeze({
    requiredForPublicRegistration: true,
  }),
  privacy: Object.freeze({
    wording: 'Store the account, display name, league membership, predictions, scores and support/deletion request information needed to run the Euro 2028 Predictor.',
    regionClaim: 'Do not publish a specific data-region claim until the actual project region has been confirmed.',
  }),
  moderation: Object.freeze({
    approach: 'Block racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory display names and league names.',
    implementationRequiredBeforeOpening: true,
    clientPreAuthGuardImplemented: true,
    blockedExample: 'stop the boats',
  }),
  inviteOnly: Object.freeze({
    stayInviteOnlyUntilModeration: false,
    publicOpeningStillBlocked: true,
  }),
})

export const PUBLIC_SIGNUP_IMPLEMENTATION = Object.freeze({
  stage: 'STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1',
  publicRegistrationOpened: false,
  implementedGuards: Object.freeze([
    'Display names are checked for abusive or discriminatory wording before an account can be created.',
    'Display-name availability is checked before the account is created.',
    'Players are told to confirm their email after starting account creation.',
    'The Rules Hub still shows how to get support and what data the predictor uses.',
  ]),
  externalChecksStillRequired: Object.freeze([
    'Email confirmation has been checked in the live account setup.',
    'Euro 2028 account return links have been checked.',
    'Public users have a clear way to contact admin.',
    'The privacy note avoids promising a storage region until it is confirmed.',
    'A branded email sender is needed before the app moves beyond the first small public phase.',
  ]),
})

export const PUBLIC_SIGNUP_READINESS = Object.freeze({
  eyebrow: 'Before public signups',
  title: 'Accounts are closed for now',
  badge: 'Closed for now',
  isOpenForPublic: false,
  detail: 'The app is staying closed while the tournament is still a long way off. The account flow is ready to review again closer to launch.',
  ownerDecisions: PUBLIC_SIGNUP_OWNER_DECISIONS,
  implementation: PUBLIC_SIGNUP_IMPLEMENTATION,
  items: PUBLIC_SIGNUP_GATE_ITEMS,
})

export function buildPublicSignupReadiness() {
  return PUBLIC_SIGNUP_READINESS
}
