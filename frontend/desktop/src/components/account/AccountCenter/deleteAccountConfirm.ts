export const isDeleteAccountConfirmationMatched = ({
  accountName,
  expectedAccountName,
  confirmationText,
  expectedConfirmationText
}: {
  accountName: string;
  expectedAccountName?: string;
  confirmationText: string;
  expectedConfirmationText: string;
}) =>
  !!expectedAccountName &&
  !!expectedConfirmationText &&
  accountName === expectedAccountName &&
  confirmationText === expectedConfirmationText;

export const isForceDeleteConfirmationMatched = (
  confirmationText: string,
  expectedConfirmationText: string
) => !!expectedConfirmationText && confirmationText === expectedConfirmationText;
