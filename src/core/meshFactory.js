import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function mat(c, rough=.5, metal=.05, em=0, ei=0){
  return new THREE.MeshStandardMaterial({
    color:c,
    roughness:rough,
    metalness:metal,
    emissive:em,
    emissiveIntensity:ei
  });
}

export function basic(c, op=1){
  return new THREE.MeshBasicMaterial({
    color:c,
    transparent:op<1,
    opacity:op
  });
}

export function neon(c, int=1.2){
  return new THREE.MeshStandardMaterial({
    color:c,
    roughness:.22,
    metalness:.12,
    emissive:c,
    emissiveIntensity:int
  });
}

export function box(w,h,d,m){
  return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
}

export function cyl(r,h,m,seg=16){
  return new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m);
}

export function sphere(r,m,seg=24){
  return new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg),m);
}
