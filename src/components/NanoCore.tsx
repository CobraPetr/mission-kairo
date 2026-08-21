const CENTER_X = 170
const CENTER_Y = 132

const segments = Array.from({ length: 72 }, (_, index) => {
  const angle = (index / 72) * Math.PI * 2 - Math.PI / 2
  const innerRadius = index % 6 === 0 ? 96 : 99
  const outerRadius = 104

  return {
    x1: CENTER_X + Math.cos(angle) * innerRadius,
    y1: CENTER_Y + Math.sin(angle) * innerRadius,
    x2: CENTER_X + Math.cos(angle) * outerRadius,
    y2: CENTER_Y + Math.sin(angle) * outerRadius,
  }
})

export function NanoCore() {
  return (
    <div className="nano-stage mission-dial" aria-hidden="true">
      <svg viewBox="0 0 340 330" focusable="false">
        <g className="dial-system">
        <g className="dial-segments">
          {segments.map((segment, index) => (
            <line
              key={index}
              {...segment}
            />
          ))}
        </g>

        <circle className="dial-boundary" cx={CENTER_X} cy={CENTER_Y} r="89" />
        <circle className="dial-progress-track" cx={CENTER_X} cy={CENTER_Y} r="80" />

        <g className="dial-pulses">
          <circle cx={CENTER_X} cy={CENTER_Y} r="54" />
          <circle cx={CENTER_X} cy={CENTER_Y} r="54" />
        </g>

        <circle className="dial-inner" cx={CENTER_X} cy={CENTER_Y} r="54" />
        <path className="dial-chevron" d="M153 119L170 103L187 119 M158 125L170 114L182 125" />

        <text className="dial-value" x={CENTER_X} y="147">00%</text>
        <text className="dial-status" x={CENTER_X} y="166">ARC PROGRESS</text>

        <g className="dial-cardinals">
          <path d="M170 18V28 M170 236V246 M56 132H66 M274 132H284" />
          <circle cx="170" cy="25" r="2.2" />
        </g>

        <g className="dial-locks">
          <path d="M72 58V46H84 M256 46H268V58 M72 206V218H84 M256 218H268V206" />
        </g>
        </g>

        <g className="dial-readout">
          <line x1="91" y1="309" x2="249" y2="309" />
          <text x={CENTER_X} y="327">DAY 00 // OBJECTIVE 90</text>
        </g>
      </svg>
    </div>
  )
}
