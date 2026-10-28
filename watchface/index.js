import { createWidget, widget, prop, show_level, align, data_type, anim_status } from '@zos/ui'
import { Time, Battery, Step, HeartRate, Stress, Sleep, Pai, Calorie, FatBurning, Weather } from '@zos/sensor'

const ROOT_IMAGES_PATH = 'images/'
const PIPBOY_FONT = 'fonts/gothic821.ttf'
const pad = (val) => (val < 10 ? `0${val}` : `${val}`)

// Safe sensor initializer so missing permissions or unsupported sensors never crash build()
const initSensor = (SensorClass) => {
  try {
    return typeof SensorClass === 'function' ? new SensorClass() : null
  } catch (e) {
    console.log('Sensor init skipped:', e)
    return null
  }
}

// Helper to safely extract numeric values whether a sensor returns a number or { value: number }
const toNumeric = (raw, fallback = 0) => {
  if (typeof raw === 'number' && !isNaN(raw)) return raw
  if (raw && typeof raw === 'object' && typeof raw.value === 'number') return raw.value
  return fallback
}

// Official Zepp OS Weather Index (0-28) lookup table
const WEATHER_STATUS = [
  'CLEAR',     // 0: Sunny
  'CLOUDY',    // 1: Cloudy
  'OVERCAST',  // 2: Overcast
  'SHOWER',    // 3: Shower
  'STORM',     // 4: Thundershower
  'HAIL',      // 5: Hail
  'SLEET',     // 6: Sleet
  'LGT-RAIN',  // 7: Light rain
  'MOD-RAIN',  // 8: Moderate rain
  'HVY-RAIN',  // 9: Heavy rain
  'DOWNPOUR',  // 10: Rainstorm
  'TORRENT',   // 11: Heavy rainstorm
  'SUPER-STRM',// 12: Extraordinary rainstorm
  'SNOW-SHWR', // 13: Snow shower
  'LGT-SNOW',  // 14: Light snow
  'MOD-SNOW',  // 15: Moderate snow
  'HVY-SNOW',  // 16: Heavy snow
  'BLIZZARD',  // 17: Blizzard
  'FOGGY',     // 18: Fog
  'FREEZ-RAIN',// 19: Freezing rain
  'DUST-STRM', // 20: Dust storm
  'LGT-MOD-RN',// 21: Light to moderate rain
  'MOD-HVY-RN',// 22: Moderate to heavy rain
  'HVY-STORM', // 23: Heavy rain to rainstorm
  'EXTR-STORM',// 24: Rainstorm to heavy rainstorm
  'SUPER-RAIN',// 25: Heavy to extraordinary rainstorm
  'LGT-MOD-SN',// 26: Light to moderate snow
  'MOD-HVY-SN',// 27: Moderate to heavy snow
  'NO-SYNC'    // 28: Unknown
]

// Reusable helper for the 5 Pip-Boy limb gauges (Upgraded font sizes)
const createLimbGauge = (label, x, y, initialText = '0') => {
  const boxW = 64
  const barX = x + 7
  const barY = y + 22
  const fillX = x + 8
  const fillY = y + 23
  const textY = y + 32

  createWidget(widget.TEXT, {
    x: x,
    y: y,
    w: boxW,
    h: 20,
    color: 0x39ff14,
    text_size: 17,
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    font: PIPBOY_FONT,
    text: label,
    show_level: show_level.ONLY_NORMAL
  })

  createWidget(widget.FILL_RECT, {
    x: barX,
    y: barY,
    w: 50,
    h: 8,
    color: 0x003300,
    show_level: show_level.ONLY_NORMAL
  })

  const barFill = createWidget(widget.FILL_RECT, {
    x: fillX,
    y: fillY,
    w: 0,
    h: 6,
    color: 0x39ff14,
    show_level: show_level.ONLY_NORMAL
  })

  const valueText = createWidget(widget.TEXT, {
    x: x,
    y: textY,
    w: boxW,
    h: 24,
    color: 0x39ff14,
    text_size: 22,
    bold: true,
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    font: PIPBOY_FONT,
    text: initialText,
    show_level: show_level.ONLY_NORMAL
  })

  return {
    setText(str) {
      valueText.setProperty(prop.MORE, {
        text: str
      })
    },
    setRatio(ratio) {
      const clamped = Math.max(0, Math.min(1, ratio))
      const currentWidth = clamped > 0 ? Math.max(1, Math.round(clamped * 48)) : 0
      barFill.setProperty(prop.MORE, {
        x: fillX,
        y: fillY,
        w: currentWidth,
        h: 6,
        color: 0x39ff14
      })
    }
  }
}

WatchFace({
  onInit() {
    console.log('Pip-Boy Mini-3000: Ready for Deployment')
  },

  build() {
    const timeSensor = new Time()
    const batterySensor = new Battery()

    const weatherSensor = initSensor(Weather)
    const stepSensor = initSensor(Step)
    const hrSensor = initSensor(HeartRate)
    const stressSensor = initSensor(Stress)
    const sleepSensor = initSensor(Sleep)
    const paiSensor = initSensor(Pai)
    const calorieSensor = initSensor(Calorie)
    const fatBurnSensor = initSensor(FatBurning)

    // 1. Background Switcher
    const editBg = createWidget(widget.WATCHFACE_EDIT_BG, {
      edit_id: 123,
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      bg_config: [
        {
          id: 1,
          preview: `${ROOT_IMAGES_PATH}bg/bg_variant_01.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_variant_01.png`
        },
        {
          id: 2,
          preview: `${ROOT_IMAGES_PATH}bg/bg_variant_02.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_variant_02.png`
        },
        {
          id: 3,
          preview: `${ROOT_IMAGES_PATH}bg/bg_variant_03.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_variant_03.png`
        },
        {
          id: 4,
          preview: `${ROOT_IMAGES_PATH}bg/bg_variant_04.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_variant_04.png`
        },
        {
          id: 5,
          preview: `${ROOT_IMAGES_PATH}bg/bg_variant_05.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_variant_05.png`
        }
      ],
      count: 5,
      default_id: 1,
      tips_x: 170,
      tips_y: 400,
      // fg: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_01.png`,
      // tips_bg: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_01.png`
      fg: `${ROOT_IMAGES_PATH}bg/bg_variant_01.png`,
      tips_bg: `${ROOT_IMAGES_PATH}bg/bg_variant_01.png`
    })

    const selectedBgType = editBg.getProperty(prop.CURRENT_TYPE) || 1
    const bgSrc = `${ROOT_IMAGES_PATH}bg/bg_variant_0${selectedBgType}.png`

    createWidget(widget.IMG, {
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      src: bgSrc,
      show_level: show_level.ONLY_NORMAL
    })

    // 1.1 Top & Bottom Logos with auto_scale: true
    createWidget(widget.IMG, {
      x: 170,
      y: 12,
      w: 130,
      h: 50,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}logo/pipboy_logo_01.png`,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG, {
      x: 180,
      y: 425,
      w: 120,
      h: 42,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}logo/robco_logo_01.png`,
      show_level: show_level.ONLY_NORMAL
    })

    // 2. Vault Boy Mascot
    const vaultBoyWidget = createWidget(widget.IMG, {
      x: 180,
      y: 142,
      w: 130,
      h: 170,
      src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_01.png`,
      show_level: show_level.ONLY_NORMAL
    })

    // 3. Time Display (Aligned at x: 22, 92px font)
    const hourWidget = createWidget(widget.TEXT, {
      x: 22,
      y: 148,
      w: 100,
      h: 92,
      color: 0x39ff14,
      text_size: 92,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    const minuteWidget = createWidget(widget.TEXT, {
      x: 22,
      y: 232,
      w: 100,
      h: 92,
      color: 0x39ff14,
      text_size: 92,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    // 4. Bottom-Right Date Module: [MONDAY] Badge + Larger DD.MM below it
    createWidget(widget.FILL_RECT, {
      x: 326,
      y: 358,
      w: 82,
      h: 18,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    const dayWidget = createWidget(widget.TEXT, {
      x: 326,
      y: 358,
      w: 82,
      h: 18,
      color: 0x000000,
      text_size: 16,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '------',
      show_level: show_level.ONLY_NORMAL
    })

    const dateNumWidget = createWidget(widget.TEXT, {
      x: 326,
      y: 378,
      w: 82,
      h: 24,
      color: 0x39ff14,
      text_size: 25,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--.--',
      show_level: show_level.ONLY_NORMAL
    })

    // 5. Five Limb Telemetry Gauges
    const stressGauge = createLimbGauge('STRESS', 206, 85, '0') // Head
    const calGauge = createLimbGauge('CAL', 120, 192, '0')      // Left Arm
    const bpmGauge = createLimbGauge('BPM', 300, 192, '--')     // Right Arm
    const stepsGauge = createLimbGauge('STEPS', 161, 315, '0')  // Left Leg
    const paiGauge = createLimbGauge('PAI', 260, 315, '0')      // Right Leg

    // 6. Larger Lower-Left Corner Power Meter
    createWidget(widget.FILL_RECT, {
      x: 72,
      y: 358,
      w: 38,
      h: 18,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: 72,
      y: 358,
      w: 38,
      h: 18,
      color: 0x000000,
      text_size: 16,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'PWR',
      show_level: show_level.ONLY_NORMAL
    })

    const batteryTextWidget = createWidget(widget.TEXT, {
      x: 112,
      y: 355,
      w: 42,
      h: 24,
      color: 0x39ff14,
      text_size: 21,
      bold: true,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--%',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: 71,
      y: 379,
      w: 80,
      h: 11,
      color: 0x003300,
      show_level: show_level.ONLY_NORMAL
    })

    const batteryBarFill = createWidget(widget.FILL_RECT, {
      x: 72,
      y: 380,
      w: 80,
      h: 8,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    // 7. Top-Right Weather Module: [TEMP] 15°C + Condition + Range
    createWidget(widget.FILL_RECT, {
      x: 318,
      y: 82,
      w: 48,
      h: 18,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: 318,
      y: 82,
      w: 48,
      h: 18,
      color: 0x000000,
      text_size: 16,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'TEMP',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherTempWidget = createWidget(widget.TEXT, {
      x: 370,
      y: 80,
      w: 55,
      h: 22,
      color: 0x39ff14,
      text_size: 18,
      bold: true,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--°C',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherCondWidget = createWidget(widget.TEXT, {
      x: 318,
      y: 103,
      w: 105,
      h: 18,
      color: 0x39ff14,
      text_size: 16,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'NO-SYNC',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherRangeWidget = createWidget(widget.TEXT, {
      x: 318,
      y: 121,
      w: 105,
      h: 18,
      color: 0x39ff14,
      text_size: 16,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--°C/--°C',
      show_level: show_level.ONLY_NORMAL
    })

    // 8. Top-Left Vault 13 Door & Vault Boy Animation (70x70px at x: 52, y: 74)
    // Wrapped in try/catch so even if an image frame is missing, telemetry still works!
    let vaultAnim = null
    try {
      vaultAnim = createWidget(widget.IMG_ANIM, {
        x: 85,
        y: 70,
        anim_path: `${ROOT_IMAGES_PATH}animations/vault_animation`,
        anim_prefix: 'frame',
        anim_ext: 'png',
        anim_fps: 5,
        anim_size: 8,
        repeat_count: 1,
        anim_repeat: false,
        display_on_restart: 1,
        anim_status: anim_status.START,
        show_level: show_level.ONLY_NORMAL
      })
    } catch (e) {
      console.log('Vault animation init error:', e)
    }

    // --- State & Telemetry Caches ---
    let lastHourStr = ''
    let lastMinStr = ''
    let lastDateStr = ''
    let lastBatteryLevel = -1
    let lastPoseId = 1

    let lastStepCount = -1
    let lastStepChunk = -1

    let lastCalCount = -1
    let lastCalChunk = -1

    let lastHrValue = -1
    let lastHrChunk = -1

    let lastStressValue = -1
    let lastStressChunk = -1

    let lastPaiValue = -1
    let lastPaiChunk = -1

    const updateTelemetry = () => {
      let battery = 100
      let steps = 0
      let calories = 0
      let heartRate = 70
      let stress = 0
      let pai = 0
      let sleepScore = 0
      let exerciseMins = 0

      try {
        if (batterySensor && typeof batterySensor.getCurrent === 'function') {
          battery = toNumeric(batterySensor.getCurrent(), 100)
        }
        if (stepSensor && typeof stepSensor.getCurrent === 'function') {
          steps = toNumeric(stepSensor.getCurrent(), 0)
        }
        if (calorieSensor && typeof calorieSensor.getCurrent === 'function') {
          calories = toNumeric(calorieSensor.getCurrent(), 0)
        }
        if (hrSensor) {
          const currentHr = typeof hrSensor.getCurrent === 'function' ? toNumeric(hrSensor.getCurrent(), 0) : 0
          const lastHr = typeof hrSensor.getLast === 'function' ? toNumeric(hrSensor.getLast(), 0) : 0
          heartRate = currentHr > 0 ? currentHr : (lastHr > 0 ? lastHr : 70)
        }
        if (stressSensor && typeof stressSensor.getCurrent === 'function') {
          stress = toNumeric(stressSensor.getCurrent(), 0)
        }
        if (paiSensor) {
          if (typeof paiSensor.getTotal === 'function') {
            pai = toNumeric(paiSensor.getTotal(), 0)
          } else if (typeof paiSensor.getTotalPAI === 'function') {
            pai = toNumeric(paiSensor.getTotalPAI(), 0)
          }
        }
        if (sleepSensor && typeof sleepSensor.getInfo === 'function') {
          const sleepInfo = sleepSensor.getInfo()
          if (sleepInfo && typeof sleepInfo.score === 'number') {
            sleepScore = sleepInfo.score
          }
        }
        if (fatBurnSensor && typeof fatBurnSensor.getCurrent === 'function') {
          exerciseMins = toNumeric(fatBurnSensor.getCurrent(), 0)
        }
      } catch (err) {
        console.log('Telemetry read error:', err)
      }

      // --- Streamlined Weather Telemetry ---
      try {
        const wData = weatherSensor?.getForecast?.()
        const today = wData?.forecastData?.data?.[0]

        if (today) {
          const hasHighLow = typeof today.high === 'number' && typeof today.low === 'number'
          const tempVal = today.cur ?? (hasHighLow ? Math.round((today.high + today.low) / 2) : today.high)
          const statusStr = WEATHER_STATUS[today.index] || 'CLEAR'

          weatherTempWidget.setProperty(prop.MORE, {
            text: tempVal !== undefined ? `${tempVal}°C` : '--°C'
          })
          weatherCondWidget.setProperty(prop.MORE, {
            text: statusStr
          })
          weatherRangeWidget.setProperty(prop.MORE, {
            text: hasHighLow ? `${today.low}°C/${today.high}°C` : '--°C/--°C'
          })
        }
      } catch (err) {
        console.log('Weather error:', err)
      }

      // --- QUICK SIMULATOR MOCK OVERRIDES ---
      // Uncomment any line below to force a constant test value:
      // pai = 135       // Forces PAI gauge to 135 & triggers Pose 8 (Psycho/Jet)
      // stress = 80     // Forces STRESS gauge to 80 & triggers Pose 4 (if PAI <= 130)
      // heartRate = 115 // Triggers Pose 7
      // exerciseMins = 61 // Triggers Pose 6 (Bodybuilder)
      // steps = 8500    // Triggers Pose 5
      // battery = 15    // Triggers Pose 3
      // sleepScore = 75 // Triggers Pose 2

      // 1. Left Leg: STEPS (0 - 8000, bar chunked every 100 steps)
      if (steps !== lastStepCount) {
        lastStepCount = steps
        stepsGauge.setText(String(steps))
        const stepChunk = Math.floor(steps / 100)
        if (stepChunk !== lastStepChunk) {
          lastStepChunk = stepChunk
          stepsGauge.setRatio(steps / 8000)
        }
      }

      // 2. Left Arm: CAL (0 - 600 kcal, bar chunked every 25 kcal)
      if (calories !== lastCalCount) {
        lastCalCount = calories
        calGauge.setText(String(calories))
        const calChunk = Math.floor(calories / 25)
        if (calChunk !== lastCalChunk) {
          lastCalChunk = calChunk
          calGauge.setRatio(calories / 600)
        }
      }

      // 3. Right Arm: BPM / Heart Rate (40 - 160 BPM, bar chunked every 5 BPM)
      if (heartRate !== lastHrValue) {
        lastHrValue = heartRate
        bpmGauge.setText(String(heartRate))
        const hrChunk = Math.floor(heartRate / 5)
        if (hrChunk !== lastHrChunk) {
          lastHrChunk = hrChunk
          bpmGauge.setRatio((heartRate - 40) / 120)
        }
      }

      // 4. Head: STRESS (0 - 100, bar chunked every 5 units)
      if (stress !== lastStressValue) {
        lastStressValue = stress
        stressGauge.setText(String(stress))
        const stressChunk = Math.floor(stress / 5)
        if (stressChunk !== lastStressChunk) {
          lastStressChunk = stressChunk
          stressGauge.setRatio(stress / 100)
        }
      }

      // 5. Right Leg: PAI (0 - 130, bar chunked every 5 PAI)
      if (pai !== lastPaiValue) {
        lastPaiValue = pai
        paiGauge.setText(String(pai))
        const paiChunk = Math.floor(pai / 5)
        if (paiChunk !== lastPaiChunk) {
          lastPaiChunk = paiChunk
          paiGauge.setRatio(pai / 130)
        }
      }

      // Evaluate 8-State Vault Boy Pose
      let targetPose = 1
      if (pai > 130) {
        targetPose = 8
      } else if (heartRate > 100) {
        targetPose = 7
      } else if (exerciseMins > 60) {
        targetPose = 6
      } else if (steps > 8000) {
        targetPose = 5
      } else if (stress > 75) {
        targetPose = 4
      } else if (battery < 25) {
        targetPose = 3
      } else if (sleepScore > 75) {
        targetPose = 2
      }

      if (targetPose !== lastPoseId) {
        lastPoseId = targetPose
        vaultBoyWidget.setProperty(prop.MORE, {
          src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_0${targetPose}.png`
        })
      }
    }

    const updateTime = () => {
      const hours = pad(timeSensor.getHours())
      const mins = pad(timeSensor.getMinutes())

      if (hours !== lastHourStr) {
        lastHourStr = hours
        hourWidget.setProperty(prop.MORE, { text: hours })
      }

      if (mins !== lastMinStr) {
        lastMinStr = mins
        minuteWidget.setProperty(prop.MORE, { text: mins })
      }

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      const dayIdx = timeSensor.getDay ? timeSensor.getDay() % 7 : new Date().getDay()
      const dateNum = timeSensor.getDate ? timeSensor.getDate() : new Date().getDate()
      const monthNum = timeSensor.getMonth ? timeSensor.getMonth() : (new Date().getMonth() + 1)

      const dayName = days[dayIdx]
      const dateStr = `${pad(dateNum)}.${pad(monthNum)}`

      const fullDateKey = `${dayName}_${dateStr}`
      if (fullDateKey !== lastDateStr) {
        lastDateStr = fullDateKey
        dayWidget.setProperty(prop.MORE, { text: dayName })
        dateNumWidget.setProperty(prop.MORE, { text: dateStr })
      }

      updateTelemetry()
    }

    const updateBattery = () => {
      const level = batterySensor && typeof batterySensor.getCurrent === 'function' 
        ? toNumeric(batterySensor.getCurrent(), 100)
        : 100

      if (level === lastBatteryLevel) return
      lastBatteryLevel = level

      const maxWidth = 80
      const currentBarWidth = Math.max(1, Math.round((level / 100) * maxWidth))

      batteryBarFill.setProperty(prop.MORE, {
        x: 72,
        y: 380,
        w: currentBarWidth,
        h: 8,
        color: 0x39ff14
      })

      batteryTextWidget.setProperty(prop.MORE, {
        text: `${level}%`
      })

      updateTelemetry()
    }

    const refreshAll = () => {
      updateTime()
      updateBattery()
      updateTelemetry()
    }

    refreshAll()

    createWidget(widget.WIDGET_DELEGATE, {
      resume_call: () => {
        refreshAll()
        try {
          if (vaultAnim) {
            vaultAnim.setProperty(prop.ANIM_STATUS, anim_status.STOP)
            vaultAnim.setProperty(prop.ANIM_STATUS, anim_status.START)
          }
        } catch (e) {
          console.log('Anim restart skipped:', e)
        }
      }
    })

    timeSensor.onPerMinute(updateTime)
    if (typeof batterySensor.onChange === 'function') {
      batterySensor.onChange(updateBattery)
    }
    if (stepSensor && typeof stepSensor.onChange === 'function') {
      stepSensor.onChange(updateTelemetry)
    }
    if (calorieSensor && typeof calorieSensor.onChange === 'function') {
      calorieSensor.onChange(updateTelemetry)
    }
    if (hrSensor && typeof hrSensor.onCurrentChange === 'function') {
      hrSensor.onCurrentChange(updateTelemetry)
    }
    if (stressSensor && typeof stressSensor.onChange === 'function') {
      stressSensor.onChange(updateTelemetry)
    }

    this.sensors = { batterySensor, stepSensor, calorieSensor, hrSensor, stressSensor }
    this.handlers = { updateBattery, updateTelemetry }
  },

  onDestroy() {
    if (this.handlers && this.sensors) {
      const { batterySensor, stepSensor, calorieSensor, hrSensor, stressSensor } = this.sensors
      const { updateBattery, updateTelemetry } = this.handlers

      if (batterySensor && typeof batterySensor.offChange === 'function') {
        batterySensor.offChange(updateBattery)
      }
      if (stepSensor && typeof stepSensor.offChange === 'function') {
        stepSensor.offChange(updateTelemetry)
      }
      if (calorieSensor && typeof calorieSensor.offChange === 'function') {
        calorieSensor.offChange(updateTelemetry)
      }
      if (hrSensor && typeof hrSensor.offCurrentChange === 'function') {
        hrSensor.offCurrentChange(updateTelemetry)
      }
      if (stressSensor && typeof stressSensor.offChange === 'function') {
        stressSensor.offChange(updateTelemetry)
      }
    }
    console.log('Pip-Boy Mini-3000 destroyed.')
  }
})