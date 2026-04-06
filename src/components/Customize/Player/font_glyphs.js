import {CyrillicGlyphs, JapaneseGlyphs, LatinGlyphs, SChineseGlyphs} from "@/components/Customize/Player/glyphs/consts";
// use https://fontdrop.info/ to generate unicode mapping


export const TestStringCompatibility = (...args) => {
  let Lat = 1, Rus = 1, Jpn = 1, Chn = 1;
  let LatDisplay = "", RusDisplay = "", JpnDisplay = "", ChnDisplay = "";
  const Characters = [];

  let part = 0;
  for(const str of args) {
    part += 1;
    if (part === 2) {
      LatDisplay += " ";
      RusDisplay += " ";
      JpnDisplay += "·";
      ChnDisplay += "·";
      Characters.push({
        char: " ",
        separator: true,
        Lat: true,
        Rus: true,
        Jpn: true,
        Chn: true,
      });
    }

    for (const codePoint of str) {
      const code = codePoint.codePointAt(0);
      const charInfo = {
        char: codePoint,
        separator: false,
        Lat: !!LatinGlyphs[code],
        Rus: !!CyrillicGlyphs[code],
        Jpn: !!JapaneseGlyphs[code],
        Chn: !!SChineseGlyphs[code],
      };

      if (!charInfo.Lat) {
        Lat = 0;
        LatDisplay += "☐";
      } else {
        LatDisplay += codePoint;
      }
      if (!charInfo.Rus) {
        Rus = 0;
        RusDisplay += "☐";
      } else {
        RusDisplay += codePoint;
      }
      if (!charInfo.Jpn) {
        Jpn = 0;
        JpnDisplay += "☐";
      } else {
        JpnDisplay += codePoint;
      }
      if (!charInfo.Chn) {
        Chn = 0;
        ChnDisplay += "☐";
      } else {
        ChnDisplay += codePoint;
      }
      Characters.push(charInfo);
    }
  }


  return {
    All: Lat && Rus && Jpn && Chn,
    None: !(Lat || Rus || Jpn || Chn),
    Lat, Rus, Jpn, Chn,
    LatDisplay, RusDisplay, JpnDisplay, ChnDisplay,
    Characters,
  };
}
