const PUBLIC_SIGNUP_GATE_ITEMS = Object.freeze([
  Object.freeze({
    label: 'Support contact',
    status: 'Decision recorded',
    detail: 'Help, scoring questions and deletion requests will use a simple Contact admin line. A personal address should not be published unless approved later.',
  }),
  Object.freeze({
    label: 'Capacity and tiers',
    status: 'Decision recorded',
    detail: 'Before a branded email sender is added, keep the first public phase to 50 users and 20 leagues. The next target is 100 users after email delivery is reviewed.',
  }),
  Object.freeze({
    label: 'Email confirmation',
    status: 'Decision recorded',
    detail: 'Email confirmation will be required for public registration.',
  }),
  Object.freeze({
    label: 'Privacy region',
    status: 'Decision recorded',
    detail: 'The privacy note should explain the predictor data stored and avoid naming a data region until that region is confirmed.',
  }),
  Object.freeze({
    label: 'Name moderation',
    status: 'Implementation recorded',
    detail: 'Name checks for racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory wording are enforced before an account is created; public opening still waits for external account and safety checks.',
  }),
  Object.freeze({
    label: 'Registration mode',
    status: 'Decision recorded',
    detail: 'Public registration does not need to stay invite-only once moderation and the remaining safety checks are finished.',
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
  title: 'Public registration still has safety checks',
  badge: 'Not open yet',
  isOpenForPublic: false,
  detail: 'The required choices are recorded, but wider registration must wait until the moderation and operational checks are finished.',
  ownerDecisions: PUBLIC_SIGNUP_OWNER_DECISIONS,
  implementation: PUBLIC_SIGNUP_IMPLEMENTATION,
  items: PUBLIC_SIGNUP_GATE_ITEMS,
})

export function buildPublicSignupReadiness() {
  return PUBLIC_SIGNUP_READINESS
}
