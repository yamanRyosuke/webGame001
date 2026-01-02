import * as THREE from 'three';
import { Meteor } from '../entities/Meteor';

interface DifficultyPhase {
  startTime: number;
  endTime: number;
  spawnInterval: number;
}

export class MeteorSpawner {
  private meteors: Meteor[] = [];
  private spawnTimer = 0;
  private gameTime = 0;
  private recentTargets: THREE.Vector3[] = [];
  private readonly maxRecentTargets = 2;

  // Difficulty phases from spec - now adjustable
  private difficultyPhases: DifficultyPhase[] = [
    { startTime: 0, endTime: 20, spawnInterval: 1.2 },
    { startTime: 20, endTime: 40, spawnInterval: 0.9 },
    { startTime: 40, endTime: 60, spawnInterval: 0.7 }
  ];

  // Debug parameters
  private debugFrequencyMultiplier = 1.0;
  private debugMeteorSpeed = 12;

  // Stage parameters
  private readonly stageSize = 5;
  private readonly stageMargin = 0.8;
  private readonly minTargetDistance = 2.0;

  // MVP parameters
  private readonly maxSimultaneousMeteors = 8;
  private readonly beginnerGracePeriod = 10; // First 10 seconds easier
  // private readonly beginnerExplosionRadius = 1.2; // TODO: Implement beginner mode

  update(deltaTime: number) {
    this.gameTime += deltaTime;
    this.spawnTimer += deltaTime;

    const currentPhase = this.getCurrentDifficultyPhase();
    if (currentPhase) {
      const requiredInterval = currentPhase.spawnInterval * this.debugFrequencyMultiplier;
      console.log(`Spawn check: timer=${this.spawnTimer.toFixed(2)} >= required=${requiredInterval.toFixed(2)} ? ${this.spawnTimer >= requiredInterval}`);
      
      if (this.spawnTimer >= requiredInterval) {
        this.trySpawnMeteor();
        this.spawnTimer = 0;
      }
    } else {
      console.log('No current phase available');
    }

    this.updateMeteors(deltaTime);
    this.cleanupMeteors();
  }

  private getCurrentDifficultyPhase(): DifficultyPhase | null {
    for (const phase of this.difficultyPhases) {
      if (this.gameTime >= phase.startTime && this.gameTime < phase.endTime) {
        return phase;
      }
    }
    return null; // Game time beyond all phases
  }

  private trySpawnMeteor() {
    if (this.meteors.length >= this.maxSimultaneousMeteors) {
      console.log('Max meteors reached:', this.meteors.length, '>=', this.maxSimultaneousMeteors);
      return; // Too many meteors already
    }

    const target = this.generateValidTarget();
    if (target) {
      console.log('Creating meteor at:', target);
      const meteor = new Meteor(target);
      
      // Apply current debug speed to new meteors
      meteor.setFallSpeed(this.debugMeteorSpeed);
      
      // Apply beginner grace period
      if (this.gameTime < this.beginnerGracePeriod) {
        // TODO: Apply reduced explosion radius
        // This would require modifying the Meteor class to accept explosion radius
      }
      
      this.meteors.push(meteor);
      this.addRecentTarget(target);
      console.log('Meteor created, total meteors:', this.meteors.length);
    } else {
      console.log('Could not generate valid target');
    }
  }

  private generateValidTarget(): THREE.Vector3 | null {
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const target = Meteor.generateRandomTarget(this.stageSize, this.stageMargin);
      
      if (Meteor.isValidTarget(target, this.recentTargets, this.minTargetDistance)) {
        return target;
      }
    }
    
    // If we can't find a valid target after max attempts, return a random one
    // This ensures meteors keep spawning even in crowded situations
    return Meteor.generateRandomTarget(this.stageSize, this.stageMargin);
  }

  private addRecentTarget(target: THREE.Vector3) {
    this.recentTargets.push(target.clone());
    
    if (this.recentTargets.length > this.maxRecentTargets) {
      this.recentTargets.shift(); // Remove oldest target
    }
  }

  private updateMeteors(deltaTime: number) {
    this.meteors.forEach(meteor => meteor.update(deltaTime));
  }

  private cleanupMeteors() {
    this.meteors = this.meteors.filter(meteor => {
      const shouldKeep = meteor.update(0); // Just check state, don't update again
      if (!shouldKeep) {
        // Remove from scene when meteor is destroyed/exploded
        const group = meteor.getGroup();
        if (group.parent) {
          group.parent.remove(group);
        }
      }
      return shouldKeep;
    });
  }

  getMeteors(): Meteor[] {
    return this.meteors;
  }

  getTelegraphPositions(): THREE.Vector3[] {
    return this.meteors
      .map(meteor => meteor.getTelegraphPosition())
      .filter(pos => pos !== null) as THREE.Vector3[];
  }

  addMeteorsToScene(scene: THREE.Scene) {
    this.meteors.forEach((meteor, index) => {
      const group = meteor.getGroup();
      console.log(`Meteor ${index}: group.parent =`, group.parent, 'children count:', group.children.length);
      if (!group.parent) {
        scene.add(group);
        console.log(`Added meteor ${index} to scene!`);
      } else {
        console.log(`Meteor ${index} already in scene`);
      }
    });
    console.log('Total meteors in spawner:', this.meteors.length);
  }

  reset() {
    // Clean up existing meteors
    this.meteors.forEach(meteor => {
      const group = meteor.getGroup();
      if (group.parent) {
        group.parent.remove(group);
      }
    });

    this.meteors = [];
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.recentTargets = [];
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getCurrentDifficulty(): string {
    const phase = this.getCurrentDifficultyPhase();
    if (!phase) return 'beyond-phases';
    
    if (this.gameTime < 20) return 'easy';
    if (this.gameTime < 40) return 'normal';
    return 'hard';
  }

  // Debug/statistics methods
  getSpawnStats() {
    return {
      totalMeteors: this.meteors.length,
      gameTime: this.gameTime,
      currentDifficulty: this.getCurrentDifficulty(),
      nextSpawnIn: (this.getCurrentDifficultyPhase()?.spawnInterval || 0) - this.spawnTimer,
      recentTargets: this.recentTargets.length
    };
  }

  // Debug methods for real-time adjustment
  setFrequencyMultiplier(multiplier: number) {
    this.debugFrequencyMultiplier = multiplier;
  }

  getFrequencyMultiplier(): number {
    return this.debugFrequencyMultiplier;
  }

  setMeteorSpeed(speed: number) {
    this.debugMeteorSpeed = speed;
    // Apply speed to all existing meteors
    this.meteors.forEach(meteor => meteor.setFallSpeed(speed));
  }
}