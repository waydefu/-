// @ts-nocheck

import { disposeObjectTree } from "./dispose-utils.js";

class ModalGlass {
  constructor(THREE, scene, camera, options = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.reduced = Boolean(options.reduced);
    this.defaultWidth = 4.8;
    this.defaultHeight = 2.7;
    this.targetOpacity = 0.34;
    this.group = new THREE.Group();
    this.group.name = "SAO Modal Glass Backplate";
    this.group.visible = false;
    this.group.renderOrder = 4;
    this.group.position.set(0, 0, 3.2);

    this.createBackplate();
    this.createRim();
    this.setBloomLayer(options.bloomLayer);
    scene.add(this.group);
  }

  createBackplate() {
    const THREE = this.THREE;
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x241507,
      metalness: 0.08,
      roughness: 0.34,
      transmission: 0.68,
      thickness: 0.82,
      ior: 1.32,
      clearcoat: 0.72,
      clearcoatRoughness: 0.22,
      transparent: true,
      opacity: this.targetOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });
    this.backplate = new THREE.Mesh(new THREE.PlaneGeometry(this.defaultWidth, this.defaultHeight, 1, 1), this.glassMaterial);
    this.group.add(this.backplate);

    const shadeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uOpacity: { value: 0.18 },
        uGold: { value: new THREE.Color(0xffd76a) },
        uTeal: { value: new THREE.Color(0x0fd5cd) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uGold;
        uniform vec3 uTeal;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float edge = smoothstep(0.34, 0.5, max(abs(p.x), abs(p.y)));
          float core = 1.0 - smoothstep(0.0, 0.58, length(p * vec2(1.1, 0.78)));
          vec3 color = mix(uGold, uTeal, smoothstep(-0.42, 0.42, p.x)) * (edge * 0.72 + core * 0.24);
          gl_FragColor = vec4(color, (edge + core * 0.4) * uOpacity);
        }
      `
    });
    this.shadeMaterial = shadeMaterial;
    this.shade = new THREE.Mesh(new THREE.PlaneGeometry(this.defaultWidth * 1.04, this.defaultHeight * 1.08, 1, 1), shadeMaterial);
    this.shade.position.z = 0.018;
    this.group.add(this.shade);
  }

  createRim() {
    const THREE = this.THREE;
    this.rimMaterial = new THREE.LineBasicMaterial({
      color: 0xffe2a0,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(this.defaultWidth * 1.035, this.defaultHeight * 1.07)),
      this.rimMaterial
    );
    this.rim.position.z = 0.026;
    this.group.add(this.rim);
  }

  setBloomLayer(layer) {
    if (typeof layer !== "number") return;
    this.group.traverse((object) => object.layers?.enable(layer));
  }

  fitToRect(rect) {
    if (!rect || !this.camera) return;
    const distance = Math.max(0.1, Math.abs(this.camera.position.z - this.group.position.z));
    const visibleHeight = 2 * Math.tan((this.camera.fov * Math.PI / 180) / 2) * distance;
    const visibleWidth = visibleHeight * this.camera.aspect;
    const centerX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
    const centerY = ((rect.top + rect.height / 2) / window.innerHeight) * 2 - 1;
    const width = (rect.width / window.innerWidth) * visibleWidth;
    const height = (rect.height / window.innerHeight) * visibleHeight;
    this.group.position.x = centerX * visibleWidth * 0.5;
    this.group.position.y = -centerY * visibleHeight * 0.5;
    this.group.scale.set(
      Math.max(0.72, width / this.defaultWidth),
      Math.max(0.62, height / this.defaultHeight),
      1
    );
  }

  show(rect) {
    if (!this.group) return;
    this.fitToRect(rect);
    this.group.visible = true;
    this.group.quaternion.copy(this.camera.quaternion);
    const gsap = window.gsap;
    if (this.reduced || !gsap) {
      this.group.scale.multiplyScalar(1);
      this.glassMaterial.opacity = this.targetOpacity;
      this.shadeMaterial.uniforms.uOpacity.value = 0.18;
      this.rimMaterial.opacity = 0.46;
      return;
    }
    gsap.killTweensOf([this.glassMaterial, this.rimMaterial, this.shadeMaterial.uniforms.uOpacity, this.group.scale]);
    this.glassMaterial.opacity = 0;
    this.rimMaterial.opacity = 0;
    this.shadeMaterial.uniforms.uOpacity.value = 0;
    this.group.scale.multiplyScalar(0.92);
    gsap.to(this.glassMaterial, { opacity: this.targetOpacity, duration: 0.42, ease: "power2.out" });
    gsap.to(this.rimMaterial, { opacity: 0.46, duration: 0.5, ease: "power2.out" });
    gsap.to(this.shadeMaterial.uniforms.uOpacity, { value: 0.18, duration: 0.5, ease: "power2.out" });
    gsap.to(this.group.scale, { x: this.group.scale.x / 0.92, y: this.group.scale.y / 0.92, duration: 0.5, ease: "back.out(1.4)" });
  }

  hide() {
    if (!this.group?.visible) return;
    const gsap = window.gsap;
    const finish = () => {
      if (this.group) this.group.visible = false;
    };
    if (this.reduced || !gsap) {
      finish();
      return;
    }
    gsap.killTweensOf([this.glassMaterial, this.rimMaterial, this.shadeMaterial.uniforms.uOpacity]);
    gsap.to(this.glassMaterial, { opacity: 0, duration: 0.26, ease: "power2.in" });
    gsap.to(this.rimMaterial, { opacity: 0, duration: 0.22, ease: "power2.in" });
    gsap.to(this.shadeMaterial.uniforms.uOpacity, { value: 0, duration: 0.22, ease: "power2.in", onComplete: finish });
  }

  update() {
    if (!this.group?.visible || !this.camera) return;
    this.group.quaternion.copy(this.camera.quaternion);
  }

  dispose() {
    if (!this.group) return;
    disposeObjectTree(this.group);
    this.group.removeFromParent?.();
    this.group = null;
  }
}

export { ModalGlass };
