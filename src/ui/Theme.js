import {createTheme} from "@mui/material";
import {teamColors2023} from "@/js/localization/Teams2023";
import {defaultFontFamily} from "./Fonts";


const { palette } = createTheme();
const { augmentColor } = palette;
const createColor = (mainColor) => augmentColor({ color: { main: mainColor } });
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        fontFeatureSettings: '"ss01" 1, "tnum" 1',
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.unstable_sx({
          mb: 0,
        }),
    },
  },
  MuiTab: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.unstable_sx({
          px: 1.5,
          minWidth: 75,
          borderRadius: 0,
        }),
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: ({ theme }) => theme.unstable_sx({
        borderRadius: 0,
        px: 1.75,
        py: 0.95,
        fontWeight: 700,
        letterSpacing: "0.01em",
        textTransform: "none",
      }),
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => theme.unstable_sx({
        borderRadius: 0,
        border: "1px solid rgba(255,255,255,0.08)",
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => theme.unstable_sx({
        backgroundImage: "none",
      }),
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => theme.unstable_sx({
        backgroundColor: "rgba(10, 18, 24, 0.96)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 0,
        fontSize: 12,
      }),
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: "rgba(255,255,255,0.08)",
      },
    },
  },
};

const defaultPalette = {
  mode: 'dark',
  primary: {
    main: "#57c7ff",
  },
  secondary: {
    main: "#ff935c",
  },
  success: {
    main: "#65d78f",
  },
  warning: {
    main: "#ffbe55",
  },
  error: {
    main: "#ff6b6b",
  },
  background: {
    default: "#071015",
    paper: "#0b141a",
  },
  text: {
    primary: "#f4f8fb",
    secondary: "rgba(228,236,242,0.72)",
  },
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
    shape: {
      borderRadius: 0,
    },
    typography: { fontFamily: defaultFontFamily },
    components,
  })
}
