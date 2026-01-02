import * as THREE from 'three';
import { StateMachine } from './core/StateMachine';
import { GameLoop } from './core/GameLoop';
import { GameState } from './core/GameState';
import { Renderer } from './three/Renderer';
import { CameraController } from './three/CameraController';
import { SceneFactory } from './three/SceneFactory';
import { InputManager } from './input/InputManager';
import { Player } from './entities/Player';
import { Creature } from './entities/Creature';
import { MeteorSpawner } from './systems/MeteorSpawner';
import { CollisionSystem } from './systems/CollisionSystem';
import { EffectsSystem } from './systems/EffectsSystem';
import { HUD } from '../ui/HUD';

export class Game {
  private container: HTMLElement;
  private renderer!: Renderer;
  private cameraController!: CameraController;
  private scene!: THREE.Scene;
  private stateMachine!: StateMachine;
  private gameLoop!: GameLoop;
  private inputManager!: InputManager;

  // Game entities and systems
  private player!: Player;
  private creatures: Creature[] = [];
  private meteorSpawner!: MeteorSpawner;
  private collisionSystem!: CollisionSystem;
  private effectsSystem!: EffectsSystem;
  private hud!: HUD;

  // Game state
  private gameTimer = 60; // 60 seconds game time
  private aliveCreatures = 3;
  private isGameRunning = false;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    this.initialize();
  }

  private initialize() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupInput();
    this.setupStateMachine();
    this.setupGameLoop();
    this.setupEntitiesAndSystems();
  }

  private setupRenderer() {
    this.renderer = new Renderer(this.container);
  }

  private setupScene() {
    this.scene = SceneFactory.createGameScene();
    
    // DEBUG: Add a test cube directly to scene to verify rendering works
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.position.set(-3, 1, 0); // Position it away from center
    this.scene.add(testCube);
    console.log('DEBUG: Added red test cube at (-3, 1, 0) to verify rendering');
  }

  private setupCamera() {
    this.cameraController = new CameraController();
  }

  private setupInput() {
    this.inputManager = InputManager.instance;
  }

  private setupStateMachine() {
    this.stateMachine = new StateMachine();
    
    // Boot state
    this.stateMachine.addStateHandler(GameState.Boot, {
      onEnter: () => {
        console.log('Booting game...');
        // Simulate asset loading
        setTimeout(() => {
          this.stateMachine.transitionTo(GameState.Title);
        }, 100);
      }
    });

    // Title state
    this.stateMachine.addStateHandler(GameState.Title, {
      onEnter: () => {
        console.log('Title screen');
        this.showTitleUI();
      },
      update: (_deltaTime: number) => {
        const input = this.inputManager.getInputState();
        if (input.jumpPressed || input.punchPressed) {
          console.log('Title state - input detected, transitioning to Play state');
          this.stateMachine.transitionTo(GameState.Play);
        }
      }
    });

    // Play state
    this.stateMachine.addStateHandler(GameState.Play, {
      onEnter: () => {
        console.log('Starting game');
        this.startGame();
        this.hud.show();
      },
      update: (deltaTime: number) => {
        this.updateGame(deltaTime);
      },
      onExit: () => {
        this.isGameRunning = false;
        this.hud.hide();
      }
    });

    // Result state
    this.stateMachine.addStateHandler(GameState.Result, {
      onEnter: () => {
        console.log('Game over');
        this.showResultUI();
      },
      update: (_deltaTime: number) => {
        const input = this.inputManager.getInputState();
        if (input.jumpPressed) {
          this.stateMachine.transitionTo(GameState.Play);
        } else if (input.punchPressed) {
          this.stateMachine.transitionTo(GameState.Title);
        }
      }
    });
  }

  private setupGameLoop() {
    this.gameLoop = new GameLoop();
    this.gameLoop.setUpdateCallback((deltaTime: number) => {
      this.update(deltaTime);
    });
    this.gameLoop.setRenderCallback(() => {
      this.render();
    });
  }

  private setupEntitiesAndSystems() {
    this.player = new Player();
    this.meteorSpawner = new MeteorSpawner();
    this.collisionSystem = new CollisionSystem();
    this.effectsSystem = new EffectsSystem(this.scene);
    this.hud = new HUD();
    
    // Connect HUD sliders to game entities
    this.hud.setSpeedChangeCallback((speed: number) => {
      this.player.setMoveSpeed(speed);
    });

    this.hud.setMeteorSpeedChangeCallback((speed: number) => {
      this.meteorSpawner.setMeteorSpeed(speed);
    });

    this.hud.setMeteorFreqChangeCallback((freq: number) => {
      this.meteorSpawner.setFrequencyMultiplier(freq);
    });
    
    this.scene.add(this.player.getGroup());
    
    // Create creatures
    const spawnPositions = Creature.createSpawnPositions();
    this.creatures = spawnPositions.map(pos => new Creature(pos));
    this.creatures.forEach(creature => this.scene.add(creature.getMesh()));
  }

  private update(deltaTime: number) {
    this.inputManager.update();
    this.stateMachine.update(deltaTime);
    
    if (this.isGameRunning) {
      this.updateGameEntities(deltaTime);
      this.updateCamera(deltaTime);
    }
  }

  private updateGame(deltaTime: number) {
    // Update game timer
    this.gameTimer -= deltaTime;
    
    // Update entities
    this.updateGameEntities(deltaTime);
    
    // Update HUD
    this.hud.updateTime(Math.max(0, this.gameTimer));
    this.hud.updateCreatures(this.aliveCreatures);
    
    // Check win/lose conditions
    this.checkGameConditions();
  }

  private updateGameEntities(deltaTime: number) {
    const inputState = this.inputManager.getInputState();
    
    // Update player with camera direction for proper punch alignment
    const cameraDirection = this.cameraController.getForwardDirection();
    this.player.update(deltaTime, inputState, cameraDirection);
    
    // Update creatures
    const telegraphPositions = this.meteorSpawner.getTelegraphPositions();
    this.creatures.forEach(creature => creature.update(deltaTime, telegraphPositions));
    
    // Update meteors
    this.meteorSpawner.update(deltaTime);
    this.meteorSpawner.addMeteorsToScene(this.scene);
    
    // DEBUG: Every 3 seconds, try adding a simple test object to see if it renders
    if (Math.floor(this.meteorSpawner.getGameTime()) % 3 === 0 && Math.floor(this.meteorSpawner.getGameTime() * 10) % 10 === 0) {
      const debugGeo = new THREE.SphereGeometry(0.5, 8, 6);
      const debugMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
      const debugSphere = new THREE.Mesh(debugGeo, debugMat);
      debugSphere.position.set(Math.random() * 4 - 2, 1, Math.random() * 4 - 2);
      this.scene.add(debugSphere);
      console.log('DEBUG: Added blue test sphere at', debugSphere.position, 'to scene');
      
      // Remove it after 0.5 seconds
      setTimeout(() => {
        this.scene.remove(debugSphere);
      }, 500);
    }
    
    // Update effects
    this.effectsSystem.update(deltaTime);
    
    // Update collisions
    this.collisionSystem.update(this.player, this.creatures, this.meteorSpawner.getMeteors());
    
    // Handle collision events
    const events = this.collisionSystem.getEvents();
    events.forEach(event => this.handleCollisionEvent(event));
    this.collisionSystem.clearEvents();
  }

  private updateCamera(deltaTime: number) {
    this.cameraController.setTarget(this.player.getPosition());
    this.cameraController.update(deltaTime);
  }

  private handleCollisionEvent(event: any) {
    switch (event.type) {
      case 'meteor_hit_creature':
        this.aliveCreatures = this.creatures.filter(c => c.isCreatureAlive()).length;
        console.log(`Creature destroyed! Remaining: ${this.aliveCreatures}`);
        break;
      case 'punch_hit_meteor':
        console.log('Meteor destroyed by punch!');
        // Create particle effect at meteor position
        this.effectsSystem.createMeteorDestructionEffect(event.data.position);
        break;
      case 'meteor_hit_player':
        console.log('Player hit by meteor!');
        // TODO: Add screen shake, effects
        break;
      case 'meteor_explosion':
        // Create explosion effect
        this.effectsSystem.createMeteorExplosionEffect(event.data.position, event.data.radius);
        break;
    }
  }

  private checkGameConditions() {
    // Lose condition: all creatures dead
    if (this.aliveCreatures <= 0) {
      this.stateMachine.transitionTo(GameState.Result);
      return;
    }
    
    // Win condition: timer reaches 0
    if (this.gameTimer <= 0) {
      this.stateMachine.transitionTo(GameState.Result);
      return;
    }
  }

  private startGame() {
    this.isGameRunning = true;
    this.gameTimer = 60;
    this.aliveCreatures = 3;
    
    // Reset entities
    this.meteorSpawner.reset();
    
    // Reset creatures
    const spawnPositions = Creature.createSpawnPositions();
    this.creatures.forEach(creature => {
      const group = creature.getMesh();
      if (group.parent) {
        group.parent.remove(group);
      }
    });
    
    this.creatures = spawnPositions.map(pos => new Creature(pos));
    this.creatures.forEach(creature => this.scene.add(creature.getMesh()));
    
    this.hideTitleUI();
  }

  private render() {
    this.renderer.render(this.scene, this.cameraController.getCamera());
  }

  private showTitleUI() {
    // Simple title display
    const titleDiv = document.createElement('div');
    titleDiv.id = 'title-ui';
    titleDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      text-align: center;
      font-size: 24px;
      z-index: 100;
    `;
    titleDiv.innerHTML = `
      <h1>Meteor Punch Garden</h1>
      <p>Press SPACE or J to start</p>
      <p>WASD to move, SPACE to jump, J to punch</p>
    `;
    document.body.appendChild(titleDiv);
  }

  private hideTitleUI() {
    const titleUI = document.getElementById('title-ui');
    if (titleUI) {
      document.body.removeChild(titleUI);
    }
  }

  private showResultUI() {
    const won = this.aliveCreatures > 0;
    const resultDiv = document.createElement('div');
    resultDiv.id = 'result-ui';
    resultDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      text-align: center;
      font-size: 24px;
      z-index: 100;
    `;
    resultDiv.innerHTML = `
      <h1>${won ? 'SURVIVED!' : 'EXTINCT...'}</h1>
      <p>Creatures remaining: ${this.aliveCreatures}</p>
      <p>Press SPACE to retry, J for title</p>
    `;
    document.body.appendChild(resultDiv);
    
    setTimeout(() => {
      if (resultDiv.parentNode) {
        document.body.removeChild(resultDiv);
      }
    }, 5000);
  }

  start() {
    console.log('Game starting...');
    // Manually trigger Boot state
    const bootHandler = this.stateMachine['stateHandlers'].get(GameState.Boot);
    if (bootHandler?.onEnter) {
      bootHandler.onEnter();
    }
    this.gameLoop.start();
  }

  dispose() {
    this.gameLoop.stop();
    this.renderer.dispose();
    this.cameraController.dispose();
    this.inputManager.dispose();
    this.effectsSystem.dispose();
    this.hud.dispose();
  }
}