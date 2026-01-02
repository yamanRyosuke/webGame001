import * as THREE from 'three';

export class Creature {
  private mesh!: THREE.Mesh;
  private position = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private state: 'walking' | 'fleeing' | 'idle' = 'walking';
  private moveTimer = 0;
  private moveInterval = 2.0; // Change direction every 2 seconds
  private isAlive = true;

  // Parameters from spec
  private readonly walkSpeed = 1.2;
  private readonly fleeSpeed = 2.0;
  private readonly fleeDistance = 2.5;
  private readonly radius = 0.35;

  private readonly stageMargin = 0.8; // Stay inside stage bounds

  constructor(spawnPosition: THREE.Vector3) {
    this.position.copy(spawnPosition);
    this.targetPosition.copy(spawnPosition);
    this.createMesh();
    this.generateRandomTarget();
  }

  private createMesh() {
    // Puffy humanoid creature
    const geometry = new THREE.CapsuleGeometry(this.radius, 0.6, 4, 8);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(Math.random(), 0.6, 0.7)
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);

    // Add simple face
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.2, 0.3);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.2, 0.3);
    
    this.mesh.add(leftEye);
    this.mesh.add(rightEye);
  }

  update(deltaTime: number, meteorPositions: THREE.Vector3[] = []) {
    if (!this.isAlive) return;

    this.updateBehavior(deltaTime, meteorPositions);
    this.updateMovement(deltaTime);
    this.updatePosition(deltaTime);
    
    this.mesh.position.copy(this.position);
  }

  private updateBehavior(deltaTime: number, meteorPositions: THREE.Vector3[]) {
    // Check for nearby meteors (dangerous predictions/telegraphs)
    const nearestThreat = this.findNearestThreat(meteorPositions);
    
    if (nearestThreat && nearestThreat.distance < this.fleeDistance) {
      // Switch to fleeing behavior
      this.state = 'fleeing';
      this.calculateFleeTarget(nearestThreat.position);
    } else {
      // Return to normal walking behavior
      if (this.state === 'fleeing') {
        this.state = 'walking';
        this.generateRandomTarget();
      }
      
      this.updateWalkingBehavior(deltaTime);
    }
  }

  private findNearestThreat(meteorPositions: THREE.Vector3[]): { position: THREE.Vector3, distance: number } | null {
    let nearestThreat = null;
    let minDistance = Infinity;

    for (const meteorPos of meteorPositions) {
      const distance = this.position.distanceTo(meteorPos);
      if (distance < minDistance) {
        minDistance = distance;
        nearestThreat = { position: meteorPos, distance };
      }
    }

    return nearestThreat;
  }

  private calculateFleeTarget(threatPosition: THREE.Vector3) {
    // Calculate direction away from threat
    const fleeDirection = this.position.clone().sub(threatPosition).normalize();
    
    // Set target position away from threat
    this.targetPosition = this.position.clone().add(
      fleeDirection.multiplyScalar(3.0)
    );
    
    // Constrain to stage bounds
    this.constrainTargetToStage();
  }

  private updateWalkingBehavior(deltaTime: number) {
    this.moveTimer += deltaTime;
    
    // Check if reached target or time to change direction
    const distanceToTarget = this.position.distanceTo(this.targetPosition);
    if (distanceToTarget < 0.5 || this.moveTimer > this.moveInterval) {
      this.generateRandomTarget();
      this.moveTimer = 0;
      this.moveInterval = 1.5 + Math.random() * 2.0; // Vary interval
    }
  }

  private generateRandomTarget() {
    // Generate random position within stage bounds
    const stageSize = 5 - this.stageMargin;
    this.targetPosition.set(
      (Math.random() - 0.5) * stageSize * 2,
      0,
      (Math.random() - 0.5) * stageSize * 2
    );
  }

  private constrainTargetToStage() {
    const maxPos = 5 - this.stageMargin;
    const minPos = -maxPos;
    
    this.targetPosition.x = Math.max(minPos, Math.min(maxPos, this.targetPosition.x));
    this.targetPosition.z = Math.max(minPos, Math.min(maxPos, this.targetPosition.z));
  }

  private updateMovement(_deltaTime: number) {
    const direction = this.targetPosition.clone().sub(this.position);
    direction.y = 0; // Keep movement horizontal
    
    if (direction.length() > 0.1) {
      direction.normalize();
      
      const speed = this.state === 'fleeing' ? this.fleeSpeed : this.walkSpeed;
      this.velocity.copy(direction.multiplyScalar(speed));
      
      // Face movement direction
      this.mesh.lookAt(this.position.clone().add(this.velocity));
    } else {
      this.velocity.multiplyScalar(0.9); // Gradual stop
    }
  }

  private updatePosition(deltaTime: number) {
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Constrain to stage bounds
    const maxPos = 5 - this.stageMargin;
    const minPos = -maxPos;
    
    this.position.x = Math.max(minPos, Math.min(maxPos, this.position.x));
    this.position.z = Math.max(minPos, Math.min(maxPos, this.position.z));
    this.position.y = this.radius / 2; // Keep on ground
  }

  takeDamage() {
    this.isAlive = false;
    this.mesh.visible = false;
    // TODO: Add death particle effect
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getBoundingSphere(): THREE.Sphere {
    return new THREE.Sphere(this.position.clone(), this.radius);
  }

  isCreatureAlive(): boolean {
    return this.isAlive;
  }

  getState(): 'walking' | 'fleeing' | 'idle' {
    return this.state;
  }

  // Static method to create multiple creatures at spawn points
  static createSpawnPositions(): THREE.Vector3[] {
    return [
      new THREE.Vector3(-2, 0.35, -2),
      new THREE.Vector3(2, 0.35, 2),
      new THREE.Vector3(-1, 0.35, 3)
    ];
  }
}