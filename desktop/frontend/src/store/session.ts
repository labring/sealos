export type OAuthToken = {
  readonly access_token: string;
  readonly token_type: string;
  readonly refresh_token: string;
  readonly expiry: string;
};

export type Session = {
  readonly token: OAuthToken;
  readonly uid: string;
  readonly user_name: string;
};

let session: Session | undefined;

export function setUserInfo(ss: Session) {
  localStorage.setItem('user_info', JSON.stringify(ss));
  session = ss;
}
export function delUserInfo() {
  localStorage.removeItem('user_info');
  session = undefined;
}

export function getUserInfo() {
  if (session === undefined) {
    const got = localStorage.getItem('user_info');

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
