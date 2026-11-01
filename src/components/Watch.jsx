import { useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../sfx.js';

// Play button: the supplied watch image (public/art/omnitrix.png). Tap = quick charge pulse, then the page warps.
export default function Watch({ onPress }) {
  const [k, setK] = useState(0);
  return (
    <motion.button className="watch" aria-label="Play" whileTap={{ scale: .93 }} onClick={() => { sfx.click(); setK(n => n + 1); onPress(); }}>
      <motion.img key={k} src={`${import.meta.env.BASE_URL}art/omnitrix.png`} alt="" draggable="false" animate={k ? { rotate: [0, -6, 6, 0], scale: [1, 1.18, 1.05], filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1.4)'] } : {}} transition={{ duration: .45 }} />
    </motion.button>
  );
}
