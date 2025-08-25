import moment from 'moment-timezone';

export type LocaleDateProps = {
  date: string;
  localeTimezone: string;
};

export const LocaleDate = ({ date, localeTimezone }: LocaleDateProps) => (
  <>{`${moment.tz(date, localeTimezone).format()}`}</>
);
