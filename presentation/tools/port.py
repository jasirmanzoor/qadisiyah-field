"""Port React Bits GhostFibers + AeroShards to framework-free mount functions. The component code is kept verbatim;
only the React shell (imports, hooks, JSX) is replaced."""
import sys, re
S = sys.argv[1]; R = S + "/rb/"; O = S + "/kn/rb/"
L = lambda f: open(R + f, encoding="utf-8").read().split("\n")
def block(lines, a, b): return "\n".join(lines[a - 1:b])   # 1-indexed inclusive

# ---------- GhostFibers (WebGL2) ----------
g = L("GhostFibers.jsx")
assert g[536].startswith("const GhostFibers = ({") and g[575].startswith("}) => {") and g[621].strip() == "useEffect(() => {" and g[1076].strip() == "}, []);"
header = block(g, 7, 536)
params = block(g, 538, 575)                       # destructured defaults
settings = block(g, 580, 618).replace("const settings = {", "return {", 1)
body = block(g, 623, 1076)
gf = f"""/* GhostFibers: React Bits (reactbits.dev), ported to a framework-free mount. Shader and render code unchanged. */
window.RB = window.RB || {{}};
(function () {{
{header}
const settingsOf = ({{
{params}
}} = {{}}) => {{
{settings}
}};
window.RB.GhostFibers = function mount(container, props) {{
  let current = Object.assign({{}}, props);
  const canvas = document.createElement('canvas');
  canvas.className = 'ghost-fibers-canvas'; canvas.setAttribute('aria-hidden', 'true');
  container.classList.add('ghost-fibers-container'); container.appendChild(canvas);
  const containerRef = {{ current: container }}, canvasRef = {{ current: canvas }}, wakeRef = {{ current: null }};
  const settingsRef = {{ current: settingsOf(current) }};
  const dispose = (() => {{
{body}
  }})();
  return {{
    ok: !!dispose,
    set(p) {{ current = Object.assign(current, p); settingsRef.current = settingsOf(current); wakeRef.current && wakeRef.current(); }},
    destroy() {{ dispose && dispose(); canvas.remove(); }}
  }};
}};
}})();
"""
open(O + "ghostfibers.js", "w").write(gf)

# ---------- AeroShards (WebGPU via vgpu) ----------
a = L("AeroShards.jsx")
assert a[939].startswith("export default function AeroShards({") and a[969].startswith("}) {") and a[1005].strip() == "useEffect(() => {" and a[2151].strip() == "}, []);"
assert "from 'vgpu'" in a[3]
header = block(a, 6, 939)
params = block(a, 941, 969)
settings = block(a, 975, 1002).replace("const settings = {", "return {", 1)
body = block(a, 1007, 2151)
af = f"""/* AeroShards: React Bits (reactbits.dev), ported to a framework-free mount. WebGPU code unchanged; vgpu loads on demand. */
window.RB = window.RB || {{}};
window.RB.AeroShards = async function mount(container, props) {{
  const {{ draw, effect, frame, init, sampler, storage, surface, target, uniforms }} = await import('https://cdn.jsdelivr.net/npm/vgpu@0.3.1/+esm');
{header}
  const settingsOf = ({{
{params}
  }} = {{}}) => {{
{settings}
  }};
  let current = Object.assign({{}}, props);
  container.classList.add(ROOT);
  const containerRef = {{ current: container }}, onErrorRef = {{ current: current.onError }};
  const settingsRef = {{ current: settingsOf(current) }};
  const dispose = (() => {{
{body}
  }})();
  return {{
    set(p) {{ current = Object.assign(current, p); settingsRef.current = settingsOf(current); }},
    destroy() {{ dispose && dispose(); }}
  }};
}};
"""
open(O + "aeroshards.js", "w").write(af)
print("ok", len(gf), len(af))
