import * as THREE from 'three';

export class SceneFactory {
  static createGameScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Create stage (diorama cube)
    const stage = this.createStage();
    scene.add(stage);

    return scene;
  }

  private static createStage(): THREE.Group {
    const stageGroup = new THREE.Group();
    
    // Stage platform (10x10 units top surface)
    const platformGeometry = new THREE.BoxGeometry(10, 1, 10);
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.5;
    platform.receiveShadow = true;
    stageGroup.add(platform);

    // Stage walls
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x2d3748 });
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(10, 6, 0.5);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 2.5, -5.25);
    backWall.receiveShadow = true;
    stageGroup.add(backWall);
    
    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(0.5, 6, 10);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-5.25, 2.5, 0);
    leftWall.receiveShadow = true;
    stageGroup.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    rightWall.position.set(5.25, 2.5, 0);
    rightWall.receiveShadow = true;
    stageGroup.add(rightWall);

    // Add some basic terrain variation (small hills)
    for (let i = 0; i < 3; i++) {
      const hillGeometry = new THREE.CylinderGeometry(0.8, 1.2, 0.3, 8);
      const hillMaterial = new THREE.MeshLambertMaterial({ color: 0x68d391 });
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      hill.position.set(
        (Math.random() - 0.5) * 6, 
        0.15, 
        (Math.random() - 0.5) * 6
      );
      hill.receiveShadow = true;
      stageGroup.add(hill);
    }

    return stageGroup;
  }
}