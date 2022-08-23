import 'firebase/compat/auth';
import firebase from 'firebase/compat/app';

firebase.initializeApp({
  apiKey: "AIzaSyBdZVIp08RqYKc2s88MfH6B8eiwIeK8mpI",
  authDomain: "auth.win11react.com",
  projectId: "win11react",
  storageBucket: "auth.win11react.com",
  messagingSenderId: "213452110834",
  appId: "1:213452110834:web:3a7c957763b93cc29e096b",
  measurementId: "G-N7CJ22ZMSJ"
});

const auth = firebase.auth();
const githubLoginProvider = new firebase.auth.GithubAuthProvider();

async function login() {
  auth.signInWithPopup(githubLoginProvider).then((res) => {
    const token = res.credential.accessToken
    const user = res.additionalUserInfo.username;
    const email = res.user.email;
    console.log(res);
  })
}
export default login;
