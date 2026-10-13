'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'

/**
 * Galerie orbitale : les visuels du client flottent autour d'une sphere de
 * particules dorees, vus en orbite. Le composant est volontairement isole du
 * reste de la vitrine — il est charge en `next/dynamic` cote client, jamais
 * pendant le rendu serveur (WebGL n'existe pas la-bas).
 */

const GOLD = '#c9a45c'
const PARTICLE_COUNT = 900
const RING_RADIUS = 6.5
const MIN_IMAGE_HEIGHT = 1.6
const MAX_IMAGE_HEIGHT = 3.6

export interface ParticleSphereProps {
  images: string[]
  className?: string
}

/**
 * Bruit deterministe : le rendu doit rester pur (pas de `Math.random`), et une
 * meme graine redonne exactement la meme sphere a chaque montage.
 */
function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

/** Sphere de points dorees : profondeur, jamais au premier plan. */
function Particles() {
  const positions = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT)
      const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi
      const radius = 9 + (pseudoRandom(i + 1) - 0.5) * 4

      array[i * 3] = radius * Math.cos(theta) * Math.sin(phi)
      array[i * 3 + 1] = radius * Math.cos(phi)
      array[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi)
    }

    return array
  }, [])

  const ref = useRef<THREE.Points>(null)

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={GOLD}
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Les visuels sont poses sur un anneau, orientes vers l'exterieur. La hauteur
 * est deduite du nombre d'images pour qu'elles restent larges quand elles sont
 * peu nombreuses, calees quand elles sont nombreuses.
 *
 * Le ratio de chaque image est respecte (`planeGeometry` prend la largeur
 * reelle) : aucune image n'est rognee, contrairement a un `object-cover`.
 */
function GalleryRing({ images }: { images: string[] }) {
  const textures = useTexture(images)
  const count = images.length

  const slot = (2 * Math.PI * RING_RADIUS) / Math.max(count, 1)
  const imageHeight = Math.min(
    MAX_IMAGE_HEIGHT,
    Math.max(MIN_IMAGE_HEIGHT, slot * 0.8)
  )

  const items = useMemo(() => {
    return textures.map((texture, index) => {
      const angle = (index / count) * Math.PI * 2
      const x = RING_RADIUS * Math.cos(angle)
      const z = RING_RADIUS * Math.sin(angle)

      const position = new THREE.Vector3(x, 0, z)
      const outward = position.clone().normalize()
      const matrix = new THREE.Matrix4().lookAt(
        position.clone().add(outward),
        position,
        new THREE.Vector3(0, 1, 0)
      )
      const euler = new THREE.Euler().setFromRotationMatrix(matrix)

      const image = texture.image as
        | { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
        | undefined
      const width = image?.naturalWidth ?? image?.width ?? 1
      const height = image?.naturalHeight ?? image?.height ?? 1

      return {
        position,
        rotation: euler,
        aspect: height > 0 ? width / height : 1,
        texture,
      }
    })
  }, [textures, count])

  const ref = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.06
  })

  return (
    <group ref={ref}>
      {items.map((item, index) => (
        <mesh
          key={index}
          position={item.position}
          rotation={item.rotation}
        >
          <planeGeometry args={[imageHeight * item.aspect, imageHeight]} />
          <meshBasicMaterial
            map={item.texture}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function ParticleSphere({ images, className }: ParticleSphereProps) {
  const reduce = useReducedMotion()
  const clean = useMemo(
    () => images.filter((url) => typeof url === 'string' && url.trim().length > 0),
    [images]
  )

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 2.4, 14], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={1} />

        <Particles />

        <Suspense fallback={null}>
          {clean.length > 0 && <GalleryRing images={clean} />}
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          autoRotate={!reduce}
          autoRotateSpeed={0.7}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
      </Canvas>
    </div>
  )
}
