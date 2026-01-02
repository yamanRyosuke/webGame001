import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Creature } from '../entities/Creature';
import { Meteor, MeteorState } from '../entities/Meteor';

export interface CollisionEvent {
  type: 'punch_hit_meteor' | 'meteor_explosion' | 'meteor_hit_player' | 'meteor_hit_creature';
  data: any;
}

export class CollisionSystem {
  private events: CollisionEvent[] = [];

  update(player: Player, creatures: Creature[], meteors: Meteor[]) {
    this.events = [];

    // Check punch vs meteors
    this.checkPunchVsMeteors(player, meteors);
    
    // Check meteor explosions vs creatures and player
    this.checkMeteorExplosions(player, creatures, meteors);
    
    // Check direct meteor hits (falling meteors hitting player/creatures)
    this.checkDirectMeteorHits(player, creatures, meteors);
  }

  private checkPunchVsMeteors(player: Player, meteors: Meteor[]) {
    const punchSphere = player.getPunchSphere();
    if (!punchSphere) return;

    for (const meteor of meteors) {
      if (!meteor.canBeDestroyed()) continue;

      const meteorSphere = meteor.getBoundingSphere();
      if (this.sphereIntersectsSphere(punchSphere, meteorSphere)) {
        meteor.destroy();
        
        this.events.push({
          type: 'punch_hit_meteor',
          data: {
            meteor,
            player,
            position: meteor.getPosition()
          }
        });
      }
    }
  }

  private checkMeteorExplosions(player: Player, creatures: Creature[], meteors: Meteor[]) {
    for (const meteor of meteors) {
      if (!meteor.isExploded()) continue;

      const explosionSphere = meteor.getExplosionSphere();
      
      // Check explosion vs creatures
      for (const creature of creatures) {
        if (!creature.isCreatureAlive()) continue;
        
        const creatureSphere = creature.getBoundingSphere();
        if (this.sphereIntersectsSphere(explosionSphere, creatureSphere)) {
          creature.takeDamage();
          
          this.events.push({
            type: 'meteor_hit_creature',
            data: {
              meteor,
              creature,
              position: creature.getPosition()
            }
          });
        }
      }
      
      // Check explosion vs player
      const playerSphere = player.getBoundingSphere();
      if (this.sphereIntersectsSphere(explosionSphere, playerSphere)) {
        const knockbackDirection = player.getPosition()
          .sub(meteor.getTargetPosition())
          .normalize();
        
        player.applyKnockback(knockbackDirection, 8);
        
        this.events.push({
          type: 'meteor_hit_player',
          data: {
            meteor,
            player,
            position: player.getPosition(),
            knockbackDirection
          }
        });
      }

      // Mark explosion as handled
      this.events.push({
        type: 'meteor_explosion',
        data: {
          meteor,
          position: meteor.getTargetPosition(),
          radius: explosionSphere.radius
        }
      });
    }
  }

  private checkDirectMeteorHits(player: Player, creatures: Creature[], meteors: Meteor[]) {
    for (const meteor of meteors) {
      if (meteor.getState() !== MeteorState.Falling) continue;

      const meteorSphere = meteor.getBoundingSphere();
      
      // Check direct hit vs creatures
      for (const creature of creatures) {
        if (!creature.isCreatureAlive()) continue;
        
        const creatureSphere = creature.getBoundingSphere();
        if (this.sphereIntersectsSphere(meteorSphere, creatureSphere)) {
          creature.takeDamage();
          
          this.events.push({
            type: 'meteor_hit_creature',
            data: {
              meteor,
              creature,
              position: creature.getPosition(),
              directHit: true
            }
          });
        }
      }
      
      // Check direct hit vs player
      const playerSphere = player.getBoundingSphere();
      if (this.sphereIntersectsSphere(meteorSphere, playerSphere)) {
        const knockbackDirection = player.getPosition()
          .sub(meteor.getPosition())
          .normalize();
        
        player.applyKnockback(knockbackDirection, 10); // Stronger knockback for direct hit
        
        this.events.push({
          type: 'meteor_hit_player',
          data: {
            meteor,
            player,
            position: player.getPosition(),
            knockbackDirection,
            directHit: true
          }
        });
      }
    }
  }

  private sphereIntersectsSphere(sphere1: THREE.Sphere, sphere2: THREE.Sphere): boolean {
    const distance = sphere1.center.distanceTo(sphere2.center);
    return distance <= (sphere1.radius + sphere2.radius);
  }

  getEvents(): CollisionEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }

  // Utility methods for other systems
  static checkSphereIntersection(sphere1: THREE.Sphere, sphere2: THREE.Sphere): boolean {
    const distance = sphere1.center.distanceTo(sphere2.center);
    return distance <= (sphere1.radius + sphere2.radius);
  }

  static getClosestPointOnSphere(sphere: THREE.Sphere, point: THREE.Vector3): THREE.Vector3 {
    const direction = point.clone().sub(sphere.center).normalize();
    return sphere.center.clone().add(direction.multiplyScalar(sphere.radius));
  }

  static isPointInsideSphere(sphere: THREE.Sphere, point: THREE.Vector3): boolean {
    return sphere.center.distanceTo(point) <= sphere.radius;
  }
}