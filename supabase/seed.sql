-- Seed data generated from the evidence-backed static MVP.
-- Safe to rerun after supabase/schema.sql.

begin;

insert into public.markets (slug,country_code,name,expansion_score,status,summary,tags,last_reviewed_at)
values ('mexico','MX','Mexico',83,'live','Large mobile base with verifiable Google Play carrier billing on Telcel and AT&T Mexico, plus a strong OTT and DCB partner ecosystem.',array['DCB verified','OTT','Gaming']::text[],'2026-09-21'::timestamptz)
on conflict (slug) do update set
  country_code=excluded.country_code,
  name=excluded.name,
  expansion_score=excluded.expansion_score,
  status=excluded.status,
  summary=excluded.summary,
  tags=excluded.tags,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Telcel','América Móvil',57.9,'App-store DCB','verified','Google Play carrier billing currently supports Telcel postpaid.','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'AT&T Mexico','AT&T',16.42,'App-store DCB','verified','Google Play currently lists AT&T Mexico as a participating carrier.','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Movistar','Telefónica',14.05,'Route recheck','review','Historical DCB relationship and current digital-service distribution; current merchant-ready route needs reconfirmation.','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'BAIT','Walmart de México',7.04,'Unknown','unknown','High-growth MVNO; merchant-ready billing route not yet validated.','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Telcel','App-store DCB','verified','Google Play Mexico','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'AT&T Mexico','App-store DCB','verified','Google Play Mexico','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Digital Virgo','DCB / monetization partner','verified','Public Mexico market materials','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Telcel','Mobile operator','Verified DCB','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'AT&T Mexico','Mobile operator','Verified DCB','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Digital Virgo','DCB / content monetization','Verified Mexico','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Movistar','Mobile operator / OTT distribution','Route recheck','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Marco Quatorze','Telcel','VAS Director','Mexico','https://www.linkedin.com/in/marco14/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Sergio Collazo','Telcel','Gerente de Ingeniería y Diseño de Proyectos SVA México y AMX','Mexico City','https://www.linkedin.com/in/sergiocollazo/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Viviana Ortega','AT&T México','Business Development and Innovation Manager','Mexico City','https://www.linkedin.com/in/viviana-ortega-a104b967/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Yarir Villalobos Montiel','AT&T México','Business Development Manager','Mexico City','https://www.linkedin.com/in/yarirvm/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'CRT market source','https://www.gob.mx/crt/prensa/reporta-crt-144-5-millones-de-lineas-celulares-activas-en-mexico','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Google Play Mexico','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DMX&hl=en','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.markets (slug,country_code,name,expansion_score,status,summary,tags,last_reviewed_at)
values ('colombia','CO','Colombia',76,'live','Large mobile market with strong operator-led OTT distribution and a more concentrated publicly verifiable DCB route.',array['Claro DCB','OTT','2026 restructure']::text[],'2026-09-21'::timestamptz)
on conflict (slug) do update set
  country_code=excluded.country_code,
  name=excluded.name,
  expansion_score=excluded.expansion_score,
  status=excluded.status,
  summary=excluded.summary,
  tags=excluded.tags,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Claro Colombia','América Móvil',53,'App-store DCB','verified','Google Play currently lists Claro for carrier billing in Colombia.','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Tigo + Movistar','Integrated entity',39,'OTT distribution','review','Integration became operational in 2026; merchant-ready DCB route still needs validation.','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'WOM + MVNOs','Other operators',8,'Unknown','unknown','No current public Google Play DCB route validated in the first pass.','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Claro Colombia','App-store DCB','verified','Google Play Colombia','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Tigo Colombia','OTT bundle / operator distribution','verified','Operator distribution materials','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Tigo + Movistar','Merchant DCB','review','Needs route confirmation after 2026 integration','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Claro Colombia','Operator billing / OTT','Verified','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Tigo Colombia','OTT distribution','Verified distribution','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Movistar Colombia','Integrated operator','2026 structure change','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'WOM Colombia','Mobile operator','Discovery needed','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Julian Jimenez Morales','Claro Colombia','Head of Cloud & Services Business Development','Bogotá','https://www.linkedin.com/in/jose-julian-jimenez-772b3347/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Adriana Landinez','Claro Colombia','Gerente de desarrollo de negocio','Bogotá','https://www.linkedin.com/in/adrianalandinez/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Harold Yezid Leguízamo Torres','Claro Colombia','Business Development Leader','Bogotá','https://www.linkedin.com/in/harold-yezid-leguízamo-torres-737330168/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'CRC market structure','https://normograma.crcom.gov.co/crc/compilacion/docs/resolucion_crc_8286_2026.htm','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Google Play Colombia','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DCO&hl=en-419','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.markets (slug,country_code,name,expansion_score,status,summary,tags,last_reviewed_at)
values ('brazil','BR','Brazil',86,'live','Large-scale market where operator co-billing, postpaid invoice and prepaid balance charging matter more than a simple DCB yes/no label.',array['Operator billing','OTT','Rail-specific']::text[],'2026-09-21'::timestamptz)
on conflict (slug) do update set
  country_code=excluded.country_code,
  name=excluded.name,
  expansion_score=excluded.expansion_score,
  status=excluded.status,
  summary=excluded.summary,
  tags=excluded.tags,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Vivo','Telefônica Brasil',37.8,'Digital-service billing','review','Billing capability evidenced, but exact merchant integration path still needs validation.','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Claro Brasil','América Móvil',33,'Operator co-billing','verified','Claro terms describe digital-service co-billing on the operator invoice.','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'TIM Brasil','TIM S.A.',22.2,'Invoice + prepaid','verified','TIM documents charging selected OTT subscriptions to invoice or prepaid balance.','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Other/MVNO','Other operators',7,'Unknown','unknown','Requires operator-by-operator discovery.','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Claro Brasil','Operator co-billing','verified','Current operator terms','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'TIM Brasil','Postpaid invoice','verified','Current TIM streaming billing flow','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'TIM Brasil','Prepaid balance','verified','Current TIM streaming billing flow','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Vivo','Digital-service billing','review','Capability evidenced; merchant route pending','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Claro Brasil','Invoice co-billing','Verified','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'TIM Brasil','Invoice + prepaid billing','Verified','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Vivo','Digital-service billing','Route recheck','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Telefônica Brasil','Operator / digital services','Market leader','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Mário Sergio Rachid','Claro Brasil','Diretor Executivo de Soluções Digitais','São Paulo','https://www.linkedin.com/in/mário-sergio-rachid-20017855/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Bárbara Santana','TIM Brasil','Product Manager Sênior | Data Partnerships & Open Gateway','Rio de Janeiro','https://www.linkedin.com/in/barbarasantanac/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Marcello Serafini','TIM Brasil','Business Development Specialist','São Paulo','https://www.linkedin.com/in/marcello-serafini-b25a3696/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Eduardo Ferrari Machado','Vivo (Telefônica Brasil)','Strategic Account Manager – Digital Services','São Paulo','https://www.linkedin.com/in/eduferrari/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Rafael Marciano','Vivo (Telefônica Brasil)','Head of Business Development, Vivo Ventures','São Paulo','https://www.linkedin.com/in/marcianorafael/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Anatel','https://www.gov.br/anatel/pt-br/regulado/universalizacao','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Google Play Brazil','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DBR&hl=pt-BR','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'TIM billing evidence','https://www.tim.com.br/ajuda/perguntas-frequentes/servicos-e-assinaturas/streaming/amazon-prime','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.markets (slug,country_code,name,expansion_score,status,summary,tags,last_reviewed_at)
values ('peru','PE','Peru',81,'live','Competitive four-operator market with current Google Play carrier billing on Claro postpaid and Entel, plus strong operator-billed OTT/VAS distribution.',array['DCB verified','OTT billing','VAS']::text[],'2026-09-21'::timestamptz)
on conflict (slug) do update set
  country_code=excluded.country_code,
  name=excluded.name,
  expansion_score=excluded.expansion_score,
  status=excluded.status,
  summary=excluded.summary,
  tags=excluded.tags,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Claro Perú','América Móvil',33.39,'App-store DCB + operator invoice','verified','Google Play currently supports Claro postpaid carrier billing; Claro also reflects additional digital services on the monthly bill.','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Bitel','Viettel',24.68,'VAS / gaming route discovery','review','Large and growing operator with an identifiable VAS & Gaming team; a current merchant-ready DCB rail still needs direct validation.','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Entel Perú','Entel',22.72,'App-store DCB + OTT invoice','verified','Google Play lists Entel for carrier billing, while Entel Play bills multiple OTT and VAS subscriptions through the operator.','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Movistar Perú','Telefónica',18.95,'Operator OTT billing','review','Movistar TV App subscriptions are billed monthly through the operator; generic merchant DCB access requires further validation.','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Claro Perú','App-store DCB','verified','Google Play Peru — postpaid only','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Entel Perú','App-store DCB','verified','Google Play Peru','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Entel Perú','Operator invoice / OTT','verified','Entel Play and 2026 operator terms','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Claro Perú','Digital services on invoice','verified','Claro receipt and additional-services documentation','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Movistar Perú','Operator-owned OTT billing','review','Movistar TV App terms; generic merchant route pending','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Claro Perú','App-store DCB / digital-service billing','Verified','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Entel Perú','DCB / OTT / VAS distribution','Verified','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Bitel','VAS & Gaming','Route discovery','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Movistar Perú','OTT distribution / operator billing','Route recheck','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Roberto Morón Martinez','Bitel','Head of VAS & Gaming','Peru','https://www.linkedin.com/in/robertomoron/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'José Manuel Jara Castillo','Bitel','Deputy Head - VAS & Gaming','Peru','https://www.linkedin.com/in/josemanueljaracastillo/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Alejandra Consiglieri Arias','Entel Perú','Product Specialist (Analista de VAS & OTTs)','Peru','https://www.linkedin.com/in/alejandra-consiglieri-arias-46291a209/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Arturo Sáenz Revilla','Entel Perú','Solution Sales VAS Specialist','Peru','https://www.linkedin.com/in/asaenzrevilla/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'OSIPTEL Q2 2026 market','https://www.osiptel.gob.pe/portal-del-usuario/noticias/osiptel-sin-considerar-lima-y-callao-las-regiones-concentran-el-62-14-de-las-lineas-moviles-en-el-peru/','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Google Play Peru','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DPE&hl=es','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Entel Play','https://www.entel.pe/entelplay/','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Claro receipt / digital services','https://www.claro.com.pe/conoce-tu-recibo/','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Movistar TV App','https://www.movistar.com.pe/movistar-tv-app/registro/terminos-y-condiciones','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.markets (slug,country_code,name,expansion_score,status,summary,tags,last_reviewed_at)
values ('chile','CL','Chile',89,'live','Highly competitive mobile market with current Google Play carrier billing across all four major operators and strong operator-billed entertainment/VAS distribution.',array['4-carrier DCB','OTT billing','VAS']::text[],'2026-09-21'::timestamptz)
on conflict (slug) do update set
  country_code=excluded.country_code,
  name=excluded.name,
  expansion_score=excluded.expansion_score,
  status=excluded.status,
  summary=excluded.summary,
  tags=excluded.tags,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Entel','Entel',34.3,'App-store DCB + OTT invoice','verified','Google Play lists Entel for carrier billing; Entel also bills Netflix, Disney+, HBO Max, Prime Video, Spotify, YouTube Premium and other services through the monthly bill.','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Movistar Chile','Telefónica',22.8,'App-store DCB','verified','Google Play currently lists Movistar as a participating carrier in Chile.','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'ClaroVTR','América Móvil / Liberty Latin America',21.6,'App-store DCB','verified','Google Play currently lists Claro as a participating carrier in Chile.','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'WOM Chile','WOM',20.4,'App-store DCB + postpaid/prepaid VAS','verified','Google Play lists WOM; WOM also documents bill charging for Spotify, Prime Video, Zapping, MegaGO and other value-added services, with selected prepaid options.','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Entel','App-store DCB','verified','Google Play Chile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Claro','App-store DCB','verified','Google Play Chile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Movistar','App-store DCB','verified','Google Play Chile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'WOM','App-store DCB','verified','Google Play Chile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Entel','Operator invoice / OTT','verified','Entel entertainment and billing documentation','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'WOM','Postpaid invoice / prepaid balance VAS','verified','WOM SVA and help-center documentation','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Entel','DCB / entertainment billing','Verified','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'WOM Chile','DCB / VAS / OTT billing','Verified','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Movistar Chile','App-store DCB / operator distribution','Verified DCB','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'ClaroVTR','App-store DCB / converged operator','Verified DCB','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Onaisin Somlai','Entel','Subgerente Desarrollo de Negocios','Santiago','https://www.linkedin.com/in/onaisin-somlai-1b493a8/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Daniele Aresu Vaccari','Entel','Strategic Innovation Lead','Chile','https://www.linkedin.com/in/daniele-aresu-vaccari/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Roberto Verdugo Muller','WOM Chile','Senior Project Manager Core / VAS','Chile','https://www.linkedin.com/in/robertoverdugomuller/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Angela Paula Salinas Venegas','WOM Chile','Ejecutivo de desarrollo del negocio','Chile','https://www.linkedin.com/in/angelapsalinasv/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Michael Ross Valle','WOM Chile','Jefe CS Core & VAS','Chile','https://www.linkedin.com/in/michael-ross-valle-a0371037/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'SUBTEL H1 2026 market','https://www.subtel.gob.cl/estadisticas-1o-semestre-subtel-el-5g-avanza-a-paso-firme-para-alcanzar-al-4g-y-brecha-se-reduce-a-solo-627-mil-conexiones/','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Google Play Chile','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DCL&hl=es','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Entel entertainment billing','https://ayuda.entel.cl/hc/es-419/articles/1500003817262--Qu%C3%A9-servicios-de-entretenci%C3%B3n-puedo-contratar','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'WOM additional services','https://www.wom.cl/centro-de-ayuda/por-que-subio-el-monto-de-mi-boleta-cobros-extra-mas-comunes/','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.markets (slug,country_code,name,expansion_score,status,summary,tags,last_reviewed_at)
values ('argentina','AR','Argentina',78,'live','Large mobile and entertainment market with verified operator-invoiced OTT and digital-service charging, while a current generic app-store DCB route remains unverified in this research pass.',array['Operator billing','OTT','DCB recheck']::text[],'2026-09-21'::timestamptz)
on conflict (slug) do update set
  country_code=excluded.country_code,
  name=excluded.name,
  expansion_score=excluded.expansion_score,
  status=excluded.status,
  summary=excluded.summary,
  tags=excluded.tags,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Personal / Flow','Telecom Argentina',null,'Operator OTT / digital-service billing','verified','Telecom Argentina currently invoices Disney+ on behalf of Disney for Flow customers, and Flow distributes multiple premium streaming products.','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Movistar Argentina','Movistar',null,'Digital services on operator invoice','verified','Movistar documents on-demand and subscription digital services such as games, music and video as charges that appear on the mobile bill.','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.operators (market_id,name,group_name,market_share,rail_summary,confidence,note,last_verified_at)
select id,'Claro Argentina','América Móvil',null,'Operator OTT subscription billing','verified','Claro currently allows eligible customers to add Prime Video as a recurring charge on the Claro invoice.','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,name) do update set
  group_name=excluded.group_name, market_share=excluded.market_share, rail_summary=excluded.rail_summary,
  confidence=excluded.confidence, note=excluded.note, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Personal / Flow','Operator invoice / OTT','verified','Current Disney+ / Flow commercial terms','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Movistar Argentina','Digital-service billing','verified','Current Movistar billing help documentation','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Claro Argentina','Operator invoice / OTT','verified','Current Prime Video subscription terms','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.billing_rails (market_id,provider_name,rail_type,confidence,evidence_summary,last_verified_at)
select id,'Argentina market','App-store DCB','unknown','No current operator-specific Google Play DCB route validated in this pass','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,provider_name,rail_type) do update set
  confidence=excluded.confidence, evidence_summary=excluded.evidence_summary,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Personal / Flow','OTT aggregation / operator billing','Verified','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Movistar Argentina','Digital-service billing','Verified','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.commercial_targets (market_id,company_name,commercial_role,evidence_status,last_verified_at)
select id,'Claro Argentina','OTT subscription billing','Verified','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,company_name) do update set
  commercial_role=excluded.commercial_role, evidence_status=excluded.evidence_status,
  last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Axel Vega','Personal','Especialista en desarrollo de negocios','Argentina','https://www.linkedin.com/in/axel-vega-telecom/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Guille Cárdenas','Personal / Flow','Design & Content Lead | Flow','Buenos Aires','https://www.linkedin.com/in/guillecardenas/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'José Luis Esperón','Claro Argentina','Ejecutivo de Soluciones Digitales','Greater Buenos Aires','https://www.linkedin.com/in/joseluisesperon/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.contacts (market_id,full_name,company_name,title,location,profile_url,source_label,last_verified_at)
select id,'Christian Martin Rivas Venturini','Claro Argentina','VAS and NFV/Virtualization Support Leader','Buenos Aires','https://www.linkedin.com/in/christian-martin-rivas-venturini-a35b105/','Public professional profile','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,full_name,company_name) do update set
  title=excluded.title, location=excluded.location, profile_url=excluded.profile_url,
  source_label=excluded.source_label, last_verified_at=excluded.last_verified_at, updated_at=now();

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Personal / Flow Disney+ billing','https://www.personal.com.ar/flow/plataformas-de-streaming/disney-plus','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Movistar digital-service billing','https://ayuda.movistar.com.ar/pregunta/que-son-los-servicios-digitales-que-aparecen-en-mi-factura.html','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_sources (market_id,label,url,last_checked_at)
select id,'Claro Prime Video billing','https://www.claro.com.ar/personas/legal-y-regulatorio/terminos-condiciones-amazon-prime-video','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (market_id,url) do update set label=excluded.label, last_checked_at=excluded.last_checked_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'cl-google-dcb-4',id,'billing_route','verified','Google Play carrier billing verified across four major operators','Entel, Claro, Movistar and WOM are currently listed as carrier-billing options in Chile.','Market-wide','Google Play Chile','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DCL&hl=es','2026-09-21'::timestamptz from public.markets where slug='chile'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'pe-google-dcb',id,'billing_route','verified','Claro postpaid and Entel carrier billing verified','Google Play currently lists Claro postpaid and Entel as mobile billing routes in Peru.','Claro Perú / Entel Perú','Google Play Peru','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DPE&hl=es','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'pe-market-q2',id,'market_update','verified','Peru remains a competitive four-operator market','OSIPTEL Q2 2026 data shows Claro, Bitel, Entel and Movistar all retaining material mobile share.','Market-wide','OSIPTEL Q2 2026','https://www.osiptel.gob.pe/portal-del-usuario/noticias/osiptel-sin-considerar-lima-y-callao-las-regiones-concentran-el-62-14-de-las-lineas-moviles-en-el-peru/','2026-09-21'::timestamptz from public.markets where slug='peru'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'ar-flow-disney',id,'billing_route','verified','Flow currently invoices Disney+ for eligible customers','Telecom Argentina bills Disney+ on behalf of Disney for customers subscribing through Flow.','Personal / Flow','Flow Disney+','https://www.personal.com.ar/flow/plataformas-de-streaming/disney-plus','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'ar-movistar-digital',id,'billing_route','verified','Movistar invoice supports recurring digital-service charges','Movistar documents games, music, video and other digital subscriptions charged weekly or monthly on the operator bill.','Movistar Argentina','Movistar digital services','https://ayuda.movistar.com.ar/pregunta/que-son-los-servicios-digitales-que-aparecen-en-mi-factura.html','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'ar-claro-prime',id,'billing_route','verified','Claro currently bills Prime Video as a monthly invoice add-on','Eligible postpaid mobile and residential customers can add Prime Video to the Claro bill.','Claro Argentina','Claro Prime Video terms','https://www.claro.com.ar/personas/legal-y-regulatorio/terminos-condiciones-amazon-prime-video','2026-09-21'::timestamptz from public.markets where slug='argentina'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'br-tim-ott',id,'billing_route','verified','TIM supports invoice and prepaid charging for selected OTT services','TIM documentation confirms operator-billed streaming with postpaid invoice and, for selected flows, prepaid balance.','TIM Brasil','TIM streaming billing','https://www.tim.com.br/ajuda/perguntas-frequentes/servicos-e-assinaturas/streaming/amazon-prime','2026-09-21'::timestamptz from public.markets where slug='brazil'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'co-operator-change',id,'corporate_change','verified','Tigo and Movistar now require post-integration route validation','The 2026 operator structure changes mean older DCB and distribution assumptions should be revalidated against the integrated commercial entity.','Tigo / Movistar Colombia','CRC 2026 market structure','https://normograma.crcom.gov.co/crc/compilacion/docs/resolucion_crc_8286_2026.htm','2026-09-21'::timestamptz from public.markets where slug='colombia'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

insert into public.market_signals (external_key,market_id,signal_type,confidence,title,summary,company_name,source_label,source_url,observed_at)
select 'mx-google-dcb',id,'billing_route','verified','Telcel and AT&T Mexico carrier billing currently verified','Google Play currently lists Telcel and AT&T Mexico as mobile billing routes.','Telcel / AT&T Mexico','Google Play Mexico','https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DMX&hl=en','2026-09-21'::timestamptz from public.markets where slug='mexico'
on conflict (external_key) do update set
  market_id=excluded.market_id, signal_type=excluded.signal_type, confidence=excluded.confidence,
  title=excluded.title, summary=excluded.summary, company_name=excluded.company_name,
  source_label=excluded.source_label, source_url=excluded.source_url, observed_at=excluded.observed_at;

commit;
