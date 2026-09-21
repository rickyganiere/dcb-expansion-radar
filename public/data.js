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
      contacts: [
        { name: "Marco Quatorze", company: "Telcel", title: "VAS Director", location: "Mexico", source: "Public professional profile", url: "https://www.linkedin.com/in/marco14/" },
        { name: "Sergio Collazo", company: "Telcel", title: "Gerente de Ingeniería y Diseño de Proyectos SVA México y AMX", location: "Mexico City", source: "Public professional profile", url: "https://www.linkedin.com/in/sergiocollazo/" },
        { name: "Viviana Ortega", company: "AT&T México", title: "Business Development and Innovation Manager", location: "Mexico City", source: "Public professional profile", url: "https://www.linkedin.com/in/viviana-ortega-a104b967/" },
        { name: "Yarir Villalobos Montiel", company: "AT&T México", title: "Business Development Manager", location: "Mexico City", source: "Public professional profile", url: "https://www.linkedin.com/in/yarirvm/" }
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
      contacts: [
        { name: "Julian Jimenez Morales", company: "Claro Colombia", title: "Head of Cloud & Services Business Development", location: "Bogotá", source: "Public professional profile", url: "https://www.linkedin.com/in/jose-julian-jimenez-772b3347/" },
        { name: "Adriana Landinez", company: "Claro Colombia", title: "Gerente de desarrollo de negocio", location: "Bogotá", source: "Public professional profile", url: "https://www.linkedin.com/in/adrianalandinez/" },
        { name: "Harold Yezid Leguízamo Torres", company: "Claro Colombia", title: "Business Development Leader", location: "Bogotá", source: "Public professional profile", url: "https://www.linkedin.com/in/harold-yezid-leguízamo-torres-737330168/" }
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
      contacts: [
        { name: "Mário Sergio Rachid", company: "Claro Brasil", title: "Diretor Executivo de Soluções Digitais", location: "São Paulo", source: "Public professional profile", url: "https://www.linkedin.com/in/mário-sergio-rachid-20017855/" },
        { name: "Bárbara Santana", company: "TIM Brasil", title: "Product Manager Sênior | Data Partnerships & Open Gateway", location: "Rio de Janeiro", source: "Public professional profile", url: "https://www.linkedin.com/in/barbarasantanac/" },
        { name: "Marcello Serafini", company: "TIM Brasil", title: "Business Development Specialist", location: "São Paulo", source: "Public professional profile", url: "https://www.linkedin.com/in/marcello-serafini-b25a3696/" },
        { name: "Eduardo Ferrari Machado", company: "Vivo (Telefônica Brasil)", title: "Strategic Account Manager – Digital Services", location: "São Paulo", source: "Public professional profile", url: "https://www.linkedin.com/in/eduferrari/" },
        { name: "Rafael Marciano", company: "Vivo (Telefônica Brasil)", title: "Head of Business Development, Vivo Ventures", location: "São Paulo", source: "Public professional profile", url: "https://www.linkedin.com/in/marcianorafael/" }
      ],
      contactRoles: ["Director Digital Services", "VAS & Content", "Partnerships", "Carrier Billing"],
      sources: [
        { label: "Anatel", url: "https://www.gov.br/anatel/pt-br/regulado/universalizacao" },
        { label: "Google Play Brazil", url: "https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DBR&hl=pt-BR" },
        { label: "TIM billing evidence", url: "https://www.tim.com.br/ajuda/perguntas-frequentes/servicos-e-assinaturas/streaming/amazon-prime" }
      ]
    },
    {
      id: "peru",
      code: "PE",
      name: "Peru",
      score: 81,
      status: "live",
      summary: "Competitive four-operator market with current Google Play carrier billing on Claro postpaid and Entel, plus strong operator-billed OTT/VAS distribution.",
      tags: ["DCB verified", "OTT billing", "VAS"],
      operators: [
        { name: "Claro Perú", group: "América Móvil", share: 33.39, rail: "App-store DCB + operator invoice", confidence: "verified", note: "Google Play currently supports Claro postpaid carrier billing; Claro also reflects additional digital services on the monthly bill." },
        { name: "Bitel", group: "Viettel", share: 24.68, rail: "VAS / gaming route discovery", confidence: "review", note: "Large and growing operator with an identifiable VAS & Gaming team; a current merchant-ready DCB rail still needs direct validation." },
        { name: "Entel Perú", group: "Entel", share: 22.72, rail: "App-store DCB + OTT invoice", confidence: "verified", note: "Google Play lists Entel for carrier billing, while Entel Play bills multiple OTT and VAS subscriptions through the operator." },
        { name: "Movistar Perú", group: "Telefónica", share: 18.95, rail: "Operator OTT billing", confidence: "review", note: "Movistar TV App subscriptions are billed monthly through the operator; generic merchant DCB access requires further validation." }
      ],
      rails: [
        { type: "App-store DCB", provider: "Claro Perú", confidence: "verified", evidence: "Google Play Peru — postpaid only" },
        { type: "App-store DCB", provider: "Entel Perú", confidence: "verified", evidence: "Google Play Peru" },
        { type: "Operator invoice / OTT", provider: "Entel Perú", confidence: "verified", evidence: "Entel Play and 2026 operator terms" },
        { type: "Digital services on invoice", provider: "Claro Perú", confidence: "verified", evidence: "Claro receipt and additional-services documentation" },
        { type: "Operator-owned OTT billing", provider: "Movistar Perú", confidence: "review", evidence: "Movistar TV App terms; generic merchant route pending" }
      ],
      ecosystem: [
        { company: "Claro Perú", role: "App-store DCB / digital-service billing", status: "Verified" },
        { company: "Entel Perú", role: "DCB / OTT / VAS distribution", status: "Verified" },
        { company: "Bitel", role: "VAS & Gaming", status: "Route discovery" },
        { company: "Movistar Perú", role: "OTT distribution / operator billing", status: "Route recheck" }
      ],
      contacts: [
        { name: "Roberto Morón Martinez", company: "Bitel", title: "Head of VAS & Gaming", location: "Peru", source: "Public professional profile", url: "https://www.linkedin.com/in/robertomoron/" },
        { name: "José Manuel Jara Castillo", company: "Bitel", title: "Deputy Head - VAS & Gaming", location: "Peru", source: "Public professional profile", url: "https://www.linkedin.com/in/josemanueljaracastillo/" },
        { name: "Alejandra Consiglieri Arias", company: "Entel Perú", title: "Product Specialist (Analista de VAS & OTTs)", location: "Peru", source: "Public professional profile", url: "https://www.linkedin.com/in/alejandra-consiglieri-arias-46291a209/" },
        { name: "Arturo Sáenz Revilla", company: "Entel Perú", title: "Solution Sales VAS Specialist", location: "Peru", source: "Public professional profile", url: "https://www.linkedin.com/in/asaenzrevilla/" }
      ],
      contactRoles: ["VAS & OTT", "Digital Services", "Business Development", "Carrier Billing"],
      sources: [
        { label: "OSIPTEL Q2 2026 market", url: "https://www.osiptel.gob.pe/portal-del-usuario/noticias/osiptel-sin-considerar-lima-y-callao-las-regiones-concentran-el-62-14-de-las-lineas-moviles-en-el-peru/" },
        { label: "Google Play Peru", url: "https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DPE&hl=es" },
        { label: "Entel Play", url: "https://www.entel.pe/entelplay/" },
        { label: "Claro receipt / digital services", url: "https://www.claro.com.pe/conoce-tu-recibo/" },
        { label: "Movistar TV App", url: "https://www.movistar.com.pe/movistar-tv-app/registro/terminos-y-condiciones" }
      ]
    },
    {
      id: "chile",
      code: "CL",
      name: "Chile",
      score: 89,
      status: "live",
      summary: "Highly competitive mobile market with current Google Play carrier billing across all four major operators and strong operator-billed entertainment/VAS distribution.",
      tags: ["4-carrier DCB", "OTT billing", "VAS"],
      operators: [
        { name: "Entel", group: "Entel", share: 34.3, rail: "App-store DCB + OTT invoice", confidence: "verified", note: "Google Play lists Entel for carrier billing; Entel also bills Netflix, Disney+, HBO Max, Prime Video, Spotify, YouTube Premium and other services through the monthly bill." },
        { name: "Movistar Chile", group: "Telefónica", share: 22.8, rail: "App-store DCB", confidence: "verified", note: "Google Play currently lists Movistar as a participating carrier in Chile." },
        { name: "ClaroVTR", group: "América Móvil / Liberty Latin America", share: 21.6, rail: "App-store DCB", confidence: "verified", note: "Google Play currently lists Claro as a participating carrier in Chile." },
        { name: "WOM Chile", group: "WOM", share: 20.4, rail: "App-store DCB + postpaid/prepaid VAS", confidence: "verified", note: "Google Play lists WOM; WOM also documents bill charging for Spotify, Prime Video, Zapping, MegaGO and other value-added services, with selected prepaid options." }
      ],
      rails: [
        { type: "App-store DCB", provider: "Entel", confidence: "verified", evidence: "Google Play Chile" },
        { type: "App-store DCB", provider: "Claro", confidence: "verified", evidence: "Google Play Chile" },
        { type: "App-store DCB", provider: "Movistar", confidence: "verified", evidence: "Google Play Chile" },
        { type: "App-store DCB", provider: "WOM", confidence: "verified", evidence: "Google Play Chile" },
        { type: "Operator invoice / OTT", provider: "Entel", confidence: "verified", evidence: "Entel entertainment and billing documentation" },
        { type: "Postpaid invoice / prepaid balance VAS", provider: "WOM", confidence: "verified", evidence: "WOM SVA and help-center documentation" }
      ],
      ecosystem: [
        { company: "Entel", role: "DCB / entertainment billing", status: "Verified" },
        { company: "WOM Chile", role: "DCB / VAS / OTT billing", status: "Verified" },
        { company: "Movistar Chile", role: "App-store DCB / operator distribution", status: "Verified DCB" },
        { company: "ClaroVTR", role: "App-store DCB / converged operator", status: "Verified DCB" }
      ],
      contacts: [
        { name: "Onaisin Somlai", company: "Entel", title: "Subgerente Desarrollo de Negocios", location: "Santiago", source: "Public professional profile", url: "https://www.linkedin.com/in/onaisin-somlai-1b493a8/" },
        { name: "Daniele Aresu Vaccari", company: "Entel", title: "Strategic Innovation Lead", location: "Chile", source: "Public professional profile", url: "https://www.linkedin.com/in/daniele-aresu-vaccari/" },
        { name: "Roberto Verdugo Muller", company: "WOM Chile", title: "Senior Project Manager Core / VAS", location: "Chile", source: "Public professional profile", url: "https://www.linkedin.com/in/robertoverdugomuller/" },
        { name: "Angela Paula Salinas Venegas", company: "WOM Chile", title: "Ejecutivo de desarrollo del negocio", location: "Chile", source: "Public professional profile", url: "https://www.linkedin.com/in/angelapsalinasv/" },
        { name: "Michael Ross Valle", company: "WOM Chile", title: "Jefe CS Core & VAS", location: "Chile", source: "Public professional profile", url: "https://www.linkedin.com/in/michael-ross-valle-a0371037/" }
      ],
      contactRoles: ["VAS", "Digital Services", "Entertainment Partnerships", "Business Development"],
      sources: [
        { label: "SUBTEL H1 2026 market", url: "https://www.subtel.gob.cl/estadisticas-1o-semestre-subtel-el-5g-avanza-a-paso-firme-para-alcanzar-al-4g-y-brecha-se-reduce-a-solo-627-mil-conexiones/" },
        { label: "Google Play Chile", url: "https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DCL&hl=es" },
        { label: "Entel entertainment billing", url: "https://ayuda.entel.cl/hc/es-419/articles/1500003817262--Qu%C3%A9-servicios-de-entretenci%C3%B3n-puedo-contratar" },
        { label: "WOM additional services", url: "https://www.wom.cl/centro-de-ayuda/por-que-subio-el-monto-de-mi-boleta-cobros-extra-mas-comunes/" }
      ]
    },
    {
      id: "argentina",
      code: "AR",
      name: "Argentina",
      score: 78,
      status: "live",
      summary: "Large mobile and entertainment market with verified operator-invoiced OTT and digital-service charging, while a current generic app-store DCB route remains unverified in this research pass.",
      tags: ["Operator billing", "OTT", "DCB recheck"],
      operators: [
        { name: "Personal / Flow", group: "Telecom Argentina", share: null, rail: "Operator OTT / digital-service billing", confidence: "verified", note: "Telecom Argentina currently invoices Disney+ on behalf of Disney for Flow customers, and Flow distributes multiple premium streaming products." },
        { name: "Movistar Argentina", group: "Movistar", share: null, rail: "Digital services on operator invoice", confidence: "verified", note: "Movistar documents on-demand and subscription digital services such as games, music and video as charges that appear on the mobile bill." },
        { name: "Claro Argentina", group: "América Móvil", share: null, rail: "Operator OTT subscription billing", confidence: "verified", note: "Claro currently allows eligible customers to add Prime Video as a recurring charge on the Claro invoice." }
      ],
      rails: [
        { type: "Operator invoice / OTT", provider: "Personal / Flow", confidence: "verified", evidence: "Current Disney+ / Flow commercial terms" },
        { type: "Digital-service billing", provider: "Movistar Argentina", confidence: "verified", evidence: "Current Movistar billing help documentation" },
        { type: "Operator invoice / OTT", provider: "Claro Argentina", confidence: "verified", evidence: "Current Prime Video subscription terms" },
        { type: "App-store DCB", provider: "Argentina market", confidence: "unknown", evidence: "No current operator-specific Google Play DCB route validated in this pass" }
      ],
      ecosystem: [
        { company: "Personal / Flow", role: "OTT aggregation / operator billing", status: "Verified" },
        { company: "Movistar Argentina", role: "Digital-service billing", status: "Verified" },
        { company: "Claro Argentina", role: "OTT subscription billing", status: "Verified" }
      ],
      contacts: [
        { name: "Axel Vega", company: "Personal", title: "Especialista en desarrollo de negocios", location: "Argentina", source: "Public professional profile", url: "https://www.linkedin.com/in/axel-vega-telecom/" },
        { name: "Guille Cárdenas", company: "Personal / Flow", title: "Design & Content Lead | Flow", location: "Buenos Aires", source: "Public professional profile", url: "https://www.linkedin.com/in/guillecardenas/" },
        { name: "José Luis Esperón", company: "Claro Argentina", title: "Ejecutivo de Soluciones Digitales", location: "Greater Buenos Aires", source: "Public professional profile", url: "https://www.linkedin.com/in/joseluisesperon/" },
        { name: "Christian Martin Rivas Venturini", company: "Claro Argentina", title: "VAS and NFV/Virtualization Support Leader", location: "Buenos Aires", source: "Public professional profile", url: "https://www.linkedin.com/in/christian-martin-rivas-venturini-a35b105/" }
      ],
      contactRoles: ["Digital Services", "VAS", "Content & Entertainment", "Business Development"],
      sources: [
        { label: "Personal / Flow Disney+ billing", url: "https://www.personal.com.ar/flow/plataformas-de-streaming/disney-plus" },
        { label: "Movistar digital-service billing", url: "https://ayuda.movistar.com.ar/pregunta/que-son-los-servicios-digitales-que-aparecen-en-mi-factura.html" },
        { label: "Claro Prime Video billing", url: "https://www.claro.com.ar/personas/legal-y-regulatorio/terminos-condiciones-amazon-prime-video" }
      ]
    }
  ]
};