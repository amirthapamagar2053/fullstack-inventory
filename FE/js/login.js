if (getToken()) {
  window.location.href = "../index.html";
}

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginSubmit = document.getElementById("loginSubmit");
const nameField = document.getElementById("nameField");
const nameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const passwordHint = document.getElementById("passwordHint");
const modeToggle = document.getElementById("modeToggle");
const loginAltText = document.getElementById("loginAltText");
const brandSubtitle = document.querySelector(".login-brand-subtitle");

let mode = "login";

function setMode(next) {
  mode = next;
  const registering = mode === "register";

  nameField.hidden = !registering;
  nameInput.required = registering;
  passwordHint.hidden = !registering;
  passwordInput.autocomplete = registering ? "new-password" : "current-password";
  passwordInput.minLength = registering ? 8 : 0;

  loginSubmit.textContent = registering ? "Create Account" : "Sign In";
  loginAltText.textContent = registering ? "Already have an account?" : "Need an account?";
  modeToggle.textContent = registering ? "Sign in" : "Create one";
  brandSubtitle.textContent = registering
    ? "Create an account to manage your inventory"
    : "Sign in to manage your inventory";

  loginError.textContent = "";
}

modeToggle.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

// The free Render instance sleeps after 15 minutes, and the first request pays
// a ~50s cold start. Ping /health on load so the wake-up overlaps with typing,
// and say so if it is still waking.
(function wakeApi() {
  const slowNotice = setTimeout(() => {
    if (!loginError.textContent) loginError.textContent = "Waking up the server, this can take a minute...";
  }, 3000);

  fetch(`${API_BASE_URL}/health`)
    .then(() => {
      clearTimeout(slowNotice);
      if (loginError.textContent.startsWith("Waking up")) loginError.textContent = "";
    })
    .catch(() => clearTimeout(slowNotice));
})();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const registering = mode === "register";
  const busyLabel = registering ? "Creating account..." : "Signing in...";
  const idleLabel = registering ? "Create Account" : "Sign In";

  loginError.textContent = "";
  loginSubmit.disabled = true;
  loginSubmit.textContent = busyLabel;

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;
  const body = registering ? { name: nameInput.value.trim(), email, password } : { email, password };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/${registering ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      // Validation failures come back as an array of messages.
      const message = payload && payload.message;
      throw new Error(
        (Array.isArray(message) ? message.join(" ") : message) ||
          (registering ? "Unable to create account." : "Invalid email or password."),
      );
    }

    // Both endpoints return a token, so a new account lands straight on the dashboard.
    setSession(payload.access_token, payload.user);
    window.location.href = "../index.html";
  } catch (error) {
    loginError.textContent = error.message || "Something went wrong. Please try again.";
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = idleLabel;
  }
});
