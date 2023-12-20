import {Plus_Jakarta_Sans} from "next/font/google";

export const defaultFont = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const defaultFontFamily = `"Plus Jakarta Sans", ${defaultFont.style.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", ` +
  'Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';