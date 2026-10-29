type SlimeIllustrationProps = { color?: 'green' | 'blue' | 'red' }

/** Decorative placeholder art, not a game entity or a finalized Tier design. */
export function SlimeIllustration({ color = 'green' }: SlimeIllustrationProps) {
  return (
    <svg className={`slime slime--${color}`} viewBox="0 0 240 200" aria-hidden="true">
      <ellipse className="slime-shadow" cx="120" cy="177" rx="90" ry="13" />
      <path className="slime-body" d="M29 151C24 117 48 49 86 36C110 28 119 14 124 20C129 29 133 34 149 39C190 52 216 115 212 151C208 178 183 180 163 174C138 184 116 179 108 177C75 185 30 179 29 151Z" />
      <path className="slime-shine" d="M57 100C64 78 73 64 90 59" fill="none" strokeWidth="12" strokeLinecap="round" />
      <ellipse className="slime-eye" cx="93" cy="120" rx="6" ry="10" />
      <ellipse className="slime-eye" cx="150" cy="120" rx="6" ry="10" />
      <ellipse className="slime-cheek" cx="76" cy="138" rx="12" ry="7" />
      <ellipse className="slime-cheek" cx="166" cy="138" rx="12" ry="7" />
      <path className="slime-mouth" d="M111 139Q121 150 132 139" fill="none" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
