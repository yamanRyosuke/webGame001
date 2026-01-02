import * as THREE from 'three';

interface ParticleEffect {
  id: string;
  mesh: THREE.Points;
  velocities: THREE.Vector3[];
  lifetimes: number[];
  maxLifetime: number;
  startTime: number;
}

export class EffectsSystem {
  private effects: ParticleEffect[] = [];
  private scene!: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(deltaTime: number) {
    const currentTime = Date.now();
    
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      const elapsed = (currentTime - effect.startTime) / 1000; // Convert to seconds
      
      if (elapsed >= effect.maxLifetime) {
        // Remove expired effect
        this.scene.remove(effect.mesh);
        this.effects.splice(i, 1);
        continue;
      }
      
      this.updateParticleEffect(effect, deltaTime, elapsed);
    }
  }

  private updateParticleEffect(effect: ParticleEffect, deltaTime: number, elapsed: number) {
    const positions = effect.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = effect.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    
    for (let i = 0; i < effect.velocities.length; i++) {
      // Update position
      const velocity = effect.velocities[i];
      positions.setXYZ(
        i,
        positions.getX(i) + velocity.x * deltaTime,
        positions.getY(i) + velocity.y * deltaTime,
        positions.getZ(i) + velocity.z * deltaTime
      );
      
      // Apply gravity to Y velocity
      velocity.y += -9.8 * deltaTime;
      
      // Fade out over time
      const alpha = Math.max(0, 1 - (elapsed / effect.maxLifetime));
      colors.setW(i, alpha);
    }
    
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  createMeteorDestructionEffect(position: THREE.Vector3) {
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 4);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      
      // Start position (slightly randomized)
      positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
      
      // Random velocity (explosive outward)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2, // Upward bias
        (Math.random() - 0.5) * 8
      );
      velocities.push(velocity);
      
      // Orange/red/yellow colors for meteor destruction
      const colorVariant = Math.random();
      if (colorVariant < 0.3) {
        // Red
        colors[i4] = 1.0;
        colors[i4 + 1] = 0.2;
        colors[i4 + 2] = 0.1;
      } else if (colorVariant < 0.6) {
        // Orange
        colors[i4] = 1.0;
        colors[i4 + 1] = 0.5;
        colors[i4 + 2] = 0.0;
      } else {
        // Yellow
        colors[i4] = 1.0;
        colors[i4 + 1] = 1.0;
        colors[i4 + 2] = 0.2;
      }
      colors[i4 + 3] = 1.0; // Alpha
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    const effect: ParticleEffect = {
      id: `meteor_destruction_${Date.now()}`,
      mesh: points,
      velocities,
      lifetimes: new Array(particleCount).fill(0),
      maxLifetime: 1.5, // 1.5 seconds
      startTime: Date.now()
    };

    this.effects.push(effect);
  }

  createMeteorExplosionEffect(position: THREE.Vector3, radius: number) {
    const particleCount = 30;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 4);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      
      // Start position
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;
      
      // Radial explosion velocity
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * (3 + Math.random() * 2),
        Math.random() * 3,
        Math.sin(angle) * (3 + Math.random() * 2)
      );
      velocities.push(velocity);
      
      // Red/orange explosion colors
      colors[i4] = 1.0;
      colors[i4 + 1] = Math.random() * 0.5;
      colors[i4 + 2] = 0.0;
      colors[i4 + 3] = 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    const effect: ParticleEffect = {
      id: `meteor_explosion_${Date.now()}`,
      mesh: points,
      velocities,
      lifetimes: new Array(particleCount).fill(0),
      maxLifetime: 2.0, // 2 seconds
      startTime: Date.now()
    };

    this.effects.push(effect);
  }

  dispose() {
    // Clean up all effects
    for (const effect of this.effects) {
      this.scene.remove(effect.mesh);
    }
    this.effects = [];
  }
}