# Architecture decisions
**ADR-001 — Keep the stack; no rewrite.** Express/Mongoose/React/Vite retained; layering already sound. Rollback: n/a (additive).
**ADR-002 — Vite 8 + plugin-react 6 instead of `legacy-peer-deps`.** Makes `npm ci` deterministic in CI/Docker. Rollback: pin Vite 7 + plugin-react 4.
**ADR-003 — Visual redesign deferred.** Glass/gradient direction was added by the owner's earlier UI pass; kit says judge by context. Needs owner decision + browser-based responsive QA before restyling.
**ADR-004 — nodemailer 9 → 10.** Required to clear a high advisory; only `createTransport/sendMail` are used. Verified with jsonTransport only; **real SMTP not tested**. Rollback: `npm i nodemailer@9.1.1`.
**ADR-005 — No git history rewrite, no force-push.** Rotation recommended instead.
