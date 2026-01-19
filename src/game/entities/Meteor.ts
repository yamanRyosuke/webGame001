import * as THREE from 'three';
import { getTerrainHeight } from '../three/SceneFactory';

export enum MeteorState {
  Telegraph = 'telegraph',
  Falling = 'falling',
  Destroyed = 'destroyed',
  Exploded = 'exploded'
}

export class Meteor {
  private mesh!: THREE.Mesh;
  private telegraph!: THREE.Mesh;
  private group!: THREE.Group;
  private position = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private state = MeteorState.Telegraph;
  private timer = 0;

  // Parameters from spec - adjustable for gameplay tuning
  private readonly telegraphDuration = 1.0;
  private fallSpeed = 12; // Now adjustable
  private readonly meteorRadius = 0.45;
  private readonly telegraphRadius = 0.7;
  private readonly explosionRadius = 1.6;
  private readonly spawnHeight = 12;

  constructor(targetPos: THREE.Vector3) {
    this.targetPosition.copy(targetPos);
    this.targetPosition.y = 0; // Ground level

    this.position.set(targetPos.x, this.spawnHeight, targetPos.z);
    this.createMesh();
    this.createTelegraph();
  }

  private createMesh() {
    this.group = new THREE.Group();

    // Main meteor body
    const meteorGeometry = new THREE.SphereGeometry(this.meteorRadius, 12, 8);
    const meteorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xff4444,
      emissive: 0x221111
    });
    
    this.mesh = new THREE.Mesh(meteorGeometry, meteorMaterial);
    this.mesh.castShadow = true;
    this.mesh.visible = false; // Hidden during telegraph
    
    // Add glowing trail effect
    const trailGeometry = new THREE.ConeGeometry(this.meteorRadius * 0.8, 2, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6666,
      transparent: true,
      opacity: 0.6
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.y = 1;
    trail.rotation.x = Math.PI;
    this.mesh.add(trail);

    this.group.add(this.mesh);
  }

  private createTelegraph() {
    // Warning circle on ground showing where meteor will land
    const telegraphGeometry = new THREE.RingGeometry(0.3, this.telegraphRadius, 32);
    const telegraphMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    this.telegraph = new THREE.Mesh(telegraphGeometry, telegraphMaterial);
    // Rotate to lie flat on the ground
    this.telegraph.rotation.x = -Math.PI / 2;
    // Position relative to group: group is at spawnHeight, telegraph should be at ground (y=0)
    // So local Y offset = targetY - groupY = 0 - spawnHeight = -spawnHeight
    this.telegraph.position.set(0, -this.spawnHeight + 0.01, 0);
    this.telegraph.visible = true;

    this.group.add(this.telegraph);
  }

  update(deltaTime: number): boolean {
    this.timer += deltaTime;

    switch (this.state) {
      case MeteorState.Telegraph:
        this.updateTelegraph(deltaTime);
        break;
      case MeteorState.Falling:
        this.updateFalling(deltaTime);
        break;
      case MeteorState.Destroyed:
        return false; // Mark for removal
      case MeteorState.Exploded:
        return false; // Mark for removal
    }

    this.updateVisuals();
    return true; // Keep alive
  }

  private updateTelegraph(_deltaTime: number) {
    // Pulse effect - scale and opacity animation
    const pulse = 0.8 + Math.sin(this.timer * 8) * 0.2;
    this.telegraph.scale.set(pulse, pulse, 1);

    // Fade in opacity
    const material = this.telegraph.material as THREE.MeshBasicMaterial;
    material.opacity = 0.3 + (this.timer / this.telegraphDuration) * 0.4;

    // Transition to falling state
    if (this.timer >= this.telegraphDuration) {
      this.state = MeteorState.Falling;
      this.telegraph.visible = false;
      this.mesh.visible = true;

      // Calculate fall velocity
      const direction = this.targetPosition.clone().sub(this.position).normalize();
      this.velocity = direction.multiplyScalar(this.fallSpeed);
    }
  }

  private updateFalling(deltaTime: number) {
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.group.position.copy(this.position);

    // Add rotation for visual effect
    this.mesh.rotation.x += deltaTime * 2;
    this.mesh.rotation.z += deltaTime * 1.5;

    // Check if hit terrain
    const terrainHeight = getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y <= terrainHeight + this.meteorRadius) {
      this.explode();
    }
  }

  private updateVisuals() {
    this.group.position.copy(this.position);
  }

  private explode() {
    this.state = MeteorState.Exploded;
    // TODO: Create explosion particle effect
    // TODO: Play explosion sound
  }

  destroy() {
    this.state = MeteorState.Destroyed;
    // TODO: Create destruction particle effect
    // TODO: Play destruction sound
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getTargetPosition(): THREE.Vector3 {
    return this.targetPosition.clone();
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getBoundingSphere(): THREE.Sphere {
    return new THREE.Sphere(this.position.clone(), this.meteorRadius);
  }

  getExplosionSphere(): THREE.Sphere {
    return new THREE.Sphere(this.targetPosition.clone(), this.explosionRadius);
  }

  getTelegraphPosition(): THREE.Vector3 | null {
    return this.state === MeteorState.Telegraph ? this.targetPosition.clone() : null;
  }

  getState(): MeteorState {
    return this.state;
  }

  isFalling(): boolean {
    return this.state === MeteorState.Falling;
  }

  isExploded(): boolean {
    return this.state === MeteorState.Exploded;
  }

  canBeDestroyed(): boolean {
    return this.state === MeteorState.Falling;
  }

  // Static utility methods
  static generateRandomTarget(stageSize = 5, margin = 0.8): THREE.Vector3 {
    const maxPos = stageSize - margin;
    return new THREE.Vector3(
      (Math.random() - 0.5) * maxPos * 2,
      0,
      (Math.random() - 0.5) * maxPos * 2
    );
  }

  static isValidTarget(newTarget: THREE.Vector3, recentTargets: THREE.Vector3[], minDistance = 2.0): boolean {
    for (const recent of recentTargets) {
      if (newTarget.distanceTo(recent) < minDistance) {
        return false;
      }
    }
    return true;
  }

  // Debug methods for real-time adjustment
  setFallSpeed(speed: number) {
    this.fallSpeed = speed;
  }

  getFallSpeed(): number {
    return this.fallSpeed;
  }
}