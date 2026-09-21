window.RADAR_PARTNERS = [
  {
    id: "digital-virgo",
    name: "Digital Virgo",
    type: "DCB / mobile payments / content monetization",
    confidence: "verified",
    summary: "Current payment hub connecting merchants, OTTs and telcos through a single API, with declared Latin American presence across all six pilot markets.",
    countries: ["mexico","colombia","brazil","peru","chile","argentina"],
    capabilities: ["Direct Carrier Billing","Mobile payments","Merchant aggregation","Content monetization","Anti-fraud","Reporting"],
    currentEvidence: {
      label: "Digital Virgo LATAM + DV PASS",
      url: "https://www.digitalvirgo.com/es/region/latin-america/"
    },
    routes: [
      { marketId: "mexico", operator: "Telcel", status: "historical-recheck", note: "Documented Telcel DCB/content launch; relationship should be reconfirmed for current merchant onboarding.", evidence: "https://www.digitalvirgo.com/newsroom/digital-virgo-launches-top-music-tv-with-telcel-mexico/" },
      { marketId: "peru", operator: "Entel Perú", status: "historical-recheck", note: "Documented Entel DCB/content partnership; current commercial route should be reconfirmed.", evidence: "https://www.digitalvirgo.com/es/newsroom/lanzamiento-con-entel/" },
      { marketId: "chile", operator: "Movistar Chile", status: "historical-recheck", note: "Documented DCB content launch with Movistar Chile; current commercial route should be reconfirmed.", evidence: "https://www.digitalvirgo.com/es/newsroom/lanzamiento-plataforma-fitness-movistar-chile/" }
    ]
  },
  {
    id: "boku",
    name: "Boku",
    type: "Local payments / DCB platform",
    confidence: "verified",
    summary: "Global local-payments platform with direct carrier billing among its supported methods. Current Boku network coverage lists five of the six pilot LATAM markets.",
    countries: ["mexico","colombia","brazil","chile","argentina"],
    capabilities: ["Direct Carrier Billing","Local payment methods","Recurring billing","One API","Tokenized connections"],
    currentEvidence: {
      label: "Boku network coverage",
      url: "https://www.boku.com/network/"
    },
    routes: [
      { marketId: "mexico", operator: "Country coverage", status: "route-discovery", note: "Boku lists Mexico in its LATAM network; exact DCB carrier routes need country-level confirmation.", evidence: "https://www.boku.com/network/" },
      { marketId: "colombia", operator: "Country coverage", status: "route-discovery", note: "Boku lists Colombia in its LATAM network; exact DCB carrier routes need country-level confirmation.", evidence: "https://www.boku.com/network/" },
      { marketId: "brazil", operator: "Country coverage", status: "route-discovery", note: "Boku lists Brazil in its LATAM network; method mix may include non-DCB local payments.", evidence: "https://www.boku.com/network/" },
      { marketId: "chile", operator: "Country coverage", status: "route-discovery", note: "Boku lists Chile in its LATAM network; exact DCB carrier routes need country-level confirmation.", evidence: "https://www.boku.com/network/" },
      { marketId: "argentina", operator: "Country coverage", status: "route-discovery", note: "Boku lists Argentina in its LATAM network; exact DCB carrier routes need country-level confirmation.", evidence: "https://www.boku.com/network/" }
    ]
  }
];