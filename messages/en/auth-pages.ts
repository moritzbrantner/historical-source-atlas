export const authPages = {
  login: {
    eyebrow: 'Welcome back',
    heroTitle: 'Sign in to continue where you left off.',
    heroDescription:
      'Access your profile, saved settings, and protected tools with your email and password.',
    title: 'Log in',
    description: 'Use your account credentials to access the application.',
    form: {
      email: 'Email',
      password: 'Password',
      otpCode: 'One-time password',
      submit: 'Log in',
      submitting: 'Logging in...',
      requestOtp: 'Email me a login code',
      requestingOtp: 'Sending code...',
      verifyOtp: 'Log in with code',
      verifyingOtp: 'Checking code...',
      otpSent: 'If that account exists, a login code is on its way.',
      otpRequestError: 'Unable to send a login code right now.',
      invalidOtp: 'The one-time password is invalid or has expired.',
      invalidCredentials: 'Email or password is incorrect.',
      requiredEmail: 'Email is required.',
      invalidEmail: 'Enter a valid email address.',
      requiredPassword: 'Password is required.',
      requiredOtp: 'Enter the 6-digit code from your email.',
      registerPrompt: 'Need an account?',
      registerCta: 'Create one',
      social: {
        divider: 'Or continue with',
        providers: {
          google: 'Continue with Google',
          facebook: 'Continue with Facebook',
          x: 'Continue with X',
        },
      },
      socialErrors: {
        access_denied: '{provider} sign-in was canceled or denied.',
        missing_code:
          '{provider} sign-in did not return an authorization code.',
        invalid_state:
          '{provider} sign-in could not be verified. Please try again.',
        expired_state: '{provider} sign-in took too long. Please try again.',
        provider_mismatch:
          'The {provider} sign-in flow no longer matches this browser session.',
        missing_config: '{provider} sign-in is not configured right now.',
        token_exchange_failed:
          '{provider} sign-in could not be completed. Please try again.',
        profile_fetch_failed:
          'We could not read your {provider} profile. Please try again.',
        identity_resolution_failed:
          '{provider} sign-in could not be matched to an app account. Please try again.',
      },
    },
  },
  register: {
    eyebrow: 'Create your account',
    heroTitle: 'Start with a secure account and verify your email.',
    heroDescription:
      'Register with a valid email and a strong password. You can sign in after you confirm the link in your inbox.',
    title: 'Register',
    description:
      'Set up your account with credentials that meet the security requirements.',
    form: {
      name: 'Display name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      submit: 'Create account',
      submitting: 'Creating account...',
      success:
        'Account created. Check your email and confirm the verification link before logging in.',
      requiredEmail: 'Email is required.',
      invalidEmail: 'Enter a valid email address.',
      requiredPassword: 'Password is required.',
      weakPassword:
        'Use at least 10 characters with uppercase, lowercase, and a number.',
      requiredConfirmPassword: 'Please confirm your password.',
      passwordMismatch: 'Passwords do not match.',
      nameTooLong: 'Display name must be 80 characters or fewer.',
      continue: 'Continue',
      back: 'Back',
      genericError:
        'Unable to create your account right now. Please try again.',
      loginPrompt: 'Already have an account?',
      loginCta: 'Log in',
      social: {
        divider: 'Or continue with',
        providers: {
          google: 'Continue with Google',
          facebook: 'Continue with Facebook',
          x: 'Continue with X',
        },
      },
      socialErrors: {
        access_denied: '{provider} sign-in was canceled or denied.',
        missing_code:
          '{provider} sign-in did not return an authorization code.',
        invalid_state:
          '{provider} sign-in could not be verified. Please try again.',
        expired_state: '{provider} sign-in took too long. Please try again.',
        provider_mismatch:
          'The {provider} sign-in flow no longer matches this browser session.',
        missing_config: '{provider} sign-in is not configured right now.',
        token_exchange_failed:
          '{provider} sign-in could not be completed. Please try again.',
        profile_fetch_failed:
          'We could not read your {provider} profile. Please try again.',
        identity_resolution_failed:
          '{provider} sign-in could not be matched to an app account. Please try again.',
      },
      resetPasswordTitle: 'Need to reset an existing password?',
      resetPasswordDescription:
        'Send a secure reset link without leaving this page.',
      resetPasswordEmail: 'Account email',
      resetPasswordSubmit: 'Send reset link',
      resetPasswordSubmitting: 'Sending reset link...',
      resetPasswordSuccess:
        'If that account exists, a reset link is on its way.',
      resetPasswordGenericError: 'Unable to send a reset link right now.',
    },
  },
  resetPassword: {
    eyebrow: 'Account recovery',
    title: 'Choose a new password',
    description:
      'Use the secure token from your email to set a fresh password.',
    missingToken: 'This reset link is incomplete or has already been used.',
    success: 'Your password has been updated. You can sign in now.',
    loginCta: 'Return to login',
    form: {
      password: 'New password',
      confirmPassword: 'Confirm new password',
      submit: 'Update password',
      submitting: 'Updating password...',
      requiredPassword: 'Password is required.',
      weakPassword:
        'Use at least 10 characters with uppercase, lowercase, and a number.',
      requiredConfirmPassword: 'Please confirm your password.',
      passwordMismatch: 'Passwords do not match.',
      genericError: 'Unable to reset your password with this link.',
    },
  },
  verifyEmail: {
    eyebrow: 'Account verification',
    title: 'Verify your email',
    description:
      'We are checking the secure verification link from your email now.',
    verifying: 'Verifying your email address...',
    success: 'Your email is verified. You can continue using your account.',
    error: 'This verification link is invalid or has expired.',
    loginCta: 'Go to login',
    registerCta: 'Create another account',
  },
};
