window.RADAR_DATA = {
  lastReviewed: "2026-09-21",
  markets: [
    {
      id: "mexico",
      code: "MX",
      name: "Mexico",
      score: 83,
      status: "live",
      summary: "Large mobile base with verifiable Google Play carrier billing on Telcel and AT&T Mexico, plus a strong OTT and DCB partner ecosystem.",
      tags: ["DCB verified", "OTT", "Gaming"],
      operators: [
        { name: "Telcel", group: "América Móvil", share: 57.9, rail: "App-store DCB", confidence: "verified", note: "Google Play carrier billing currently supports Telcel postpaid." },
        { name: "AT&T Mexico", group: "AT&T", share: 16.42, rail: "App-store DCB", confidence: "verified", note: "Google Play currently lists AT&T Mexico as a participating carrier." },
        { name: "Movistar", group: "Telefónica", share: 14.05, rail: "Route recheck", confidence: "review", note: "Historical DCB relationship and current digital-service distribution; current merchant-ready route needs reconfirmation." },
        { name: "BAIT", group: "Walmart de México", share: 7.04, rail: "Unknown", confidence: "unknown", note: "High-growth MVNO; merchant-ready billing route not yet validated." }
      ],
      rails: [
        { type: "App-store DCB", provider: "Telcel", confidence: "verified", evidence: "Google Play Mexico" },
        { type: "App-store DCB", provider: "AT&T Mexico", confidence: "verified", evidence: "Google Play Mexico" },
        { type: "DCB / monetization partner", provider: "Digital Virgo", confidence: "verified", evidence: "Public Mexico market materials" }
      ],
      ecosystem: [
        { company: "Telcel", role: "Mobile operator", status: "Verified DCB" },
        { company: "AT&T Mexico", role: "Mobile operator", status: "Verified DCB" },
        { company: "Digital Virgo", role: "DCB / content monetization", status: "Verified Mexico" },
        { company: "Movistar", role: "Mobile operator / OTT distribution", status: "Route recheck" }
      ],
      contactRoles: ["Head of Digital Services", "VAS Partnerships", "Carrier Billing", "Business Development"],
      sources: [
        { label: "CRT market source", url: "https://www.gob.mx/crt/prensa/reporta-crt-144-5-millones-de-lineas-celulares-activas-en-mexico" },
        { label: "Google Play Mexico", url: "https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DMX&hl=en" }
      ]
    },
    {
      id: "colombia",
      code: "CO",
      name: "Colombia",
      score: 76,
      status: "live",
      summary: "Large mobile market with strong operator-led OTT distribution and a more concentrated publicly verifiable DCB route.",
      tags: ["Claro DCB", "OTT", "2026 restructure"],
      operators: [
        { name: "Claro Colombia", group: "América Móvil", share: 53, rail: "App-store DCB", confidence: "verified", note: "Google Play currently lists Claro for carrier billing in Colombia." },
        { name: "Tigo + Movistar", group: "Integrated entity", share: 39, rail: "OTT distribution", confidence: "review", note: "Integration became operational in 2026; merchant-ready DCB route still needs validation." },
        { name: "WOM + MVNOs", group: "Other operators", share: 8, rail: "Unknown", confidence: "unknown", note: "No current public Google Play DCB route validated in the first pass." }
      ],
      rails: [
        { type: "App-store DCB", provider: "Claro Colombia", confidence: "verified", evidence: "Google Play Colombia" },
        { type: "OTT bundle / operator distribution", provider: "Tigo Colombia", confidence: "verified", evidence: "Operator distribution materials" },
        { type: "Merchant DCB", provider: "Tigo + Movistar", confidence: "review", evidence: "Needs route confirmation after 2026 integration" }
      ],
      ecosystem: [
        { company: "Claro Colombia", role: "Operator billing / OTT", status: "Verified" },
        { company: "Tigo Colombia", role: "OTT distribution", status: "Verified distribution" },
        { company: "Movistar Colombia", role: "Integrated operator", status: "2026 structure change" },
        { company: "WOM Colombia", role: "Mobile operator", status: "Discovery needed" }
      ],
      contactRoles: ["Digital Partnerships", "VAS Manager", "Content Partnerships", "Carrier Billing"],
      sources: [
        { label: "CRC market structure", url: "https://normograma.crcom.gov.co/crc/compilacion/docs/resolucion_crc_8286_2026.htm" },
        { label: "Google Play Colombia", url: "https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DCO&hl=en-419" }
      ]
    },
    {
      id: "brazil",
      code: "BR",
      name: "Brazil",
      score: 86,
      status: "live",
      summary: "Large-scale market where operator co-billing, postpaid invoice and prepaid balance charging matter more than a simple DCB yes/no label.",
      tags: ["Operator billing", "OTT", "Rail-specific"],
      operators: [
        { name: "Vivo", group: "Telefônica Brasil", share: 37.8, rail: "Digital-service billing", confidence: "review", note: "Billing capability evidenced, but exact merchant integration path still needs validation." },
        { name: "Claro Brasil", group: "América Móvil", share: 33, rail: "Operator co-billing", confidence: "verified", note: "Claro terms describe digital-service co-billing on the operator invoice." },
        { name: "TIM Brasil", group: "TIM S.A.", share: 22.2, rail: "Invoice + prepaid", confidence: "verified", note: "TIM documents charging selected OTT subscriptions to invoice or prepaid balance." },
        { name: "Other/MVNO", group: "Other operators", share: 7, rail: "Unknown", confidence: "unknown", note: "Requires operator-by-operator discovery." }
      ],
      rails: [
        { type: "Operator co-billing", provider: "Claro Brasil", confidence: "verified", evidence: "Current operator terms" },
        { type: "Postpaid invoice", provider: "TIM Brasil", confidence: "verified", evidence: "Current TIM streaming billing flow" },
        { type: "Prepaid balance", provider: "TIM Brasil", confidence: "verified", evidence: "Current TIM streaming billing flow" },
        { type: "Digital-service billing", provider: "Vivo", confidence: "review", evidence: "Capability evidenced; merchant route pending" }
      ],
      ecosystem: [
        { company: "Claro Brasil", role: "Invoice co-billing", status: "Verified" },
        { company: "TIM Brasil", role: "Invoice + prepaid billing", status: "Verified" },
        { company: "Vivo", role: "Digital-service billing", status: "Route recheck" },
        { company: "Telefônica Brasil", role: "Operator / digital services", status: "Market leader" }
      ],
      contactRoles: ["Director Digital Services", "VAS & Content", "Partnerships", "Carrier Billing"],
      sources: [
        { label: "Anatel", url: "https://www.gov.br/anatel/pt-br/regulado/universalizacao" },
        { label: "Google Play Brazil", url: "https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DBR&hl=pt-BR" },
        { label: "TIM billing evidence", url: "https://www.tim.com.br/ajuda/perguntas-frequentes/servicos-e-assinaturas/streaming/amazon-prime" }
      ]
    },
    { id: "peru", code: "PE", name: "Peru", score: null, status: "queued", summary: "Next market scheduled for evidence collection.", tags: ["Queued"], operators: [], rails: [], ecosystem: [], contactRoles: [], sources: [] },
    { id: "chile", code: "CL", name: "Chile", score: null, status: "queued", summary: "Queued for research.", tags: ["Queued"], operators: [], rails: [], ecosystem: [], contactRoles: [], sources: [] },
    { id: "argentina", code: "AR", name: "Argentina", score: null, status: "queued", summary: "Queued for research.", tags: ["Queued"], operators: [], rails: [], ecosystem: [], contactRoles: [], sources: [] }
  ]
};