// Draft legal documents written from what this application actually does. Every [bracketed] item
// needs the owner's input, and a qualified lawyer must review the text before launch.
// No document may claim licensing, insurance or compliance that has not been verified.
export const DRAFT_NOTICE =
  'Draft template written from what this application actually stores and does. Replace every [bracketed] item and have a qualified lawyer review it for your jurisdiction before launch.';

export const LEGAL_DOCS = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary: "What personal data is collected, why, and your rights.",
    description: "How this service handles personal data (draft).",
    sections: [

      ['Who we are', 'This service is operated by [Legal entity name], [registered address]. Contact for privacy requests: [privacy contact email].'],
      ['What we collect', 'Account details (name, email, phone, address); account and transaction records; KYC details you submit (document type, document number and any uploaded document); service requests, loan and insurance applications; security and audit logs (actions taken, IP address, request ID).'],
      ['Why we use it', 'To provide banking services, verify identity, prevent fraud, meet legal obligations and keep your account secure.'],
      ['Cookies and storage', 'We use one HTTP-only cookie to keep you signed in (a rotating refresh token) and your browser stores your light/dark theme choice. We do not use advertising or analytics trackers.'],
      ['Sharing', 'We do not sell personal data. Data is shared only with service providers needed to run the service (hosting, database, email delivery: [list providers]) and where the law requires it.'],
      ['Retention', 'Records are kept for [retention period] after account closure, or longer where the law requires.'],
      ['Your rights', 'Subject to applicable law you may request access to, correction of, or deletion of your data by contacting [privacy contact email].'],
      ['Security', 'Passwords are hashed, sessions use short-lived tokens, and access is role-restricted and audit-logged. No system is perfectly secure; report concerns to [security contact email].']
    ]
  },
  {
    slug: "terms-of-use",
    title: "Terms of Use",
    summary: "The rules for using the service.",
    description: "Terms for using this service (draft).",
    sections: [

      ['Acceptance', 'By creating an account or using this service you agree to these terms.'],
      ['Your account', 'Keep your credentials confidential and tell us promptly about unauthorised use. You are responsible for activity under your account.'],
      ['Permitted use', 'Use the service lawfully. Do not attempt to bypass security controls, access other customers\u2019 data, or disrupt the service.'],
      ['Transactions', 'Transfers, deposits and withdrawals are subject to balance, limit, verification and fraud checks, and may be delayed, held or declined to comply with law or protect you.'],
      ['Verification (KYC)', 'Some features require identity verification. We may restrict an account until verification is complete.'],
      ['Availability', 'We aim for high availability but do not guarantee uninterrupted service.'],
      ['Liability', '[Limitation of liability wording to be supplied by counsel for your jurisdiction.]'],
      ['Changes and contact', 'We may update these terms and will post the new version here. Questions: [contact email]. Governing law: [jurisdiction].']
    ]
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    summary: "The one sign-in cookie and one stored preference this service uses.",
    description: "Cookies and browser storage used by this service (draft).",
    sections: [
      [
            "What this page covers",
            "This service does not use advertising, analytics or tracking cookies. It uses one cookie that is strictly necessary to keep you signed in, and one browser-storage entry that remembers your light or dark theme."
      ],
      [
            "Sign-in cookie",
            "Name: refreshToken. Purpose: lets the service issue a new short-lived access token without asking you to sign in again. It is HTTP-only (scripts in the page cannot read it), SameSite=Strict, limited to the /api/auth path, and marked Secure when the service runs in production. Default lifetime: 7 days (the operator may change it). It is removed when you sign out."
      ],
      [
            "Access token",
            "Your short-lived access token (15 minutes by default) is held in the page memory only. It is not written to cookies or to browser storage, and disappears when you close or reload the page."
      ],
      [
            "Theme preference",
            "Name: theme (browser local storage). Value: light or dark. Purpose: remembers your display choice. It is never sent to the server."
      ],
      [
            "What is not used",
            "No analytics, advertising, social-media or fingerprinting tools are loaded by this application. If that changes, this page and the privacy policy must be updated first."
      ],
      [
            "Your choices",
            "You can delete cookies and site data in your browser settings; you will then be signed out. Blocking the sign-in cookie means you cannot stay signed in."
      ],
      [
            "Consent",
            "Because these items are strictly necessary for the service you request, many jurisdictions do not require a consent banner for them. [Owner/counsel: confirm for your jurisdiction.]"
      ],
      [
            "Contact",
            "Questions: [privacy contact email]."
      ]
]
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    summary: "What you must not do, for customers and staff.",
    description: "Acceptable use rules for this service (draft).",
    sections: [
      [
            "Purpose",
            "These rules keep the service safe for customers and staff."
      ],
      [
            "You must not",
            "Use the service for anything unlawful, including fraud, money laundering or attempts to hide the origin of funds. Access, or try to access, another person's account or data. Try to bypass or test security controls, rate limits or role restrictions without written permission. Run automated tools that scrape, flood or overload the service. Share your credentials, or use someone else's. Upload malware or content you have no right to submit."
      ],
      [
            "Staff accounts",
            "Employees and administrators may use the service only for the tasks their role authorises. Actions are recorded in an audit log."
      ],
      [
            "Reporting abuse or a security problem",
            "Tell us at [security contact email]. Please do not publish a vulnerability before we have had a reasonable chance to fix it."
      ],
      [
            "What may happen",
            "An administrator can restrict or deactivate an account that breaks these rules, and transactions may be held, declined or reported where the law requires. [Owner: describe any appeal process.]"
      ],
      [
            "Changes",
            "This policy may change; the latest version is always on this page."
      ]
]
  },
  {
    slug: "disclaimer",
    title: "Service Disclaimer",
    summary: "What this banking-style application is and is not.",
    description: "What this service is and is not (draft).",
    sections: [
      [
            "What this service is",
            "This is a banking-style application built with engineering controls: sign-in, role-based access, audit logging, idempotent money movement and similar safeguards."
      ],
      [
            "What it is not",
            "It is not, by itself, a legal, regulatory, AML/KYC, PCI, privacy or banking-compliance certification. Operating it with real customers requires organisation-specific security review, legal and regulatory review, operational controls, monitoring, incident response and approval."
      ],
      [
            "Who operates it",
            "[Owner: state the operating organisation and whether it is a licensed or regulated financial institution. Until that is stated, nobody should treat this deployment as a regulated bank.]"
      ],
      [
            "No advice",
            "Information shown in the service is not financial, legal or tax advice."
      ],
      [
            "Availability and accuracy",
            "Balances and statuses reflect the data held by the service at the moment you view them. The service may be unavailable or delayed, and transactions can be held for verification."
      ],
      [
            "Deposit protection",
            "[Owner: state truthfully whether any deposit-protection scheme applies. Do not imply protection that does not exist.]"
      ]
]
  },
  {
    slug: "support",
    title: "Support",
    summary: "How to get help and report problems.",
    description: "How to contact support (draft).",
    sections: [
      [
            "How to get help",
            "Email [support email]. [Owner: add phone/hours and a typical response time only if you can honour them.]"
      ],
      [
            "What to include",
            "Your registered email address, what you were trying to do, and the time it happened. Never send your password, one-time codes or full card details."
      ],
      [
            "Locked out or cannot sign in",
            "Use Forgot password on the sign-in page. If the account has been deactivated by an administrator, contact support."
      ],
      [
            "Security concerns",
            "Report suspected unauthorised access immediately to [security contact email]."
      ],
      [
            "Complaints",
            "[Owner: describe the complaints process required in your jurisdiction.]"
      ]
]
  },
  {
    slug: "delete-account",
    title: "Delete Your Account",
    summary: "What deletion means here, and what is kept.",
    description: "What account deletion means for this service (draft).",
    sections: [
      [
            "Current situation",
            "This service does not offer self-service account deletion. An administrator can deactivate an account; a deactivated account can no longer sign in."
      ],
      [
            "How to ask",
            "Contact [support email] from the email address registered on the account and ask for deactivation or deletion. [Owner: describe identity checks and the timeline you commit to.]"
      ],
      [
            "What may be kept",
            "Financial and audit records may have to be kept for [retention period] to meet legal, regulatory, fraud-prevention and accounting obligations, even after an account is deactivated. Personal data that is not needed for those purposes may be removed or anonymised. [Owner: confirm exactly what is deleted and when.]"
      ],
      [
            "What cannot be undone",
            "Once data is deleted or anonymised it cannot be restored from the service. Back-ups age out on their own schedule: [backup retention period]."
      ],
      [
            "Before you ask",
            "Withdraw or transfer any remaining balance and settle open loans or insurance policies; an account with open obligations may need to stay active."
      ]
]
  },
];

export const legalPath = (slug) => `/legal/${slug}`;
