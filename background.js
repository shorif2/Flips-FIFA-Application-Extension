// =======================
// 🔹 Helper Functions
// =======================
function setNativeValue(el, val) {
  const lastValue = el.value;
  el.value = val;
  el._valueTracker && el._valueTracker.setValue(lastValue);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// =======================
// 🔹 Iframe Wait Helper
// =======================
function waitForIframeByUrl(tabId, urlPart, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const interval = 250;
    let elapsed = 0;

    const check = () => {
      chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
        if (frames && frames.length) {
          const frame = frames.find((f) => f.url && f.url.includes(urlPart));
          if (frame) return resolve(frame);
        }
        elapsed += interval;
        if (elapsed >= timeout) {
          return reject(
            new Error(`Iframe with '${urlPart}' not found after ${timeout}ms`)
          );
        }
        setTimeout(check, interval);
      });
    };
    check();
  });
}

// =======================
// 🔹 Injected Functions
// =======================

// Extract full name from FIFA header iframe
function extractFullNameFromHeader() {
  const el = document.querySelector("a.fp-menu-item.user_name");
  return el ? el.textContent.trim() : null;
}

// Fill card form in payment iframe
function fillCardFormInIframe(data) {
  function setValue(el, value) {
    if (!el) return;
    try {
      el.focus && el.focus();
      el.value = value ?? "";
      if (el._valueTracker && typeof el._valueTracker.setValue === "function") {
        el._valueTracker.setValue(value ?? "");
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (err) {}
  }

  const numberEl =
    document.querySelector("#card_number") ||
    document.querySelector("input[name='cardnumber']");
  const holderEl =
    document.querySelector("#card_holder") ||
    document.querySelector("input[name='cardholder']");
  const monthEl =
    document.querySelector("#card_expiration_date_month") ||
    document.querySelector("select[name='exp_month']");
  const yearEl =
    document.querySelector("#card_expiration_date_year") ||
    document.querySelector("select[name='exp_year']");
  const cvvEl =
    document.querySelector("#card_cvv") ||
    document.querySelector("input[name='cvv']");

  setValue(numberEl, data.card_number);
  setValue(holderEl, data.name || data.holder);
  setValue(monthEl, data.month);
  setValue(yearEl, data.year);
  setValue(cvvEl, data.cvv);

  // const addNowBtn = document.querySelector(
  //   "button.widgetPayNowButton, button.sc-dIUggk.widgetPayNowButton"
  // );

  // if (addNowBtn) {
  //   console.log("✅ Found 'Add now' button. Clicking...");
  //   addNowBtn.click();
  //   fetch("http://localhost:3000/data/update-status", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ email: data.email, status: "Completed" }),
  //   });
  // } else {
  //   console.warn("❌ 'Add now' button not found.");
  // }

  return true;
}

// Fill login form if present
function fillLoginForm(data) {
  const email = document.querySelector("input[type='email'], #email");
  const pass = document.querySelector("input[type='password'], #password");
  const btn = document.querySelector(
    "button[type='submit'], #loginFormSubmitBtn"
  );

  if (email && data.email) setNativeValue(email, data.email);
  if (pass && data.password) setNativeValue(pass, data.password);

  if (btn) {
    console.log("✅ Login form auto-filled. Submitting...");
    btn.click();
    fetch("http://localhost:3000/api/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, status: "Used" }),
    });
    return true;
  } else {
    console.warn("❌ Login form submit button not found.");
    return false;
  }
}

// =======================
// 🔹 Main Extension Flow
// =======================
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 1) Detect if login form exists
    const loginCheck = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return !!(
          document.querySelector("input[type='email'], #email") &&
          document.querySelector("input[type='password'], #password")
        );
      },
    });

    const loginFormExists = loginCheck && loginCheck[0] && loginCheck[0].result;

    if (loginFormExists) {
      console.log("Login form detected. Fetching credentials...");

      // Fetch login data
      const response = await fetch(
        "http://localhost:3000/api/search/status?value=N/A"
      );
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const loginData = await response.json();

      // Autofill login form
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillLoginForm,
        args: [loginData],
      });

      console.log("✅ Login autofill attempted.");
      return; // stop here
    }

    // 2) Otherwise → continue with card autofill
    console.log("No login form detected. Running card autofill...");

    // Step 1: Get user name from FIFA header iframe
    let fullName = "Unknown User";
    try {
      const headerFrame = await waitForIframeByUrl(
        tab.id,
        "fifa-fwc26-us.tickets.fifa.com/api/1/resources/custom/en/header.html",
        10000
      );
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [headerFrame.frameId] },
        func: extractFullNameFromHeader,
      });
      if (result && result[0] && result[0].result) {
        fullName = result[0].result;
      }
    } catch (err) {
      console.error("Could not read name from header iframe:", err);
    }

    // Step 2: Call local API with name
    let apiData = null;
    try {
      const encodedName = encodeURIComponent(fullName);
      const url = `http://localhost:3000/api/search/name?value=${encodedName}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      apiData = await response.json();
    } catch (err) {
      console.error("Failed to fetch data from local API:", err);
      return;
    }

    // Step 3: Fill payment iframe
    try {
      const paymentIframe = await waitForIframeByUrl(
        tab.id,
        "https://payment-p8.secutix.com/alias",
        15000
      );

      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [paymentIframe.frameId] },
        func: fillCardFormInIframe,
        args: [apiData],
      });
    } catch (err) {
      console.error("Payment iframe not found or injection failed:", err);
    }
  } catch (err) {
    console.error("❌ Error in extension flow:", err);
  }
});
