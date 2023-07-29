import '@/styles/globals.css'
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import type { AppProps } from 'next/app'
import Head from "next/head";

const theme = createTheme({
  palette: {
    mode: 'dark',
    white: {
      main: '#eee',
      contrastText: '#222',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", ' +
      'Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
});
export default function App({ Component, pageProps }: AppProps) {
  return (<ThemeProvider theme={theme}>
    <Head>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <title>F1 Manager Setup Calculator</title>
    </Head>
    <CssBaseline />
    <Component {...pageProps} />
  </ThemeProvider>);
}
