if (getToken()) {
  window.location.href = "../index.html";
}

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginSubmit = document.getElementById("loginSubmit");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Signing in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error((payload && payload.message) || "Invalid email or password.");
    }

    setSession(payload.access_token, payload.user);
    window.location.href = "../index.html";
  } catch (error) {
    loginError.textContent = error.message || "Unable to sign in. Please try again.";
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Sign In";
  }
});
