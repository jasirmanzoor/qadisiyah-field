/* AnomalousMatter for the film: the same noise-displaced wireframe icosahedron and fresnel shader as
   src/components/ui/anomalous-matter-hero.tsx, rendered at an exact time t (seconds) instead of on its own clock.
   Rotation follows the component's per-frame steps at 60 fps (y 0.0005, x 0.0002) and noise time is t * 0.3;
   the point light glides on a slow path in place of the mouse. Needs three.js r128 (window.THREE). */
(function () {
  const VS = `uniform float time; varying vec3 vNormal; varying vec3 vPosition;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
  void main(){vNormal=normal;vPosition=position;float displacement=snoise(position*2.0+time*0.5)*0.2;
  vec3 newPosition=position+normal*displacement;gl_Position=projectionMatrix*modelViewMatrix*vec4(newPosition,1.0);}`;
  const FS = `uniform vec3 color; uniform vec3 pointLightPos; uniform float alpha; varying vec3 vNormal; varying vec3 vPosition;
  void main(){vec3 normal=normalize(vNormal);vec3 lightDir=normalize(pointLightPos-vPosition);float diffuse=max(dot(normal,lightDir),0.0);
  float fresnel=1.0-dot(normal,vec3(0.0,0.0,1.0));fresnel=pow(fresnel,2.0);
  vec3 finalColor=color*diffuse+color*fresnel*0.5;gl_FragColor=vec4(finalColor*alpha,alpha);}`;
  window.MatterBG = function (parent, o = {}) {
    const T = window.THREE, w = o.w || 1920, h = o.h || 1080;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.style.cssText = `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;pointer-events:none;mix-blend-mode:screen;${o.css || ""}`;
    parent.insertBefore(cv, o.before || parent.firstChild);
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
    renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(75, w / h, .1, 1000); camera.position.z = o.z || 3;
    const material = new T.ShaderMaterial({ uniforms: { time: { value: 0 }, pointLightPos: { value: new T.Vector3(0, 0, 5) }, color: { value: new T.Color(o.color || "#ff6a00") }, alpha: { value: 1 } },
      vertexShader: VS, fragmentShader: FS, wireframe: true, transparent: true, depthWrite: false });
    const mesh = new T.Mesh(new T.IcosahedronGeometry(o.radius || 1.2, o.detail || 64), material);
    mesh.position.set(o.mx || 0, o.my || 0, 0); scene.add(mesh);
    return (t, a = 1) => {
      material.uniforms.time.value = (t + (o.t0 || 0)) * 0.3;
      mesh.rotation.y = (t + (o.t0 || 0)) * 60 * 0.0005; mesh.rotation.x = (t + (o.t0 || 0)) * 60 * 0.0002;
      const lt = t * .35; material.uniforms.pointLightPos.value.set(Math.sin(lt) * 2.2, Math.cos(lt * .8) * 1.4 + .4, 2.6);
      material.uniforms.alpha.value = a; cv.style.opacity = a > 0 ? 1 : 0;
      renderer.render(scene, camera);
    };
  };
})();
