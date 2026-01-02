import * as THREE from 'three';

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
    
    console.log('Meteor constructor - target:', this.targetPosition, 'meteor pos:', this.position);
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
    // Debug: Create a very obvious 3D object at origin for testing
    const telegraphGeometry = new THREE.BoxGeometry(2, 3, 2);
    const telegraphMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, // Bright green
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide // Render both sides
    });
    
    this.telegraph = new THREE.Mesh(telegraphGeometry, telegraphMaterial);
    // Force position at origin for testing
    this.telegraph.position.set(0, 2, 0); // Center of stage, 2 units high
    this.telegraph.scale.set(1, 1, 1); // Ensure proper scaling
    this.telegraph.visible = true; // Explicitly set visible
    
    this.group.add(this.telegraph);
    
    console.log('DEBUG Telegraph (GREEN BOX) forced at origin (0,2,0)');
    console.log('Original target was:', this.targetPosition);
    console.log('Telegraph material:', telegraphMaterial);
    console.log('Telegraph geometry bounding box:', telegraphGeometry.boundingBox);
    telegraphGeometry.computeBoundingBox();
    console.log('Computed bounding box:', telegraphGeometry.boundingBox);
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
    // Keep telegraph always visible for debugging
    this.telegraph.visible = true;
    
    // Make it move up and down to be more noticeable
    this.telegraph.position.y = 1 + Math.sin(this.timer * 5) * 0.5;
    
    // Debug scene status every few frames
    if (Math.floor(this.timer * 10) % 20 === 0) {
      this.debugSceneStatus();
    }

    // Transition to falling state
    if (this.timer >= this.telegraphDuration) {
      this.state = MeteorState.Falling;
      this.telegraph.visible = false;
      this.mesh.visible = true;
      
      console.log('Telegraph -> Falling transition');
      
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

    // Check if hit ground
    if (this.position.y <= 0) {
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

  // Debug method to check scene status
  debugSceneStatus() {
    console.log('=== METEOR DEBUG STATUS ===');
    console.log('- Group parent:', this.group.parent?.type || 'No parent');
    console.log('- Group children count:', this.group.children.length);
    console.log('- Telegraph visible:', this.telegraph.visible);
    console.log('- Telegraph position:', this.telegraph.position);
    console.log('- Telegraph world position:', this.telegraph.getWorldPosition(new THREE.Vector3()));
    console.log('- Group position:', this.group.position);
    console.log('- Group world position:', this.group.getWorldPosition(new THREE.Vector3()));
    console.log('- Telegraph material type:', this.telegraph.material.constructor.name);
    console.log('- Telegraph geometry type:', this.telegraph.geometry.constructor.name);
    console.log('- Telegraph material color:', this.telegraph.material.color);
    console.log('- Telegraph scale:', this.telegraph.scale);
    console.log('- Group scale:', this.group.scale);
    
    // Check if object is in camera frustum
    if (this.group.parent && this.group.parent.type === 'Scene') {
      console.log('- Object is properly in scene');
    } else {
      console.log('- WARNING: Object not properly in scene');
    }
    
    console.log('=== END DEBUG STATUS ===');
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