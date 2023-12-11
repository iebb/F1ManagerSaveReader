import {Head, Html, Main, NextScript} from 'next/document'

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
      <Main />
      <NextScript />
      </body>
    </Html>
  )
}
