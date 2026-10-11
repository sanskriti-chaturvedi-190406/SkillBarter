import { clerk } from "./clerk.js";

console.log("Clerk loaded successfully!");
console.log("Signed in:", clerk.isSignedIn);

const app = document.getElementById("clerk-auth");

if (app) {
  if (clerk.isSignedIn) {
    app.innerHTML = '<div id="user-button"></div>';
    clerk.mountUserButton(document.getElementById("user-button"));
  } else {
    clerk.mountSignIn(app, {
      forceRedirectUrl: "/index.html",
      signUpForceRedirectUrl: "/index.html",
    });
  }
}