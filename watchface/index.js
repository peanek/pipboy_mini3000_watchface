import { createWidget, widget, prop, show_level, align } from '@zos/ui'
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

// Reusable helper for the 5 Pip-Boy limb gauges
const createLimbGauge = (label, x, y, initialText = '0') => {
  const boxW = 64
  const barX = x + 7
  const barY = y + 20
  const fillX = x + 8
  const fillY = y + 21
  const textY = y + 30

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
    console.log('Pip-Boy Mini-3000: Dual-Container Terminal Layout Initialized')
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

    // =========================================================================
    // MASTER LAYOUT ANCHORS (Shifted left to x: 56 for clean container framing)
    // =========================================================================
    const LEFT_COL_X = 62   // Shifted 6px right for cleaner breathing room
    const LEFT_COL_W = 96   // Uniform width (96px) for Date/Weather/PWR modules
    const FRAME_RIGHT_X = 168 // Right vertical wall X coordinate
    const FRAME_COLOR = 0x009900 // Darker retro CRT green for structural lines & labels

    const VB_X = 248        // Vault Boy X position (Right side)
    const VB_Y = 148        // Vault Boy Y position

    // 1. Background Switcher (Renders background in Normal Mode & Picker in Edit Mode)
    createWidget(widget.WATCHFACE_EDIT_BG, {
      edit_id: 123,
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      bg_config: [
        {
          id: 1,
          preview: `${ROOT_IMAGES_PATH}bg/bg_01.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_01.png`
        },
        {
          id: 2,
          preview: `${ROOT_IMAGES_PATH}bg/bg_02.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_02.png`
        },
        {
          id: 3,
          preview: `${ROOT_IMAGES_PATH}bg/bg_03.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_03.png`
        },
        {
          id: 4,
          preview: `${ROOT_IMAGES_PATH}bg/bg_04.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_04.png`
        }
      ],
      count: 4,
      default_id: 2,
      fg: `${ROOT_IMAGES_PATH}bg/mask.png`,
      tips_x: 180,
      tips_y: 425,
      tips_bg: `${ROOT_IMAGES_PATH}bg/tips.png`,
      show_level: show_level.ONLY_NORMAL | show_level.ONLY_EDIT
    })

    // 1.1 Top & Bottom Logos
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

    // =========================================================================
    // RIGHT SIDE: VAULT BOY MASCOT + 5 TIGHT LIMB TELEMETRY GAUGES
    // =========================================================================
    const vaultBoyWidget = createWidget(widget.IMG, {
      x: VB_X,
      y: VB_Y,
      w: 130,
      h: 170,
      src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_01.png`,
      show_level: show_level.ONLY_NORMAL
    })

    // All 5 gauges are anchored tightly around Vault Boy (VB_X, VB_Y)
    const stressGauge = createLimbGauge('STRESS', VB_X + 28, VB_Y - 58, '0')  // Head
    const calGauge    = createLimbGauge('CAL',    VB_X - 56, VB_Y + 42, '0')  // Left Arm
    const bpmGauge    = createLimbGauge('BPM',    VB_X + 118, VB_Y + 42, '--')// Right Arm
    const stepsGauge  = createLimbGauge('STEPS',  VB_X - 18, VB_Y + 170, '0') // Left Leg
    const paiGauge    = createLimbGauge('PAI',    VB_X + 74, VB_Y + 170, '0') // Right Leg

    // =========================================================================
    // LEFT SIDE: TOP CONTAINER [TIME] (Aligned Outer Lines + Extended Inner Wing)
    // =========================================================================

    // TIME Container - Line 1: Top Horizontal Line (Aligned at x: 62, matching bottom DATA line)
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 20,
      y: 72,
      w: FRAME_RIGHT_X - LEFT_COL_X - 18,
      h: 2,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // TIME Container - Line 2: Right Vertical Wall
    createWidget(widget.FILL_RECT, {
      x: FRAME_RIGHT_X,
      y: 72,
      w: 2,
      h: 142, // Runs down to y: 214
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // TIME Container - Line 3: Bottom Horizontal Line (Extended to x: 12, ~5px from bezel edge!)
    createWidget(widget.FILL_RECT, {
      x: 12,
      y: 212,
      w: FRAME_RIGHT_X - 12 + 2,
      h: 2,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 'TIME' Label: Moved to the newly opened far-left wing above the line!
    createWidget(widget.TEXT, {
      x: 16,
      y: 194,
      w: 42,
      h: 16,
      color: FRAME_COLOR,
      text_size: 12,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'TIME',
      show_level: show_level.ONLY_NORMAL
    })

    // 3. Time Display (Shifted right with LEFT_COL_X = 62)
    const hourWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: 76,
      w: LEFT_COL_W,
      h: 66,
      color: 0x39ff14,
      text_size: 80,
      bold: true,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    const minuteWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: 140,
      w: LEFT_COL_W,
      h: 66,
      color: 0x39ff14,
      text_size: 80,
      bold: true,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    // Smaller Seconds Box Background (26x20 instead of 32x24, tucked at x: 136)
    createWidget(widget.FILL_RECT, {
      x: 136,
      y: 182,
      w: 26,
      h: 20,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    const secondWidget = createWidget(widget.TEXT, {
      x: 136,
      y: 182,
      w: 26,
      h: 20,
      color: 0x000000,
      text_size: 16,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // LEFT SIDE: BOTTOM CONTAINER [DATA] (Extended Top Wing + Aligned Bottom Line)
    // =========================================================================

    // DATA Container - Line 1: Top Horizontal Line (Extended to x: 12, ~5px from bezel edge!)
    createWidget(widget.FILL_RECT, {
      x: 12,
      y: 220,
      w: FRAME_RIGHT_X - 12 + 2,
      h: 2,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // DATA Container - Line 2: Right Vertical Wall
    createWidget(widget.FILL_RECT, {
      x: FRAME_RIGHT_X,
      y: 220,
      w: 2,
      h: 178, // Runs down to y: 398
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // DATA Container - Line 3: Bottom Horizontal Line (Aligned at x: 62, matching top TIME line)
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 8,
      y: 396,
      w: FRAME_RIGHT_X - LEFT_COL_X - 6,
      h: 2,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 'DATA' Label: Moved to the far-left wing right below the top DATA line!
    createWidget(widget.TEXT, {
      x: 16,
      y: 224,
      w: 42,
      h: 16,
      color: FRAME_COLOR,
      text_size: 12,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'DATA',
      show_level: show_level.ONLY_NORMAL
    })

    // 4. Date Module Inside DATA Container (Width: 96px)
    const DATA_Y_MODULE_HELPER = 228 // start Y position for data modules, helper

    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER,
      w: LEFT_COL_W,
      h: 18,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    const dayWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER,
      w: LEFT_COL_W,
      h: 18,
      color: 0x000000,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '------',
      show_level: show_level.ONLY_NORMAL
    })

    const dateNumWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 19,
      w: LEFT_COL_W,
      h: 24,
      color: 0x39ff14,
      text_size: 24,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--.--',
      show_level: show_level.ONLY_NORMAL
    })

    // 5. Weather Module Inside DATA Container (Enlarged fonts & stacked spacing)
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 47,
      w: 48,
      h: 20,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 47,
      w: 48,
      h: 20,
      color: 0x000000,
      text_size: 18,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'TEMP',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherTempWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 50,
      y: DATA_Y_MODULE_HELPER + 45,
      w: LEFT_COL_W - 50,
      h: 24,
      color: 0x39ff14,
      text_size: 24,
      bold: true,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--°C',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherCondWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 71,
      w: LEFT_COL_W,
      h: 22,
      color: 0x39ff14,
      text_size: 22,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'NO-SYNC',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherRangeWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 95,
      w: LEFT_COL_W,
      h: 22,
      color: 0x39ff14,
      text_size: 22,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--°C/--°C',
      show_level: show_level.ONLY_NORMAL
    })

    // 6. Power (PWR) Module at Bottom of DATA Container (Clean & perfectly spaced)
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 122,
      w: 42,
      h: 18,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 122,
      w: 42,
      h: 18,
      color: 0x000000,
      text_size: 18,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'PWR',
      show_level: show_level.ONLY_NORMAL
    })

    const batteryTextWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 44,
      y: DATA_Y_MODULE_HELPER + 121,
      w: LEFT_COL_W - 44,
      h: 22,
      color: 0x39ff14,
      text_size: 22,
      bold: true,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--%',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 148,
      w: LEFT_COL_W,
      h: 10,
      color: 0x003300,
      show_level: show_level.ONLY_NORMAL
    })

    const batteryBarFill = createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 1,
      y: DATA_Y_MODULE_HELPER + 148,
      w: LEFT_COL_W - 2,
      h: 8,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    // --- State & Telemetry Caches ---
    let lastHourStr = ''
    let lastMinStr = ''
    let lastSecStr = ''
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
      } else if (sleepScore > 80 && timeSensor.getHours() >= 6 && timeSensor.getHours() < 12) {
        targetPose = 2
      }

      if (targetPose !== lastPoseId) {
        lastPoseId = targetPose
        vaultBoyWidget.setProperty(prop.MORE, {
          src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_0${targetPose}.png`
        })
      }
    }

    const updateSeconds = () => {
      const secs = pad(timeSensor.getSeconds())
      if (secs !== lastSecStr) {
        lastSecStr = secs
        secondWidget.setProperty(prop.MORE, { text: secs })
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

      updateSeconds()

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

      const maxWidth = LEFT_COL_W - 2
      const currentBarWidth = Math.max(1, Math.round((level / 100) * maxWidth))

      batteryBarFill.setProperty(prop.MORE, {
        x: LEFT_COL_X + 1,
        y: DATA_Y_MODULE_HELPER + 148,
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
      updateSeconds()
      updateBattery()
      updateTelemetry()
    }

    // Battery-safe 1-second timer (Only ticks while watch screen is awake!)
    let secTimer = null
    const startSecondTicker = () => {
      if (secTimer) clearInterval(secTimer)
      updateSeconds()
      secTimer = setInterval(updateSeconds, 1000)
    }
    const stopSecondTicker = () => {
      if (secTimer) {
        clearInterval(secTimer)
        secTimer = null
      }
    }

    refreshAll()
    startSecondTicker()

    createWidget(widget.WIDGET_DELEGATE, {
      resume_call: () => {
        refreshAll()
        startSecondTicker()
      },
      pause_call: () => {
        stopSecondTicker()
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
    this.handlers = { updateBattery, updateTelemetry, stopSecondTicker }
  },

  onDestroy() {
    if (this.handlers && this.sensors) {
      const { batterySensor, stepSensor, calorieSensor, hrSensor, stressSensor } = this.sensors
      const { updateBattery, updateTelemetry, stopSecondTicker } = this.handlers

      if (typeof stopSecondTicker === 'function') {
        stopSecondTicker()
      }
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