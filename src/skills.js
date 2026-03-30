export const SKILLS = [
  {
    id: 'SPEED_DEMON',
    name: 'Speed Demon',
    desc: '+12% top speed during race',
    apply(car) { car.maxSpeed *= 1.12; }
  },
  {
    id: 'GRIP_MASTER',
    name: 'Grip Master',
    desc: '+18% turning response',
    apply(car) { car.turnSpeed *= 1.18; }
  },
  {
    id: 'TANK',
    name: 'Tank',
    desc: 'Start race with a Shield',
    apply(car) {
      car.shielded = true;
      if (car.shieldMesh) car.shieldMesh.visible = true;
    }
  },
  {
    id: 'SCAVENGER',
    name: 'Scavenger',
    desc: 'Collect 2 abilities per box',
    apply(car) { car.doublePickup = true; }
  },
  {
    id: 'PREDATOR',
    name: 'Predator',
    desc: 'Killing gives extra ability slot',
    apply(car) { car.predator = true; }
  },
  {
    id: 'RESILIENT',
    name: 'Resilient',
    desc: 'Respawn 0.5s faster',
    apply(car) { car.respawnDelay = 1500; }
  },
];

// Skill points awarded by finish position (up to 4 places)
export const SP_REWARDS = [8, 5, 3, 1];
