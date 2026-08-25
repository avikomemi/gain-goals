import React from 'react';
import { NavLink } from 'react-router-dom';
import { Alert } from '../store/adi';

export function Nav() {
  const items = [
    { to: '/', ico: '📊', label: 'דשבורד' },
    { to: '/workout', ico: '🥋', label: 'אימון' },
    { to: '/journal', ico: '📓', label: 'יומן' },
    { to: '/trends', ico: '📈', label: 'מגמות' },
    { to: '/team', ico: '🤝', label: 'הצוות' },
  ];
  return (
    <nav className="nav">
      {items.map(it => (
        <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
          <i>{it.ico}</i>{it.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function PulseRing({ done, total }: { done: number; total: number }) {
  const C = 2 * Math.PI * 58;
  const off = C * (1 - Math.min(done / total, 1));
  return (
    <div className="ring">
      <svg width="128" height="128" viewBox="0 0 132 132">
        <circle className="tr" cx="66" cy="66" r="58" />
        <circle className="br" cx="66" cy="66" r="58" strokeDasharray={C} strokeDashoffset={off} />
      </svg>
      <div className="core"><b className="num">{done}/{total}</b><span>השבוע</span></div>
    </div>
  );
}

export function Alerts({ list }: { list: Alert[] }) {
  if (!list.length) return null;
  return (
    <div className="mt16">
      {list.map((a, i) => (
        <div className="alert" key={i}>⚠️ <span><b>{a.from}:</b> {a.text}</span></div>
      ))}
    </div>
  );
}

export function heDate(d?: string) {
  const date = d ? new Date(d + 'T12:00:00') : new Date();
  return date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
}
