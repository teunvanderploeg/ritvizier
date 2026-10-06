export function VehicleIllustration({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 480 240" fill="none" aria-hidden="true">
    <defs><linearGradient id="body-paint" x1="220" y1="90" x2="220" y2="195" gradientUnits="userSpaceOnUse"><stop stopColor="#6689F9"/><stop offset=".45" stopColor="#315FE5"/><stop offset="1" stopColor="#173FAE"/></linearGradient><linearGradient id="glass-paint" x1="224" y1="69" x2="260" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#274673"/><stop offset="1" stopColor="#91ADC9"/></linearGradient></defs>
    <ellipse cx="245" cy="197" rx="191" ry="16" fill="#112B44" opacity=".09"/>
    <path d="m56 150 32-12 52-50c12-12 28-19 47-19h95c19 0 40 8 55 19l52 39 40 13c9 3 16 12 16 22v15c0 7-5 12-12 12H60c-10 0-18-8-18-18v-4c0-7 6-14 14-17Z" fill="url(#body-paint)"/>
    <path d="m147 95-29 33h225l-36-34c-9-9-21-14-35-14h-96c-11 0-20 5-29 15Z" fill="url(#glass-paint)"/>
    <path d="M218 80v48m61-46 9 45" stroke="#3260DE" strokeWidth="8"/>
    <path d="m151 88-33 40h16l34-48c-7 0-11 4-17 8Z" fill="#C3D9EA" opacity=".35"/>
    <path d="m57 151 24-6h44l-9 12H50m347-12h28l10 8-33 2-5-10Z" fill="#D9EFFD"/>
    <path d="M61 165h361M138 136l-2 29m85-31 1 31m126-32 11 34" stroke="#204CC7" strokeWidth="2"/>
    <path d="M228 139h14m64 0h14" stroke="#BACCFB" strokeWidth="3" strokeLinecap="round"/>
    <path d="M88 188a37 37 0 0 1 74 0m179 0a37 37 0 0 1 74 0" fill="#163D8E"/>
    {[125, 378].map(x => <g key={x}><circle cx={x} cy="182" r="30" fill="#17283D"/><circle cx={x} cy="182" r="20" fill="#CFD8E5"/><circle cx={x} cy="182" r="15" fill="#8997AB"/>{[0,60,120].map(angle => <path key={angle} d={`M${x-15} 182h30`} stroke="#D7E0EB" strokeWidth="4" transform={`rotate(${angle} ${x} 182)`}/>)}<circle cx={x} cy="182" r="5" fill="#61718B"/></g>)}
    <path d="M165 183h171" stroke="#153F9C" strokeWidth="7"/><path d="m52 174 31 1m343-1h11" stroke="#153F9C" strokeWidth="5" strokeLinecap="round"/>
    <path d="m321 118 14 1 6 10h-16l-4-11Z" fill="#1A47BB"/><path d="m390 133 6 2" stroke="#F4C430" strokeWidth="4"/>
  </svg>;
}
