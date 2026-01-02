import * as THREE from 'three';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private targetPosition = new THREE.Vector3();
  private currentPosition = new THREE.Vector3();
  private offset = new THREE.Vector3(0, 8, 8);
  private lookAtTarget = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      60, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      100 // Far plane
    );
    
    this.camera.position.copy(this.offset);
    this.camera.lookAt(this.lookAtTarget);
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setTarget(position: THREE.Vector3) {
    this.targetPosition.copy(position).add(this.offset);
    this.lookAtTarget.copy(position);
  }

  update(deltaTime: number) {
    // Smooth camera following
    const lerpFactor = Math.min(deltaTime * 5, 1);
    this.currentPosition.lerp(this.targetPosition, lerpFactor);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.lookAtTarget);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getForwardDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }

  dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}