import { createWidget, widget, align, prop } from '@zos/ui'
import { Time, Battery, Step, HeartRate } from '@zos/sensor'

// Initialize hardware sensor interfaces
const timeSensor = new Time()
const batterySensor = new Battery()
const stepSensor = new Step()
const hrSensor = new HeartRate()

const pad = (val) => (val < 10 ? `0${val}` : `${val}`)

WatchFace({
  onInit() {
    console.log('Pip-Boy 3000 HUD initializing (Hardware Mode)...')
  },

  build() {
    // 1. CRT Canvas Background
    createWidget(widget.IMG, {
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      src: 'bg.png'
    })

    // 2. HUD Framing Elements
    createWidget(widget.FILL_RECT, {
      x: 70,
      y: 138,
      w: 340,
      h: 2,
      color: 0x005500
    })

    createWidget(widget.FILL_RECT, {
      x: 70,
      y: 176,
      w: 340,
      h: 2,
      color: 0x005500
    })

    createWidget(widget.FILL_RECT, {
      x: 70,
      y: 335,
      w: 340,
      h: 2,
      color: 0x005500
    })

    // 3. Vault-Tec Top Header
    createWidget(widget.TEXT, {
      x: 0,
      y: 32,
      w: 480,
      h: 28,
      color: 0x00ff00,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: 'VAULT-TEC // STAT'
    })

    // 4. Central Digital Clock Display
    const clockWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 60,
      w: 480,
      h: 72,
      color: 0x39ff14,
      text_size: 68,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: '--:--'
    })

    // 5. Telemetry: RADS (Heart Rate)
    const radsWidget = createWidget(widget.TEXT, {
      x: 60,
      y: 144,
      w: 170,
      h: 28,
      color: 0x00ff00,
      text_size: 18,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: 'RADS: -- BPM'
    })

    // 6. Telemetry: AP (Action Points / Steps)
    const apWidget = createWidget(widget.TEXT, {
      x: 250,
      y: 144,
      w: 170,
      h: 28,
      color: 0x00ff00,
      text_size: 18,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: 'AP: ----'
    })

    // 7. Centered Vault Boy Mascot
    createWidget(widget.IMG, {
      x: 170,
      y: 185,
      w: 140,
      h: 140,
      src: 'vault_boy.png'
    })

    // 8. Calendar Date Display
    const dateWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 344,
      w: 480,
      h: 28,
      color: 0x00ff00,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: 'DATE: --'
    })

    // 9. Fusion Core / Battery Gauge Text
    const batteryWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 375,
      w: 480,
      h: 26,
      color: 0x39ff14,
      text_size: 19,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: 'CORE: --%'
    })

    // 10. Terminal Status Line
    createWidget(widget.TEXT, {
      x: 0,
      y: 416,
      w: 480,
      h: 24,
      color: 0x007700,
      text_size: 14,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: 'fonts/monofonto.ttf',
      text: '[ COND: NORMAL // HP: 100% ]'
    })

    // --- Isolated Update Handlers ---

    let cachedDateStr = ''

    const updateTime = () => {
      // Physical watch hardware reflects system local time directly
      const hours = pad(timeSensor.getHours())
      const minutes = pad(timeSensor.getMinutes())
      clockWidget.setProperty(prop.MORE, {
        text: `${hours}:${minutes}`
      })

      // Update date only when midnight rolls over
      const now = new Date()
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      const newDateStr = `${days[now.getDay()]} // ${months[now.getMonth()]} ${pad(now.getDate())}`

      if (newDateStr !== cachedDateStr) {
        cachedDateStr = newDateStr
        dateWidget.setProperty(prop.MORE, {
          text: newDateStr
        })
      }
    }

    const updateBattery = () => {
      const level =
        batterySensor && typeof batterySensor.getCurrent === 'function'
          ? batterySensor.getCurrent()
          : 100

      const totalTicks = 8
      const activeTicks = Math.round((level / 100) * totalTicks)
      const bar = '|'.repeat(activeTicks) + ' '.repeat(totalTicks - activeTicks)

      batteryWidget.setProperty(prop.MORE, {
        text: `CORE: ${level}% [${bar}]`
      })
    }

    const updateSteps = () => {
      const steps =
        stepSensor && typeof stepSensor.getCurrent === 'function'
          ? stepSensor.getCurrent()
          : 0

      apWidget.setProperty(prop.MORE, {
        text: `AP: ${steps.toLocaleString()}`
      })
    }

    const updateHeartRate = () => {
      // Try getCurrent() first, fallback to getLast() if the sensor is in periodic mode
      let hr = 0
      if (hrSensor && typeof hrSensor.getCurrent === 'function') {
        hr = hrSensor.getCurrent()
      }
      if ((!hr || hr === 0) && hrSensor && typeof hrSensor.getLast === 'function') {
        hr = hrSensor.getLast()
      }
    
      radsWidget.setProperty(prop.MORE, {
        text: hr > 0 ? `RADS: ${hr} BPM` : 'RADS: -- BPM'
      })
    }
    
    // 1. Hook into the minute tick alongside time/date:
    timeSensor.onPerMinute(() => {
      updateTime()
      updateHeartRate() // Catches background PPG checks even if streaming is dormant
    })
    
    // 2. Listen to both live PPG stream and background health updates:
    if (typeof hrSensor.onCurrentChange === 'function') {
      hrSensor.onCurrentChange(updateHeartRate)
    }
    if (typeof hrSensor.onLastChange === 'function') {
      hrSensor.onLastChange(updateHeartRate)
    }

    // --- 1. Initial Pass ---
    updateTime()
    updateBattery()
    updateSteps()
    updateHeartRate()

    // --- 2. Event-Driven Bindings ---
    // Fires once per minute on hardware minute rollover
    timeSensor.onPerMinute(updateTime)

    // Fires only when the battery level shifts
    if (typeof batterySensor.onChange === 'function') {
      batterySensor.onChange(updateBattery)
    }

    // Fires only when the pedometer detects step increments
    if (typeof stepSensor.onChange === 'function') {
      stepSensor.onChange(updateSteps)
    }

    // Fires on PPG sensor measurement updates
    if (typeof hrSensor.onCurrentChange === 'function') {
      hrSensor.onCurrentChange(updateHeartRate)
    }

    // Retain references for explicit cleanup
    this.handlers = {
      updateTime,
      updateBattery,
      updateSteps,
      updateHeartRate
    }
  },

  onDestroy() {
    // Unsubscribe listeners when switching watchfaces
    if (this.handlers) {
      if (typeof batterySensor.offChange === 'function') {
        batterySensor.offChange(this.handlers.updateBattery)
      }
      if (typeof stepSensor.offChange === 'function') {
        stepSensor.offChange(this.handlers.updateSteps)
      }
      if (typeof hrSensor.offCurrentChange === 'function') {
        hrSensor.offCurrentChange(this.handlers.updateHeartRate)
      }
    }
    console.log('Pip-Boy 3000 HUD destroyed.')
  }
})