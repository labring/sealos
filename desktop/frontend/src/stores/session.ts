import { Session } from '../interfaces/session';

let session: Session | undefined;

export function setSession(ss: Session) {
  localStorage.setItem('session', JSON.stringify(ss));
  session = ss;
}
export function delSession() {
  localStorage.removeItem('session');
  session = undefined;
}

export function getSession() {
  if (session === undefined) {
    const got = localStorage.getItem('session');

    if (got && got !== '') {
      const got_obj = JSON.parse(got);
      if (got_obj && got_obj.token !== undefined) {
        session = got_obj;
      }
    }
  }
  return session;
}

export function isUserLogin() {
  return session === undefined ? false : true;
}
