export class Player {
  constructor(id) {
    this.id = id; // 1-based
    this.skillPoints = parseInt(localStorage.getItem(`str_p${id}_sp`) || '0');
    this.selectedSkill = null; // Skill object chosen before race
    // 5 ability slots (filled during race)
    this.abilities = [null, null, null, null, null];
    // Last checkpoint position for rewind ability
    this.lastCheckpointPos = null;
    this.lastCheckpointRot = 0;
    // Lap tracking (set each race)
    this.lap = 1;
    this.checkpointIndex = 0;
    this.finishPosition = 0;
    this.finished = false;
    this.raceTime = 0;
  }

  save() {
    localStorage.setItem(`str_p${this.id}_sp`, this.skillPoints);
  }

  addSkillPoints(pts) {
    this.skillPoints += pts;
    this.save();
  }

  resetForRace() {
    this.abilities = [null, null, null, null, null];
    this.lap = 1;
    this.checkpointIndex = 0;
    this.finishPosition = 0;
    this.finished = false;
    this.raceTime = 0;
    this.lastCheckpointPos = null;
    this.lastCheckpointRot = 0;
  }

  addAbility(ability, extra = false) {
    const count = extra ? 2 : 1;
    let added = 0;
    for (let i = 0; i < 5 && added < count; i++) {
      if (!this.abilities[i]) {
        this.abilities[i] = ability;
        added++;
      }
    }
    return added > 0;
  }

  useAbility(slot) {
    const ab = this.abilities[slot];
    if (!ab) return null;
    this.abilities[slot] = null;
    return ab;
  }

  stealAbilitiesFrom(otherPlayer) {
    for (let i = 0; i < 5; i++) {
      if (otherPlayer.abilities[i]) {
        this.addAbility(otherPlayer.abilities[i]);
        otherPlayer.abilities[i] = null;
      }
    }
  }
}
