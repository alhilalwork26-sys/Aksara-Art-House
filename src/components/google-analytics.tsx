import Script from "next/script";

export function GoogleAnalytics() {
  return <Script src="/analytics.js" strategy="afterInteractive" />;
}
