type SoundKind = 'type' | 'erase' | 'confirm'

class MissionSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.3
      this.master.connect(this.context.destination)
    }
    await this.context.resume()
  }

  play(kind: SoundKind = 'type') {
    if (!this.context || this.context.state !== 'running') return

    const now = this.context.currentTime
    if (!this.master) return

    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const filter = this.context.createBiquadFilter()

    oscillator.type = kind === 'confirm' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(kind === 'erase' ? 610 : kind === 'confirm' ? 360 : 940, now)

    if (kind === 'confirm') {
      oscillator.frequency.exponentialRampToValueAtTime(560, now + 0.14)
    }

    filter.type = kind === 'confirm' ? 'lowpass' : 'bandpass'
    filter.frequency.value = kind === 'confirm' ? 1100 : 1080
    filter.Q.value = kind === 'confirm' ? 0.7 : 0.9

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(kind === 'confirm' ? 0.024 : kind === 'erase' ? 0.008 : 0.011, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'confirm' ? 0.18 : 0.034))

    oscillator.connect(gain)
    gain.connect(filter)
    filter.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + (kind === 'confirm' ? 0.19 : 0.038))
  }
}

export const missionSound = new MissionSound()
