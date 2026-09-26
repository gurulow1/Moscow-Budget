// Colored light behind the light theme (hidden at night and when motion is reduced by the low-vision mode).
export default function Aurora() {
  return (
    <div aria-hidden="true" className="mgb-aurora decorative-canvas">
      <span style={{ width: '70%', height: '44%', left: '-4%', top: '2%', background: '#B3CCFF' }} />
      <span style={{ width: '60%', height: '38%', right: '-6%', top: '36%', background: '#BDF1DF', animationDuration: '24s', animationDelay: '-8s' }} />
      <span style={{ width: '76%', height: '36%', left: '6%', bottom: 0, background: '#FFCDD6', animationDuration: '28s', animationDelay: '-14s' }} />
    </div>
  );
}
