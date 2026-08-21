export const getEmailConfirmationRedirect = () => `${window.location.origin}/auth`;

export const isEmailNotConfirmedError = (message?: string | null) => {
  if (!message) return false;

  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("email not confirmed");
};