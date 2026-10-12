/**
 * Pure classification of why a login would fail. Mirrors authController.login, which answers
 * "Invalid email or password" for exactly three reasons (and deliberately never says which).
 */
const diagnose = ({ user, passwordProvided, passwordMatches }) => {
  if (!user) {
    return {
      code: 'NOT_FOUND',
      summary: 'No user with this email exists in the database the backend is connected to.',
      next: [
        'Wrong database? Compare the database name above with the one you used when you created these users.',
        'Customers: create the account on the Register page (password of 12+ characters).',
        'Employees/admins: sign in as an admin and use Users -> Create user. No admin yet? Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD (12+ chars) in backend/.env and run: npm run seed'
      ]
    };
  }
  if (!user.isActive) {
    return {
      code: 'INACTIVE',
      summary: 'The user exists but is deactivated, so login is refused.',
      next: ['Sign in as an admin and re-activate the user on the Users page.']
    };
  }
  if (!passwordProvided) {
    return {
      code: 'FOUND_UNCHECKED',
      summary: 'The user exists and is active. No password was supplied, so it was not checked.',
      next: ['Re-run with the CHECK_PASSWORD environment variable set to test the password (see APPLY_UPGRADE.md).']
    };
  }
  if (!passwordMatches) {
    return {
      code: 'WRONG_PASSWORD',
      summary: 'The user exists and is active, but this password does not match the stored one.',
      next: [
        'Use "Forgot password" (needs working SMTP settings), or ask an admin to recreate the user.',
        'Passwords are case-sensitive; check for a trailing space and for keyboard layout differences on # ! @.'
      ]
    };
  }
  return { code: 'OK', summary: 'The user exists, is active and the password matches. Login should succeed.', next: ['If the browser still shows an error, check the Network tab: the request must reach the backend (port 5000) and not be blocked by CORS or the rate limiter (HTTP 429).'] };
};

module.exports = { diagnose };
