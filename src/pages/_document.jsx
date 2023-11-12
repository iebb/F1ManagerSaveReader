import {Head, Html, Main, NextScript} from 'next/document'
import Footer from "../components/UI/Footer";
import Header from "../components/UI/Header";

export default function Document() {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
      <div dangerouslySetInnerHTML={{ __html: `<script async
                  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3253159471656308"
                  crossOrigin="anonymous"></script>` }} />
      <div dangerouslySetInnerHTML={{ __html: `<script defer data-domain="save.f1setup.it" src="https://analytics.nekoko.it/js/script.js"></script>` }} />
      <div dangerouslySetInnerHTML={{ __html: `<script>
            if (document.location.host.includes("vercel.app")) document.location.host = "f1setup.cfd";
        </script>` }} />
      <Main />
      <NextScript />
      </body>
    </Html>
  )
}
