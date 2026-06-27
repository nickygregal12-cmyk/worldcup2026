import logo from '../assets/fifa-world-cup-2026-white.png'

const VARIANTS = {
  watermark: {
    position: 'absolute',
    right: '-10px',
    top: '50%',
    width: '150px',
    height: '150px',
    transform: 'translateY(-50%)',
    objectFit: 'contain',
    opacity: 0.1,
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 0,
  },
  hero: {
    display: 'block',
    width: '94px',
    height: '94px',
    objectFit: 'contain',
    margin: '0 auto 12px',
    filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.24))',
  },
  compact: {
    display: 'block',
    width: '44px',
    height: '44px',
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.22))',
  },
  share: {
    display: 'block',
    width: '58px',
    height: '58px',
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'drop-shadow(0 5px 12px rgba(0,0,0,0.34))',
  },
}

export default function WorldCupLogo({ variant = 'watermark', size, opacity, style, className = '', decorative }) {
  const isDecorative = decorative ?? variant === 'watermark'
  const base = VARIANTS[variant] || VARIANTS.watermark

  return (
    <img
      src={logo}
      alt={isDecorative ? '' : 'FIFA World Cup 2026'}
      aria-hidden={isDecorative ? true : undefined}
      className={className}
      draggable="false"
      style={{
        ...base,
        ...(size ? { width: size, height: size } : {}),
        ...(opacity != null ? { opacity } : {}),
        ...style,
      }}
    />
  )
}
