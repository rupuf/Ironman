// main.js
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#06110f');

// HUD-like grid lines (procedural)
const gridTex = new THREE.CanvasTexture(makeGrid(1024, '#00ffbf', 0.08));
gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
gridTex.repeat.set(2,2);
const hudPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 12),
  new THREE.MeshBasicMaterial({ map:gridTex, color:'#0affd1', transparent:true, opacity:0.35 })
);
hudPlane.position.set(0, 0, -3);
scene.add(hudPlane);

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 4);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 8;
controls.minDistance = 2;

// Rim-lighting + glow feel
const hemi = new THREE.HemisphereLight('#66ffe0', '#06110f', 0.7);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight('#ffffff', 1.2);
keyLight.position.set(3, 5, 6);
keyLight.castShadow = true;
scene.add(keyLight);

const backLight = new THREE.PointLight('#00fff0', 1.5, 20);
backLight.position.set(0, 2, -2);
scene.add(backLight);

// Ground for soft bounce
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50,50),
  new THREE.MeshStandardMaterial({ color:'#071a18', roughness:1, metalness:0 })
);
ground.rotation.x = -Math.PI/2;
ground.position.y = -1.1;
ground.receiveShadow = true;
scene.add(ground);

// Postprocessing composer with bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.6, 0.85);
composer.addPass(bloom);

// Load GLTF armored character (put your GLB in assets/model.glb)
const loader = new GLTFLoader();
let mixer;
let model;

loader.load(
  'assets/model.glb',
  (gltf) => {
    model = gltf.scene;
    model.traverse(o=>{
      if (o.isMesh){
        o.castShadow = true;
        o.receiveShadow = true;
        // emissive for arc-reactor glow
        if (o.material && 'emissive' in o.material){
          const name = o.name?.toLowerCase() || '';
          if (name.includes('reactor') || name.includes('chest')){
            o.material.emissive = new THREE.Color('#72fff7');
            o.material.emissiveIntensity = 3.5;
          }
        }
      }
    });
    model.scale.set(1.2,1.2,1.2);
    model.position.set(0,-1.1,0);
    scene.add(model);

    // Play first embedded animation
    if (gltf.animations && gltf.animations.length){
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations);
      action.play();
    }
  }
);

// Subtle floating + breathing animation if no clips
const clock = new THREE.Clock();
function animate(){
  const dt = clock.getDelta();

  if (mixer) mixer.update(dt);

  if (model && (!mixer)){
    const t = clock.getElapsedTime();
    model.position.y = -1.1 + Math.sin(t*1.5)*0.03;
    model.rotation.y = Math.sin(t*0.5)*0.2;
  }

  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}
animate();

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// Helper: procedural grid
function makeGrid(size=1024, color='#00ffd0', thickness=0.05){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#06110f';
  g.fillRect(0,0,size,size);
  g.strokeStyle = color;
  g.globalAlpha = 0.7;
  g.lineWidth = size*thickness;
  const step = size/16;
  for(let x=0;x<=size;x+=step){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,size); g.stroke(); }
  for(let y=0;y<=size;y+=step){ g.beginPath(); g.moveTo(0,y); g.lineTo(size,y); g.stroke(); }
  return c;
}
