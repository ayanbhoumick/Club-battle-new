import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../sfx.js';

/** Chunky arcade buttons. variant: play (orange) | slate | key (pink keycap) */
export const Btn = forwardRef(({ variant = 'play', className = '', onClick, children, ...p }, ref) => (
  <motion.button ref={ref} whileTap={{ y: 3 }} className={`btn btn-${variant} ${className}`} onClick={e => { sfx.click(); onClick?.(e); }} {...p}>
    <span className="btn-face">{children}</span>
  </motion.button>
));
export const Key = ({ children, wide }) => <kbd className={`keycap ${wide ? 'wide' : ''}`}><span>{children}</span></kbd>;
export const Heading = ({ title, sub }) => <header className="heading"><h2>{title}</h2>{sub && <p>{sub}</p>}</header>;
export const Avatar = ({ size = 40 }) => (
  <svg className="avatar" width={size} height={size} viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden="true">
    <rect width="14" height="14" fill="#3a2a5c" />
    <path d="M5 1h4v1h1v1h1v1h1v1H2V4h1V3h1V2h1z" fill="#2a1d3f" /><rect x="4" y="3" width="6" height="1" fill="#ff7ac8" />
    <rect x="2" y="5" width="10" height="7" fill="#fff1dc" /><rect x="3" y="12" width="8" height="1" fill="#fff1dc" />
    <rect x="8" y="6" width="2" height="2" fill="#1a1226" /><rect x="8" y="6" width="1" height="1" fill="#fff" />
    <rect x="11" y="7" width="2" height="2" fill="#ff9a2e" /><rect x="3" y="9" width="2" height="1" fill="#ff7ac8" />
  </svg>
);
export const Hearts = ({ total, left }) => (
  <span className="hearts" role="img" aria-label={`${left} of ${total} flaps left`}>
    {Array.from({ length: total }, (_, i) => <i key={i} className={i < left ? 'on' : ''} />)}
  </span>
);
