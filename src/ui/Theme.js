import {createTheme} from "@mui/material";
import {teamColors2023} from "@/js/localization/Teams2023";
import {defaultFontFamily} from "./Fonts";


const { palette } = createTheme();
const { augmentColor } = palette;
const createColor = (mainColor) => augmentColor({ color: { main: mainColor } });
const defaultTheme = createTheme({
  palette: {
    mode: 'dark',
    white: {
      main: '#eee',
      contrastText: '#222',
    },
  },
  typography: { fontFamily: defaultFontFamily },
});

const defaultPalette = {
  mode: 'dark',
  white: {
    main: '#eee',
    contrastText: '#222',
  },
};

export const createTeamColorTheme = (version) => {
  const palette = defaultPalette;
  if (window.vc) {
    const cs = getComputedStyle(window.vc);
    for(let i = 1; i <= 32; i++) {
      palette['team' + i] = createColor(cs.getPropertyValue(`--team${i}`) || "#f7f");
    }
  } else {

    for(let i = 1; i <= 32; i++) {
      palette['team' + i] = createColor(teamColors2023[i] || "#f7f");
    }
  }
  return createTheme({
    palette,
    typography: { fontFamily: defaultFontFamily },
  })
}