import * as THREE from 'three';

// Terrain height calculation - must match createTerrain() algorithm
// Note: PlaneGeometry is rotated -90° around X axis, so plane's Y = -worldZ
export function getTerrainHeight(x: number, z: number): number {
  const planeY = -z; // Convert world Z to plane Y coordinate
  const height =
    Math.sin(x * 0.8) * Math.cos(planeY * 0.8) * 0.3 +
    Math.sin(x * 1.5 + 1) * Math.sin(planeY * 1.2 + 0.5) * 0.2 +
    Math.cos(x * 0.5 - planeY * 0.7) * 0.15;
  return height;
}

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

    // Create undulating terrain
    const terrain = this.createTerrain();
    stageGroup.add(terrain);

    // Stage base (underneath the terrain)
    const baseGeometry = new THREE.BoxGeometry(10, 1, 10);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x3d4452 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.8;
    base.receiveShadow = true;
    stageGroup.add(base);

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

    return stageGroup;
  }

  private static createTerrain(): THREE.Mesh {
    const segments = 32;
    const size = 10;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    // Displace vertices to create undulating terrain
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Simple noise function for organic hills
      const height =
        Math.sin(x * 0.8) * Math.cos(y * 0.8) * 0.3 +
        Math.sin(x * 1.5 + 1) * Math.sin(y * 1.2 + 0.5) * 0.2 +
        Math.cos(x * 0.5 - y * 0.7) * 0.15;

      positions.setZ(i, height);
    }

    geometry.computeVertexNormals();

    // Gradient material - green grass
    const material = new THREE.MeshLambertMaterial({
      color: 0x5a8f5a,
      flatShading: false
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2; // Rotate to horizontal
    terrain.position.y = 0;
    terrain.receiveShadow = true;

    return terrain;
  }
}