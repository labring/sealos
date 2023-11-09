import { observer } from 'mobx-react';
import moment from 'moment-timezone';

export type LocaleDateProps = {
  date: string;
  localeTimezone: string;
};

export const LocaleDate = observer(({ date, localeTimezone }: LocaleDateProps) => (
  <>{`${moment.tz(date, localeTimezone).format()}`}</>
));
