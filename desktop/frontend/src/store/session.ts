export type OAuthToken = {
  readonly access_token: string;
  readonly token_type: string;
  readonly refresh_token: string;
  readonly expiry: string;
};

export type UserInfo = {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
};

export type Session = {
  readonly token: OAuthToken;
  readonly user: UserInfo;
};

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
