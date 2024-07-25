import {CyrillicGlyphs, JapaneseGlyphs, LatinGlyphs, SChineseGlyphs} from "@/components/Player/glyphs/consts";
// use https://fontdrop.info/ to generate unicode mapping


export const TestStringCompatibility = (...args) => {
  let Lat = 1, Rus = 1, Jpn = 1, Chn = 1;
  let LatDisplay = "", RusDisplay = "", JpnDisplay = "", ChnDisplay = "";

  let part = 0;
  for(const str of args) {
    part += 1;
    if (part === 2) {
      LatDisplay += " ";
      RusDisplay += " ";
      JpnDisplay += "·";
      ChnDisplay += "·";
    }

    for (const codePoint of str) {
      if (!LatinGlyphs[codePoint.codePointAt(0)]) {
        Lat = 0;
        LatDisplay += "☐";
      } else {
        LatDisplay += codePoint;
      }
      if (!CyrillicGlyphs[codePoint.codePointAt(0)]) {
        Rus = 0;
        RusDisplay += "☐";
      } else {
        RusDisplay += codePoint;
      }
      if (!JapaneseGlyphs[codePoint.codePointAt(0)]) {
        Jpn = 0;
        JpnDisplay += "☐";
      } else {
        JpnDisplay += codePoint;
      }
      if (!SChineseGlyphs[codePoint.codePointAt(0)]) {
        Chn = 0;
        ChnDisplay += "☐";
      } else {
        ChnDisplay += codePoint;
      }
    }
  }


  return {
    All: Lat && Rus && Jpn && Chn,
    None: !(Lat || Rus || Jpn || Chn),
    Lat, Rus, Jpn, Chn,
    LatDisplay, RusDisplay, JpnDisplay, ChnDisplay
  };
}