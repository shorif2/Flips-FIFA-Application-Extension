// content.js

// =======================
// 🔹 Helper Functions
// =======================
function setNativeValue(el, val) {
  const lastValue = el.value;
  el.value = val;
  el._valueTracker && el._valueTracker.setValue(lastValue);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const allRounds = {
  "Group Stage": "values1",
  "Round Of 32": "values2",
  "Round Of 16": "values3",
  "Quater Final": "values4",
  "Semi Final": "values5",
  Final: "values6",
};

const venue = {
  Atlanta: "ATL",
  Boston: "BST",
  "Los Angeles": "LA",
  Miami: "MIA",
  "New York": "NY/NJ",
  Philadelphia: "PHI",
  "San Francisco": "SF/BA",
  Seattle: "SEA",
  Dallas: "DAL",
  Houston: "HOU",
  "Kansas City": "KC",
};

// =======================
// 🔹 FIFA Form Autofill
// =======================
function fillSecondForm(data) {
  const ageCheckbox = document.querySelector("#contactCriteria\\[AGEVAL\\]");
  const fanSelect = document.querySelector("#contactCriteriaFanOF26\\.values0");
  const venueSelect = document.querySelector("#contactCriteriaVENUE\\.values");
  const address1 = document.querySelector("#address_line_1");
  const state = document.querySelector("#locality_STATE");
  const city = document.querySelector("#address_town_standalone");
  const zip = document.querySelector("#address_zipcode_standalone");
  const phone = document.querySelector("#mobile_number");
  const saveBtn = document.querySelector("#save");

  if (ageCheckbox) {
    ageCheckbox.checked = true;
    ageCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (data.rounds) {
    const rounds = data.rounds
      .split(",")
      .map((city) => city.trim())
      .map((city) => allRounds[city])
      .filter(Boolean);

    rounds.forEach((r) => {
      const checkbox = document.querySelector(`#contactCriteriaROT\\.${r}`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  if (fanSelect) {
    fanSelect.value = "USA";
    fanSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (data.venues && venueSelect) {
    const venuesToSelect = data.venues
      .split(",")
      .map((city) => city.trim())
      .map((city) => venue[city])
      .filter(Boolean);

    Array.from(venueSelect.options).forEach((o) => {
      if (venuesToSelect.includes(o.value)) {
        o.selected = true;
      }
    });

    venueSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (address1 && data.address) setNativeValue(address1, data.address);
  if (city && data.city) setNativeValue(city, data.city);
  if (zip && data.postcode) setNativeValue(zip, data.postcode);
  if (state && data.state) {
    state.value = data.state;
    state.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (phone && data.phone_number) setNativeValue(phone, data.phone_number);
  if (saveBtn) {
    setTimeout(() => {
      saveBtn.click();
      console.log("Save button clicked ✅");
    }, 1000);
  }
}

function initSecondFormAutoFill() {
  const emailInput = document.querySelector("#login");
  if (!emailInput) return;
  const email = emailInput.value;
  if (!email) return;

  fetch(
    `http://localhost:3000/api/search/email?value=${encodeURIComponent(email)}`
  )
    .then((res) => res.json())
    .then((data) => {
      if (data && data.email) fillSecondForm(data);
      fetch("http://localhost:3000/api/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          status: "Interest Submitted",
        }),
      });
    })
    .catch((err) => console.error("Failed to fetch FIFA form data:", err));
}

// =======================
// 🔹 Controller
// =======================
window.addEventListener("load", () => {
  const interval = setInterval(() => {
    // detect address form
    const fifaFormReady =
      document.querySelector("#login") &&
      document.querySelector("#contactCriteria\\[AGEVAL\\]");

    //detect continue button
    const continueBtn = document.querySelector("#btnSubmitProfile");
    if (continueBtn) {
      clearInterval(interval);
      continueBtn.click();
    }

    const introductionDiv = document.querySelector("#introduction");
    if (introductionDiv) {
      const myEntryButton = document.querySelector(
        'a[role="menuitem"][href="/account/lotteryApplications"]'
      );
      if (myEntryButton) myEntryButton.click();
    }

    // detect add card button
    const addCardBtn = [...document.querySelectorAll("button")].find(
      (btn) =>
        btn.innerText.trim() === "Add a new card" ||
        btn.getAttribute("aria-label") === "Add a new card"
    );
    // detect "Enter Draw" button
    const enterDrawBtn = [...document.querySelectorAll("button")].find(
      (btn) =>
        btn.innerText.trim() === "Enter Draw" ||
        btn.getAttribute("aria-label") === "Enter Draw"
    );

    if (fifaFormReady) {
      clearInterval(interval);
      initSecondFormAutoFill();
    }

    if (enterDrawBtn) {
      clearInterval(interval);
      console.log("✅ 'Enter Draw' button found. Clicking...");
      enterDrawBtn.click();

      // Step 2: Wait for the "Yes" button
      const yesBtnInterval = setInterval(() => {
        const yesBtn = document.querySelector("button.yes-btn");
        if (yesBtn) {
          clearInterval(yesBtnInterval);
          console.log("✅ 'Yes' button found. Clicking...");
          yesBtn.click();

          // Step 3: Wait for the "Continue" button
          const continueInterval = setInterval(() => {
            const continueBtn = [...document.querySelectorAll("button")].find(
              (btn) =>
                btn.innerText.trim() === "Continue" ||
                btn.getAttribute("aria-label") === "Continue"
            );

            if (continueBtn) {
              clearInterval(continueInterval);
              console.log("✅ 'Continue' button found. Clicking...");
              continueBtn.click();

              // Step 4: Wait for "Add a new card" button
              const addCardInterval = setInterval(() => {
                const addCardBtn = [
                  ...document.querySelectorAll("button"),
                ].find(
                  (btn) =>
                    btn.innerText.trim() === "Add a new card" ||
                    btn.getAttribute("aria-label") === "Add a new card"
                );

                if (addCardBtn) {
                  clearInterval(addCardInterval);
                  console.log("✅ 'Add a new card' button found. Clicking...");
                  addCardBtn.click();
                }
              }, 1000); // check every second for "Add a new card"
            }
          }, 1000); // check every second for "Continue"
        }
      }, 1000); // check every second for "Yes"
    }
  }, 1000);
});
