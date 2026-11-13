import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Decal, Environment, Html, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { prendaDe, type Prenda as PrendaDatos, type Zona } from './catalogo';

/** Devuelve una foto cuadrada de la prenda vista de frente o de espalda. */
export type Capturar = (vista: Zona['id'], lado: number) => HTMLCanvasElement | null;

type Props = {
  prenda: PrendaDatos;
  color: string;
  texturas: Record<Zona['id'], THREE.CanvasTexture>;
  vista: Zona['id'];
  capturar?: MutableRefObject<Capturar | null>;
};

function aFloat(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  if (a.array instanceof Float32Array && !a.normalized && !(a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) return a;
  const n = a.itemSize;
  const out = new Float32Array(a.count * n);
  for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) out[i * n + c] = a.getComponent(i, c);
  return new THREE.BufferAttribute(out, n);
}

/** Junta todas las mallas del GLB con sus transformaciones aplicadas, en coordenadas de la prenda. */
function useGeometriaPrenda(prenda: PrendaDatos) {
  const { scene } = useGLTF(prenda.modelo);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const partes: THREE.BufferGeometry[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone();
      for (const k of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        // modelos cuantizados (KHR_mesh_quantization): a float antes de transformar, y porque el Decal lee el array crudo
        else g.setAttribute(k, aFloat(g.getAttribute(k)));
      }
      g.applyMatrix4(m.matrixWorld);
      partes.push(g);
    });
    // mergeGeometries exige que todas sean indexadas o ninguna
    const mixtas = partes.some((g) => !g.index);
    const listas = mixtas ? partes.map((g) => (g.index ? g.toNonIndexed() : g)) : partes;
    const geo = listas.length > 1 ? mergeGeometries(listas) ?? listas[0] : listas[0];
    geo.scale(prenda.escala, prenda.escala, prenda.escala);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }, [scene, prenda.escala]);
}

/** Ruido fino para que la tela no se vea plástica. */
function useTexturaTejido() {
  return useMemo(() => {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    const data = ctx.createImageData(s, s);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 110 + Math.random() * 60;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 14);
    return t;
  }, []);
}

function Prenda({ prenda, color, texturas, grupo }: Omit<Props, 'vista' | 'capturar'> & { grupo: MutableRefObject<THREE.Group | null> }) {
  const geo = useGeometriaPrenda(prenda);
  const tejido = useTexturaTejido();
  const u = prenda.unidadesPorCm;

  return (
    <group ref={grupo} position={[0, prenda.desplazY, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.93}
          metalness={0}
          side={THREE.DoubleSide}
          bumpMap={tejido}
          bumpScale={0.6}
        />
        {prenda.zonas.map((z) => (
          <Decal
            key={z.id}
            position={z.centro}
            rotation={[0, z.rotY, 0]}
            // profundidad suficiente para la curvatura del pecho sin alcanzar el lado opuesto
            scale={[z.anchoCm * u, z.altoCm * u, 0.2]}
            depthTest
            polygonOffsetFactor={-4}
          >
            <meshStandardMaterial
              map={texturas[z.id]}
              transparent
              depthWrite={false}
              roughness={0.85}
              bumpMap={tejido}
              bumpScale={0.3}
              polygonOffset
              polygonOffsetFactor={-4}
            />
          </Decal>
        ))}
      </mesh>
    </group>
  );
}

/** Gira la cámara hacia la zona activa; si el usuario arrastra, se le cede el control. */
function Camara({ vista }: { vista: Zona['id'] }) {
  const controls = useRef<OrbitControlsImpl>(null!);
  const { camera, size } = useThree();
  const objetivo = useRef<number | null>(null);

  useEffect(() => {
    // distancia para que entren las mangas también en pantallas angostas
    const aspecto = size.width / size.height;
    const d = Math.min(2.4, Math.max(1.3, 1.2 / (0.63 * aspecto)));
    camera.position.setLength(d);
    controls.current?.update();
  }, [size.width, size.height, camera]);

  useEffect(() => {
    objetivo.current = vista === 'frente' ? 0 : Math.PI;
  }, [vista]);

  useFrame((_, dt) => {
    if (objetivo.current === null || !controls.current) return;
    const p = camera.position;
    const actual = Math.atan2(p.x, p.z);
    let diff = objetivo.current - actual;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < 0.002) {
      objetivo.current = null;
      return;
    }
    const a = actual + diff * Math.min(1, dt * 5);
    const r = Math.hypot(p.x, p.z);
    p.x = Math.sin(a) * r;
    p.z = Math.cos(a) * r;
    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={0.45}
      maxDistance={2.6}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.68}
      rotateSpeed={0.7}
      onStart={() => (objetivo.current = null)}
    />
  );
}

/**
 * Renderiza la escena con una cámara temporal (de frente o de espalda) y recorta el centro en un cuadro.
 * Se dibuja sobre el mismo canvas y se copia en el acto; el siguiente cuadro vuelve a la cámara del usuario.
 */
function Capturador({ destino, grupo }: { destino: MutableRefObject<Capturar | null>; grupo: MutableRefObject<THREE.Group | null> }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    destino.current = (vista, lado) => {
      if (!grupo.current) return null;
      const el = gl.domElement;
      const w = el.width;
      const h = el.height;
      const s = Math.min(w, h);
      const cam = (camera as THREE.PerspectiveCamera).clone();
      cam.aspect = w / h;
      // distancia para que la prenda completa quepa en el cuadro central
      const caja = new THREE.Box3().setFromObject(grupo.current);
      const mitad = Math.max(caja.max.x - caja.min.x, caja.max.y - caja.min.y) / 2 * 1.1;
      const tanMedio = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * (s / h);
      const d = mitad / tanMedio + (caja.max.z - caja.min.z) / 2;
      const cy = (caja.max.y + caja.min.y) / 2;
      cam.position.set(0, cy, vista === 'frente' ? d : -d);
      cam.lookAt(0, cy, 0);
      cam.updateProjectionMatrix();
      gl.render(scene, cam);
      const out = document.createElement('canvas');
      out.width = out.height = lado;
      out.getContext('2d')!.drawImage(el, (w - s) / 2, (h - s) / 2, s, s, 0, 0, lado, lado);
      gl.render(scene, camera);
      return out;
    };
    return () => {
      destino.current = null;
    };
  }, [gl, scene, camera, destino, grupo]);

  return null;
}

export default function Prenda3D({ prenda, color, texturas, vista, capturar }: Props) {
  const grupo = useRef<THREE.Group | null>(null);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.02, 1.5], fov: 35, near: 0.05, far: 20 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[1.5, 2.5, 2]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-2, 1, -2]} intensity={0.6} />
      {/* entorno armado con luces locales: sin descargar HDRIs */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.5} position={[0, 3, 2]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[4, 1, 0]} rotation-y={-Math.PI / 2} scale={[3, 4, 1]} />
        <Lightformer form="ring" color="#d1262c" intensity={0.8} position={[0, 0.5, -4]} scale={3} />
      </Environment>
      <Suspense
        key={prenda.id}
        fallback={
          <Html center>
            <span className="cfg-cargando">Cargando {prenda.nombre.toLowerCase()}…</span>
          </Html>
        }
      >
        <Prenda prenda={prenda} color={color} texturas={texturas} grupo={grupo} />
      </Suspense>
      <Camara vista={vista} />
      {capturar && <Capturador destino={capturar} grupo={grupo} />}
    </Canvas>
  );
}

useGLTF.preload(prendaDe('playera').modelo);
