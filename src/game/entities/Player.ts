import * as THREE from 'three';
import { InputState } from '../input/InputManager';
import { getTerrainHeight } from '../three/SceneFactory';

export class Player {
  private mesh!: THREE.Mesh;
  private group!: THREE.Group;
  private position = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private isGrounded = false;
  private punchActive = false;
  private punchTimer = 0;
  private knockbackTimer = 0;
  private isKnockedBack = false;

  // Parameters from spec - adjustable for gameplay feel
  private moveSpeed = 4.0; // Reduced from 6.0 for better control
  private readonly jumpSpeed = 8.5;
  private readonly gravity = -18;
  private readonly airControlFactor = 0.6;
  private readonly punchDuration = 0.25;
  private readonly punchRadius = 0.6;
  private readonly punchOffset = 0.7;
  private readonly knockbackDuration = 0.4;
  
  private direction = new THREE.Vector3();
  private punchSphere = new THREE.Sphere();

  constructor() {
    this.createMesh();
    this.position.set(0, 1, 0);
    this.group.position.copy(this.position);
  }

  private createMesh() {
    this.group = new THREE.Group();
    
    // Player body (astronaut-like)
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.castShadow = true;
    
    // Helmet
    const helmetGeometry = new THREE.SphereGeometry(0.35, 16, 12);
    const helmetMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4299e1,
      transparent: true,
      opacity: 0.8
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 0.4;
    
    this.group.add(this.mesh);
    this.group.add(helmet);
    
    // Visual indicator for punch (will be shown during punch)
    const punchIndicatorGeometry = new THREE.SphereGeometry(this.punchRadius, 8, 6);
    const punchIndicatorMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    const punchIndicator = new THREE.Mesh(punchIndicatorGeometry, punchIndicatorMaterial);
    punchIndicator.visible = false;
    this.group.add(punchIndicator);
  }

  update(deltaTime: number, inputState: InputState, cameraDirection?: THREE.Vector3) {
    if (this.isKnockedBack) {
      this.updateKnockback(deltaTime);
      return;
    }

    this.updateMovement(deltaTime, inputState, cameraDirection);
    this.updateJump(inputState);
    this.updatePunch(deltaTime, inputState, cameraDirection);
    this.updatePhysics(deltaTime);
    this.updateGroundCheck();
    
    this.group.position.copy(this.position);
  }

  private updateMovement(deltaTime: number, inputState: InputState, cameraDirection?: THREE.Vector3) {
    const movementVector = new THREE.Vector3(
      inputState.movement.x,
      0,
      inputState.movement.z
    );

    if (movementVector.length() > 0) {
      // Transform movement relative to camera direction
      if (cameraDirection) {
        const cameraForward = cameraDirection.clone().normalize();
        cameraForward.y = 0; // Keep on horizontal plane
        cameraForward.normalize();
        
        const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
        
        const worldMovement = new THREE.Vector3();
        worldMovement.addScaledVector(cameraRight, movementVector.x);
        worldMovement.addScaledVector(cameraForward, -movementVector.z); // Negative because forward is -Z
        
        movementVector.copy(worldMovement);
      }
      
      movementVector.normalize();
      
      // Apply movement speed
      const currentMoveSpeed = this.isGrounded ? this.moveSpeed : this.moveSpeed * this.airControlFactor;
      movementVector.multiplyScalar(currentMoveSpeed * deltaTime);
      
      // Update velocity
      this.velocity.x = movementVector.x / deltaTime;
      this.velocity.z = movementVector.z / deltaTime;
      
      // Update direction for punch
      this.direction.copy(movementVector).normalize();
    } else {
      // Apply friction when grounded
      if (this.isGrounded) {
        this.velocity.x *= Math.pow(0.1, deltaTime);
        this.velocity.z *= Math.pow(0.1, deltaTime);
      }
    }

    // Constrain to stage bounds (10x10 units, leaving margin)
    const margin = 0.5;
    this.position.x = Math.max(-5 + margin, Math.min(5 - margin, this.position.x + this.velocity.x * deltaTime));
    this.position.z = Math.max(-5 + margin, Math.min(5 - margin, this.position.z + this.velocity.z * deltaTime));
  }

  private updateJump(inputState: InputState) {
    if (inputState.jumpPressed && this.isGrounded) {
      this.velocity.y = this.jumpSpeed;
      this.isGrounded = false;
    }
  }

  private updatePunch(deltaTime: number, inputState: InputState, cameraDirection?: THREE.Vector3) {
    const punchIndicator = this.group.children[2] as THREE.Mesh;
    
    // Activate punch automatically when airborne
    if (!this.isGrounded && !this.punchActive) {
      this.punchActive = true;
      this.punchTimer = this.punchDuration;
      
      // Show punch indicator
      punchIndicator.visible = true;
      
      // Always use camera direction for punch
      let punchDirection = new THREE.Vector3(0, 0, -1); // Default forward (negative Z)
      
      if (cameraDirection) {
        punchDirection.copy(cameraDirection).normalize();
        punchDirection.y = 0; // Keep on horizontal plane
        punchDirection.normalize();
      }
      
      // Position punch sphere in world coordinates
      const punchPosition = this.position.clone().add(
        punchDirection.clone().multiplyScalar(this.punchOffset)
      );
      this.punchSphere.set(punchPosition, this.punchRadius);
      
      // Update indicator position
      const worldPunchPosition = punchPosition.clone().sub(this.position);
      punchIndicator.position.copy(worldPunchPosition);
    }

    // Update punch timer and deactivate when grounded or time expires
    if (this.punchActive) {
      this.punchTimer -= deltaTime;
      if (this.punchTimer <= 0 || this.isGrounded) {
        this.punchActive = false;
        punchIndicator.visible = false;
      } else {
        // Update punch position continuously while airborne
        let punchDirection = new THREE.Vector3(0, 0, -1);
        if (cameraDirection) {
          punchDirection.copy(cameraDirection).normalize();
          punchDirection.y = 0;
          punchDirection.normalize();
        }
        
        const punchPosition = this.position.clone().add(
          punchDirection.clone().multiplyScalar(this.punchOffset)
        );
        this.punchSphere.set(punchPosition, this.punchRadius);
        
        const worldPunchPosition = punchPosition.clone().sub(this.position);
        punchIndicator.position.copy(worldPunchPosition);
      }
    }
  }

  private updatePhysics(deltaTime: number) {
    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;
    
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Check for falling off stage
    if (this.position.y < -10) {
      this.respawn();
    }
  }

  private updateGroundCheck() {
    // Get terrain height at current position
    const terrainHeight = getTerrainHeight(this.position.x, this.position.z);
    const groundLevel = terrainHeight + 0.6; // Player height offset

    // If already grounded, always follow terrain
    if (this.isGrounded) {
      this.position.y = groundLevel;
      this.velocity.y = 0;
      return;
    }

    // Check if landing on ground (falling and reached ground level)
    if (this.position.y <= groundLevel && this.velocity.y <= 0) {
      this.position.y = groundLevel;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  private updateKnockback(deltaTime: number) {
    this.knockbackTimer -= deltaTime;
    if (this.knockbackTimer <= 0) {
      this.isKnockedBack = false;
    }
    
    // Apply knockback physics
    this.updatePhysics(deltaTime);
    this.updateGroundCheck();
  }

  private respawn() {
    this.position.set(0, 1, 0);
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
    // TODO: Apply time penalty (-3 seconds)
  }

  applyKnockback(direction: THREE.Vector3, force: number = 5) {
    this.velocity.copy(direction.normalize().multiplyScalar(force));
    this.velocity.y = Math.max(this.velocity.y, 3); // Add upward component
    this.isKnockedBack = true;
    this.knockbackTimer = this.knockbackDuration;
    this.isGrounded = false;
  }

  getPunchSphere(): THREE.Sphere | null {
    return this.punchActive ? this.punchSphere : null;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getBoundingSphere(): THREE.Sphere {
    return new THREE.Sphere(this.position.clone(), 0.5);
  }

  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  isPunchActive(): boolean {
    return this.punchActive;
  }

  setMoveSpeed(speed: number) {
    this.moveSpeed = speed;
  }

  getMoveSpeed(): number {
    return this.moveSpeed;
  }
}