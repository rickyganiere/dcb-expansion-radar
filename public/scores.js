window.RADAR_SCORES = {
  version: "0.1",
  methodology: "Prototype internal opportunity model. Components are directional research scores, not market forecasts or guaranteed commercial outcomes.",
  components: [
    { key: "marketScale", label: "Market scale", description: "Relative mobile/digital audience and commercial scale." },
    { key: "billingCoverage", label: "Billing coverage", description: "Breadth and quality of verified carrier/operator billing routes." },
    { key: "distribution", label: "OTT / VAS distribution", description: "Evidence of operators already distributing and billing digital services." },
    { key: "partnerAccess", label: "Partner access", description: "Availability of relevant operators, aggregators and commercial routes." },
    { key: "evidenceQuality", label: "Evidence quality", description: "Freshness, specificity and confidence of the public evidence currently mapped." }
  ],
  markets: {
    mexico:    { marketScale: 88, billingCoverage: 85, distribution: 82, partnerAccess: 82, evidenceQuality: 78 },
    colombia:  { marketScale: 82, billingCoverage: 65, distribution: 82, partnerAccess: 75, evidenceQuality: 76 },
    brazil:    { marketScale: 96, billingCoverage: 83, distribution: 90, partnerAccess: 84, evidenceQuality: 77 },
    peru:      { marketScale: 78, billingCoverage: 84, distribution: 85, partnerAccess: 80, evidenceQuality: 78 },
    chile:     { marketScale: 82, billingCoverage: 98, distribution: 92, partnerAccess: 87, evidenceQuality: 86 },
    argentina: { marketScale: 91, billingCoverage: 72, distribution: 84, partnerAccess: 73, evidenceQuality: 70 }
  }
};