import { clerk } from "./clerk.js";

const app = document.getElementById("clerk-auth");

if (!app) {
  throw new Error('Missing element with id="clerk-auth"');
}

if (clerk.isSignedIn) {
  window.location.replace("/dashboard.html");
} else {
  clerk.mountSignUp(app, {
    forceRedirectUrl: "/registration.html",
    signInUrl: "/login.html",
  });
}
