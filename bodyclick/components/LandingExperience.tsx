"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  Float,
  Stars,
  Sparkles,
  CameraControls,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { useRef, useState, useEffect, Suspense } from "react";
import { Group } from "three";
import { useRouter } from "next/navigation";

// --- Configuration ---
const MODELS = {
  human: "/models/human.glb",
  heart: "/models/heart.glb",
};

const THEME = {
  glassColor: "#ffffff",
};

// --- Components ---

function HumanBody({ 
  onHeartClick, 
  active 
}: { 
  onHeartClick: () => void; 
  active: boolean; 
}) {
  const { nodes: humanNodes } = useGLTF(MODELS.human) as any;
  const { scene: heartScene } = useGLTF(MODELS.heart);
  const heartRef = useRef<Group>(null);
  
  // Heartbeat Animation Logic
  useFrame((state) => {
    if (!heartRef.current) return;
    
    const t = state.clock.getElapsedTime();
    const beat = Math.sin(t * 10) * Math.exp(-Math.sin(t) * 2); 
    
    // 심장 크기 설정
    const baseScale = 1.1; 
    const beatScale = (active ? 0.12 : 0.06) * Math.max(0, beat);
    const scale = baseScale + beatScale;
    
    heartRef.current.scale.setScalar(scale);
  });

  const GlassMaterial = (
    <MeshTransmissionMaterial
      backside
      thickness={0.02}       
      roughness={0.02}       
      transmission={0.99}    
      ior={1.1}              
      chromaticAberration={0.02} 
      anisotropy={0.1}
      color={THEME.glassColor}
    />
  );

  return (
    <group dispose={null}>
      {/* Human Shell */}
      <group>
        <primitive object={humanNodes.Scene || humanNodes.root || humanNodes} >
           <mesh position={[0,0,0]}> 
             {GlassMaterial}
           </mesh>
        </primitive>
      </group>

      {/* Internal Organs */}
      {/* 요청하신 정확한 좌표 y=1.125 유지 */}
      <group position={[0, 1.125, 0.15]}> 
        <group 
          ref={heartRef} 
          onClick={onHeartClick} 
          onPointerOver={() => document.body.style.cursor = 'pointer'} 
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
          {/* GLB 원본 그대로 렌더링 */}
          <primitive object={heartScene} />
          
          {/* 심장 자체를 비춰줄 보조 포인트 라이트 */}
          <pointLight 
            color="#ffffff" 
            intensity={active ? 1.2 : 0.8} 
            distance={1.5} 
            decay={2} 
          />
        </group>
      </group>
    </group>
  );
}

// Scene Wrapper
function Experience({ started, setStarted }: { started: boolean; setStarted: (v: boolean) => void }) {
  const controlsRef = useRef<CameraControls>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); // [추가] 오디오 제어를 위한 Ref
  const router = useRouter();

  // [추가] 컴포넌트가 사라질 때(언마운트) 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleInteraction = () => {
    if (!started) {
      setStarted(true);
      
      // 오디오 생성 및 재생
      const audio = new Audio("/heartbeat.mp3");
      audio.volume = 0.6;
      audio.loop = true;
      audio.play().catch(() => {});
      
      // Ref에 저장하여 나중에 제어 가능하게 함
      audioRef.current = audio;

      controlsRef.current?.setLookAt(0, 0, 3, 0, 0, 0, true);
      
      setTimeout(() => {
        // [수정] 페이지 이동 직전에 소리 끄기
        if (audioRef.current) {
          audioRef.current.pause();
        }
        router.push("/explore");
      }, 4000);
    }
  };

  useFrame((state) => {
    if (!started && controlsRef.current) {
      const t = state.clock.getElapsedTime();
      const x = Math.sin(t * 0.3) * 0.3;
      const y = Math.cos(t * 0.3) * 0.3;
      controlsRef.current.setPosition(x, y, 6.5, true);
    }
  });

  return (
    <>
      <CameraControls ref={controlsRef} minDistance={2} maxDistance={10} enabled={false} />
      
      {/* 표준 조명 세팅 유지 */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight position={[2, 5, 2]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-2, 5, 2]} intensity={1.0} color="#ffffff" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={80} scale={5} size={2} speed={0.4} opacity={0.4} color="#ffffff" />

      {/* 모델 전체 위치 잡기 */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[0, -1.0, 0]}> 
          <HumanBody onHeartClick={handleInteraction} active={started} />
        </group>
      </Float>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.9} 
          mipmapBlur 
          intensity={0.3} 
          radius={0.4} 
        />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
      </EffectComposer>
    </>
  );
}

export default function LandingExperience() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", position: 'relative' }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 8], fov: 35 }}
        gl={{ antialias: true, toneMappingExposure: 1.0 }} 
      >
        <Suspense fallback={null}>
          <Experience started={started} setStarted={setStarted} />
        </Suspense>
      </Canvas>

      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: 0,
        width: '100%',
        textAlign: 'center',
        pointerEvents: 'none',
        transition: 'opacity 1s',
        opacity: started ? 0 : 1
      }}>
        <h1 style={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: '0.8rem', 
          letterSpacing: '0.4em', 
          fontFamily: 'sans-serif',
          textTransform: 'uppercase' 
        }}>
          Click the Heart to Begin
        </h1>
      </div>
      
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'black',
        pointerEvents: 'none',
        transition: 'opacity 3s ease-in',
        opacity: started ? 1 : 0,
        zIndex: 10
      }} />
    </div>
  );
}

useGLTF.preload(MODELS.human);
useGLTF.preload(MODELS.heart);