import flagAlb from 'circle-flags/flags/al.svg?url'
import flagAnd from 'circle-flags/flags/ad.svg?url'
import flagArm from 'circle-flags/flags/am.svg?url'
import flagAut from 'circle-flags/flags/at.svg?url'
import flagAze from 'circle-flags/flags/az.svg?url'
import flagBlr from 'circle-flags/flags/by.svg?url'
import flagBel from 'circle-flags/flags/be.svg?url'
import flagBih from 'circle-flags/flags/ba.svg?url'
import flagBul from 'circle-flags/flags/bg.svg?url'
import flagCro from 'circle-flags/flags/hr.svg?url'
import flagCyp from 'circle-flags/flags/cy.svg?url'
import flagCze from 'circle-flags/flags/cz.svg?url'
import flagDen from 'circle-flags/flags/dk.svg?url'
import flagEng from 'circle-flags/flags/gb-eng.svg?url'
import flagEst from 'circle-flags/flags/ee.svg?url'
import flagFro from 'circle-flags/flags/fo.svg?url'
import flagFin from 'circle-flags/flags/fi.svg?url'
import flagFra from 'circle-flags/flags/fr.svg?url'
import flagGeo from 'circle-flags/flags/ge.svg?url'
import flagGer from 'circle-flags/flags/de.svg?url'
import flagGib from 'circle-flags/flags/gi.svg?url'
import flagGre from 'circle-flags/flags/gr.svg?url'
import flagHun from 'circle-flags/flags/hu.svg?url'
import flagIsl from 'circle-flags/flags/is.svg?url'
import flagIsr from 'circle-flags/flags/il.svg?url'
import flagIta from 'circle-flags/flags/it.svg?url'
import flagKaz from 'circle-flags/flags/kz.svg?url'
import flagKos from 'circle-flags/flags/xk.svg?url'
import flagLva from 'circle-flags/flags/lv.svg?url'
import flagLie from 'circle-flags/flags/li.svg?url'
import flagLtu from 'circle-flags/flags/lt.svg?url'
import flagLux from 'circle-flags/flags/lu.svg?url'
import flagMlt from 'circle-flags/flags/mt.svg?url'
import flagMda from 'circle-flags/flags/md.svg?url'
import flagMne from 'circle-flags/flags/me.svg?url'
import flagNed from 'circle-flags/flags/nl.svg?url'
import flagMkd from 'circle-flags/flags/mk.svg?url'
import flagNir from 'circle-flags/flags/gb-nir.svg?url'
import flagNor from 'circle-flags/flags/no.svg?url'
import flagPol from 'circle-flags/flags/pl.svg?url'
import flagPor from 'circle-flags/flags/pt.svg?url'
import flagIrl from 'circle-flags/flags/ie.svg?url'
import flagRou from 'circle-flags/flags/ro.svg?url'
import flagRus from 'circle-flags/flags/ru.svg?url'
import flagSmr from 'circle-flags/flags/sm.svg?url'
import flagSco from 'circle-flags/flags/gb-sct.svg?url'
import flagSrb from 'circle-flags/flags/rs.svg?url'
import flagSvk from 'circle-flags/flags/sk.svg?url'
import flagSvn from 'circle-flags/flags/si.svg?url'
import flagEsp from 'circle-flags/flags/es.svg?url'
import flagSwe from 'circle-flags/flags/se.svg?url'
import flagSui from 'circle-flags/flags/ch.svg?url'
import flagTur from 'circle-flags/flags/tr.svg?url'
import flagUkr from 'circle-flags/flags/ua.svg?url'
import flagWal from 'circle-flags/flags/gb-wls.svg?url'

export const UEFA_TEAM_FLAG_CODES = Object.freeze({
  ALB: flagAlb,
  AND: flagAnd,
  ARM: flagArm,
  AUT: flagAut,
  AZE: flagAze,
  BLR: flagBlr,
  BEL: flagBel,
  BIH: flagBih,
  BUL: flagBul,
  CRO: flagCro,
  CYP: flagCyp,
  CZE: flagCze,
  DEN: flagDen,
  ENG: flagEng,
  EST: flagEst,
  FRO: flagFro,
  FIN: flagFin,
  FRA: flagFra,
  GEO: flagGeo,
  GER: flagGer,
  GIB: flagGib,
  GRE: flagGre,
  HUN: flagHun,
  ISL: flagIsl,
  ISR: flagIsr,
  ITA: flagIta,
  KAZ: flagKaz,
  KOS: flagKos,
  LVA: flagLva,
  LIE: flagLie,
  LTU: flagLtu,
  LUX: flagLux,
  MLT: flagMlt,
  MDA: flagMda,
  MNE: flagMne,
  NED: flagNed,
  MKD: flagMkd,
  NIR: flagNir,
  NOR: flagNor,
  POL: flagPol,
  POR: flagPor,
  IRL: flagIrl,
  ROU: flagRou,
  RUS: flagRus,
  SMR: flagSmr,
  SCO: flagSco,
  SRB: flagSrb,
  SVK: flagSvk,
  SVN: flagSvn,
  ESP: flagEsp,
  SWE: flagSwe,
  SUI: flagSui,
  TUR: flagTur,
  UKR: flagUkr,
  WAL: flagWal,
})

export function normaliseTeamIsoCode(value) {
  const code = String(value ?? '').trim().toUpperCase()
  return code || null
}

export function flagAssetForTeamIso(value) {
  const code = normaliseTeamIsoCode(value)
  return code ? UEFA_TEAM_FLAG_CODES[code] ?? null : null
}
