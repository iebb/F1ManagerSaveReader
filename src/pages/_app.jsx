import '@/styles/globals.css'
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import {SnackbarProvider} from "notistack";
import Head from "next/head";
import Footer from "../components/UI/Footer";
import Header from "../components/UI/Header";

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
export default function App({ Component, pageProps }) {
  return (<ThemeProvider theme={theme}>
    <Head>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <title>F1Setup.CFD</title>
    </Head>
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right'}}>
      <CssBaseline />
      <Header />
      <Component {...pageProps} />
      <Footer />
    </SnackbarProvider>
  </ThemeProvider>);
}
