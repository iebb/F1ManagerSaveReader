import {Head, Html, Main, NextScript} from "next/document"

export default function Document() {
  return (
    <Html>
      <Head>
      </Head>
      <body>
      <div dangerouslySetInnerHTML={{ __html: `
        <script async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3253159471656308"
        crossOrigin="anonymous"></script>
        <script defer data-domain="save.f1setup.it" src="https://analytics.nekoko.it/js/script.js"></script>
        <!-- Google tag (gtag.js) -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-QBZNWLVZ76"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        
          gtag('config', 'G-QBZNWLVZ76');
        </script>` }} />
      <Main />
      <NextScript />
      </body>
    </Html>
  )
}
