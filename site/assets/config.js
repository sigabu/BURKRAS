// Public configuration only. Never put database passwords or API secrets here.
export const config = Object.freeze({
  DEMO_MODE: true,
  // TODO(BACKEND): Set the HTTPS API URL and turn demo off AFTER the server is ready.
  API_URL: "",
  // TODO(CONTACTS): Replace with owner's confirmed phone, email and messenger URL.
  contacts: { phone: null, email: null, messengerUrl: null },
  // TODO(PRICING): Educational tariffs for the demo, NOT the company's approved price list.
  pricing: {
    minimum: 2500,
    drillingPerCm: { brick: 30, concrete: 40, reinforced: 50 },
    cuttingPerMetre: { brick: 1200, concrete: 1600, reinforced: 2100 },
    demolitionPerM2: { brick: 1100, concrete: 1600, reinforced: 2200 },
    upperMultiplier: 1.3,
  },
});
