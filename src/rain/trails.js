import * as THREE from 'three';

/**
 * Represents a vertical column containing multiple non-colliding rain drops.
 */
export class Trail {
  /**
   * @param {THREE.Vector3} position Starting position
   * @param {THREE.Vector3} direction Direction of movement (will be normalized)
   * @param {number} speed Units to move per second
   */
  constructor(position, direction, speed) {
    this.position = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.reset(position, direction, speed);
  }

  /**
   * Resets the trail to act as a new column with new drops.
   */
  reset(position, direction, speed) {
    this.position.copy(position);
    this.direction.copy(direction).normalize();
    this.speed = speed;
    
    // Generate 1 to 3 non-colliding drops on this column
    this.drops = [];
    const numDrops = Math.floor(Math.random() * 3) + 1;
    let yOffset = 0;
    
    for (let i = 0; i < numDrops; i++) {
      const dropLength = Math.floor(Math.random() * 15 + 15);
      const gap = Math.floor(Math.random() * 20 + 5);
      this.drops.push({
        yOffset: yOffset,
        length: dropLength
      });
      yOffset += dropLength + gap;
    }
    
    this.totalLength = yOffset;
  }

  /**
   * Advances the trail position based on time and speed.
   * @param {number} deltaTime Time elapsed since last frame in milliseconds
   */
  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    this.position.addScaledVector(this.direction, this.speed * deltaSeconds);
  }
}
