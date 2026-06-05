function getMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID || "";
}

export function GET() {
  const measurementId = getMeasurementId().trim();

  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    return new Response("window.AKSARA_ANALYTICS_READY=false;", {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });
  }

  const js = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${measurementId}',{send_page_view:true});
window.AKSARA_ANALYTICS_READY=true;
(function(){
  var script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id=${measurementId}';
  document.head.appendChild(script);
})();
`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
