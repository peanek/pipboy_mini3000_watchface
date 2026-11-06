import { createWidget, widget, prop, show_level, align, data_type } from '@zos/ui'
import { Time, Battery, Step, HeartRate, Stress, Sleep, Pai, Calorie, FatBurning, Weather } from '@zos/sensor'

const ROOT_IMAGES_PATH = 'images/'
const PIPBOY_FONT = 'fonts/gothic821.ttf'

// Screenshot Mode: if true, the watchface renders fixed values for store screenshots
const IS_STORE_SCREENSHOT_MODE = false
const SCREENSHOT_MOCK = {
  hours: '21',
  mins: '37',
  dayName: 'SUNDAY',
  dateStr: '01 NOV',
  battery: 85,
  steps: 800,
  calories: 160,
  heartRate: 120,
  stress: 72,
  pai: 28,
  temp: '10°C',
  cond: 'SUNNY',
  range: '14°C/24°C',
  sunrise: '06:25',
  sunset: '17:55'
}

// Color Palette
const GLOW_AMBIENT_IMG = `${ROOT_IMAGES_PATH}bg/glow_ambient.png`
const FRAME_COLOR = 0x009900      // CRT structural outlines and labels
const GLOW_CORE_COLOR = 0xD0FFAA  // Intense "hot core" for values
const GLOW_NEON_COLOR = 0x39FF14  // Native glowing green for secondary texts/badges
const BAR_BG_COLOR = 0x003300     // Dark green bar background

// Static lookup tables at module scope
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

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

// Runs a sensor read in isolation so one failing sensor can't break the others
const safe = (fn, fallback = 0) => {
  try {
    return fn()
  } catch (e) {
    console.log('Sensor read error:', e)
    return fallback
  }
}

// Extracts a number whether a sensor returns a number or { value: number }
const toNumeric = (raw, fallback = 0) => {
  if (typeof raw === 'number' && !isNaN(raw)) return raw
  if (raw && typeof raw === 'object' && typeof raw.value === 'number') return raw.value
  return fallback
}

// Official Zepp OS Weather Index (0-28) lookup table
const WEATHER_STATUS = [
  'CLOUDY',     // 0: Cloudy
  'SHOWER',     // 1: Shower
  'SNOW-SHWR',  // 2: Snow shower
  'CLEAR',      // 3: Sunny / Clear
  'OVERCAST',   // 4: Overcast
  'LGT-RAIN',   // 5: Light rain
  'LGT-SNOW',   // 6: Light snow
  'MOD-RAIN',   // 7: Moderate rain
  'MOD-SNOW',   // 8: Moderate snow
  'HVY-SNOW',   // 9: Heavy snow
  'HVY-RAIN',   // 10: Heavy rain
  'SANDSTORM',  // 11: Sandstorm
  'SLEET',      // 12: Sleet
  'FOGGY',      // 13: Fog
  'HAZE',       // 14: Haze
  'STORM',      // 15: Thundershower
  'BLIZZARD',   // 16: Snowstorm
  'DUST',       // 17: Dust
  'SUPER-RAIN', // 18: Extraordinary rainstorm
  'FREEZ-RAIN', // 19: Rain with hail
  'HAIL-STRM',  // 20: Thundershowers with hail
  'TORRENT',    // 21: Heavy rainstorm
  'SAND-BLOW',  // 22: Sand blowing
  'HVY-SAND',   // 23: Strong sandstorm
  'DOWNPOUR',   // 24: Rainstorm
  'NO-SYNC',    // 25: Unknown weather
  'NIGHT-CLD',  // 26: Cloudy at night
  'NIGHT-SHWR', // 27: Shower at night
  'CLEAR-NGT'   // 28: Clear night
]

// Text setter that skips the update when the text hasn't changed
const makeTextSetter = (w) => {
  let last = null
  return (str) => {
    if (str === last) return
    last = str
    w.setProperty(prop.TEXT, str)
  }
}

// Reusable helper for the 5 Pip-Boy limb gauges (includes backdrop glow)
const createLimbGauge = (label, x, y, initialText = '0') => {
  const boxW = 64
  const barX = x + 7
  const barY = y + 20
  const fillX = x + 8
  const fillY = y + 21
  const textY = y + 28

  let lastWidth = -1

  createWidget(widget.IMG, {
    x: x - 28,
    y: y - 18,
    w: boxW + 56,
    h: 92,
    src: GLOW_AMBIENT_IMG,
    auto_scale: true,
    alpha: 135,
    show_level: show_level.ONLY_NORMAL
  })

  createWidget(widget.TEXT, {
    x: x,
    y: y - 4,
    w: boxW,
    h: 20,
    color: GLOW_NEON_COLOR,
    text_size: 20,
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
    color: BAR_BG_COLOR,
    show_level: show_level.ONLY_NORMAL
  })

  const barFill = createWidget(widget.FILL_RECT, {
    x: fillX,
    y: fillY,
    w: 0,
    h: 6,
    color: GLOW_NEON_COLOR,
    show_level: show_level.ONLY_NORMAL
  })

  const valueText = createWidget(widget.TEXT, {
    x: x,
    y: textY,
    w: boxW,
    h: 24,
    color: GLOW_CORE_COLOR,
    text_size: 24,
    bold: false,
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    font: PIPBOY_FONT,
    text: initialText,
    show_level: show_level.ONLY_NORMAL
  })

  const setValueText = makeTextSetter(valueText)

  return {
    setText: setValueText,
    setRatio(ratio) {
      const clamped = Math.max(0, Math.min(1, ratio))
      const currentWidth = clamped > 0 ? Math.max(1, Math.round(clamped * 48)) : 0
      if (currentWidth === lastWidth) return
      lastWidth = currentWidth
      // FILL_RECT requires prop.MORE with full geometry in Zepp OS
      barFill.setProperty(prop.MORE, {
        x: fillX,
        y: fillY,
        w: currentWidth,
        h: 6,
        color: GLOW_NEON_COLOR
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
    // MASTER LAYOUT ANCHORS
    // =========================================================================
    const LEFT_COL_X = 62
    const LEFT_COL_W = 96     // Uniform width for Date/Weather/PWR modules
    const FRAME_RIGHT_X = 168 // Right vertical wall X coordinate
    const SEC_BAR_MAX_W = FRAME_RIGHT_X - 12 + 2

    const VB_X = 248          // Vault Boy X position (right side)
    const VB_Y = 148          // Vault Boy Y position

    // 1. Background Switcher (normal mode background, picker in edit mode)
    createWidget(widget.WATCHFACE_EDIT_BG, {
      edit_id: 123,
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      bg_config: [
        { id: 1, preview: `${ROOT_IMAGES_PATH}bg/bg_01.png`, path: `${ROOT_IMAGES_PATH}bg/bg_01.png` },
        { id: 2, preview: `${ROOT_IMAGES_PATH}bg/bg_02.png`, path: `${ROOT_IMAGES_PATH}bg/bg_02.png` },
        { id: 3, preview: `${ROOT_IMAGES_PATH}bg/bg_03.png`, path: `${ROOT_IMAGES_PATH}bg/bg_03.png` },
        { id: 4, preview: `${ROOT_IMAGES_PATH}bg/bg_04.png`, path: `${ROOT_IMAGES_PATH}bg/bg_04.png` },
        { id: 5, preview: `${ROOT_IMAGES_PATH}bg/bg_05.png`, path: `${ROOT_IMAGES_PATH}bg/bg_05.png` }
      ],
      count: 5,
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
      y: 8,
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
    // LAYER: ATMOSPHERIC AMBIENT GLOW BACKDROPS (behind HUD)
    // =========================================================================
    createWidget(widget.IMG, {
      x: LEFT_COL_X - 36,
      y: 10,
      w: 180,
      h: 260,
      src: GLOW_AMBIENT_IMG,
      auto_scale: true,
      alpha: 175,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG, {
      x: LEFT_COL_X - 55,
      y: 160,
      w: 200,
      h: 280,
      src: GLOW_AMBIENT_IMG,
      auto_scale: true,
      alpha: 145,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG, {
      x: VB_X - 45,
      y: VB_Y - 60,
      w: 220,
      h: 240,
      src: GLOW_AMBIENT_IMG,
      auto_scale: true,
      alpha: 110,
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // RIGHT SIDE: VAULT BOY MASCOT + 5 LIMB TELEMETRY GAUGES
    // =========================================================================
    const vaultBoyWidget = createWidget(widget.IMG, {
      x: VB_X,
      y: VB_Y - 30,
      w: 112,
      h: 170,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_01.png`,
      show_level: show_level.ONLY_NORMAL
    })

    const stressGauge = createLimbGauge('STRESS', VB_X + 28, VB_Y - 85, '0')   // Head
    const calGauge    = createLimbGauge('CAL',    VB_X - 56, VB_Y + 12, '0')   // Left Arm
    const bpmGauge    = createLimbGauge('BPM',    VB_X + 118, VB_Y + 12, '--') // Right Arm
    const stepsGauge  = createLimbGauge('STEPS',  VB_X - 18, VB_Y + 140, '0')  // Left Leg
    const paiGauge    = createLimbGauge('PAI',    VB_X + 74, VB_Y + 140, '0')  // Right Leg

    // =========================================================================
    // LEFT SIDE: TOP CONTAINER [TIME]
    // =========================================================================
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 28,
      y: 62,
      w: FRAME_RIGHT_X - LEFT_COL_X - 28,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: FRAME_RIGHT_X,
      y: 62,
      w: 3,
      h: 153,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: 12,
      y: 212,
      w: FRAME_RIGHT_X - 12 + 2,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: 12,
      y: 215,
      w: SEC_BAR_MAX_W,
      h: 4,
      color: BAR_BG_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: 16,
      y: 194,
      w: 42,
      h: 16,
      color: FRAME_COLOR,
      text_size: 17,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'TIME',
      show_level: show_level.ONLY_NORMAL
    })

    const timeCursor = createWidget(widget.FILL_RECT, {
      x: 44,
      y: 204,
      w: 9,
      h: 3,
      color: GLOW_CORE_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    const hourWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 4,
      y: 66,
      w: LEFT_COL_W,
      h: 72,
      color: GLOW_CORE_COLOR,
      text_size: 90,
      bold: false,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL | show_level.ONAL_AOD
    })

    const minuteWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 4,
      y: 136,
      w: LEFT_COL_W,
      h: 72,
      color: GLOW_CORE_COLOR,
      text_size: 90,
      bold: false,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL | show_level.ONAL_AOD
    })

    // =========================================================================
    // LEFT SIDE: BOTTOM CONTAINER [DATA]
    // =========================================================================
    createWidget(widget.FILL_RECT, {
      x: 12,
      y: 220,
      w: FRAME_RIGHT_X - 12 + 2,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: FRAME_RIGHT_X,
      y: 220,
      w: 3,
      h: 179,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 8,
      y: 396,
      w: FRAME_RIGHT_X - LEFT_COL_X - 6,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: 16,
      y: 226,
      w: 42,
      h: 16,
      color: FRAME_COLOR,
      text_size: 17,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'DATA',
      show_level: show_level.ONLY_NORMAL
    })

    const DATA_Y_MODULE_HELPER = 228

    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER,
      w: LEFT_COL_W,
      h: 18,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL | show_level.ONAL_AOD
    })

    const dayWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER - 2,
      w: LEFT_COL_W,
      h: 20,
      color: 0x000000,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '------',
      show_level: show_level.ONLY_NORMAL | show_level.ONAL_AOD
    })

    const dateNumWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 21,
      w: LEFT_COL_W,
      h: 24,
      color: GLOW_CORE_COLOR,
      text_size: 26,
      bold: false,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--.--',
      show_level: show_level.ONLY_NORMAL | show_level.ONAL_AOD
    })

    // Weather module
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 47,
      w: 48,
      h: 20,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 46,
      w: 48,
      h: 20,
      color: 0x000000,
      text_size: 20,
      bold: false,
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
      color: GLOW_CORE_COLOR,
      text_size: 28,
      bold: false,
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
      color: GLOW_CORE_COLOR,
      text_size: 26,
      bold: false,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'NO-SYNC',
      show_level: show_level.ONLY_NORMAL
    })

    const weatherRangeWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 97,
      w: LEFT_COL_W,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 26,
      bold: false,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--°C/--°C',
      show_level: show_level.ONLY_NORMAL
    })

    // Power (PWR) module
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 124,
      w: 42,
      h: 18,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 123,
      w: 42,
      h: 18,
      color: 0x000000,
      text_size: 20,
      bold: false,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'PWR',
      show_level: show_level.ONLY_NORMAL
    })

    const batteryTextWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 44,
      y: DATA_Y_MODULE_HELPER + 122,
      w: LEFT_COL_W - 44,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 24,
      bold: false,
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
      color: BAR_BG_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    const batteryBarFill = createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 1,
      y: DATA_Y_MODULE_HELPER + 149,
      w: LEFT_COL_W - 2,
      h: 8,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // RIGHT SIDE: [ENV] CONTAINER WITH RIGHT-HAND LABEL WING
    // =========================================================================
    const ENV_X = 177
    const ENV_Y = 345
    const ENV_W = 216
    const ENV_H = 70
    const ENV_WALL_R = ENV_X + ENV_W - 3

    createWidget(widget.IMG, {
      x: ENV_X - 20,
      y: ENV_Y - 12,
      w: ENV_W + 70,
      h: ENV_H + 24,
      src: GLOW_AMBIENT_IMG,
      auto_scale: true,
      alpha: 135,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: ENV_X,
      y: ENV_Y,
      w: 270,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: ENV_X,
      y: ENV_Y,
      w: 3,
      h: ENV_H,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: ENV_X,
      y: ENV_Y + ENV_H - 3,
      w: 216,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: ENV_WALL_R + 18,
      y: ENV_Y + 6,
      w: 40,
      h: 16,
      color: FRAME_COLOR,
      text_size: 17,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'ENV',
      show_level: show_level.ONLY_NORMAL
    })

    // -------------------------------------------------------------------------
    // ROW 1: [SUN] + sun_rise.png + Time + sun_set.png + Time
    // -------------------------------------------------------------------------
    const ROW1_Y = ENV_Y + 11

    createWidget(widget.FILL_RECT, {
      x: ENV_X + 10,
      y: ROW1_Y,
      w: 40,
      h: 18,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: ENV_X + 10,
      y: ROW1_Y - 1,
      w: 40,
      h: 18,
      color: 0x000000,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'SUN',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG, {
      x: ENV_X + 56,
      y: ROW1_Y + 1,
      w: 16,
      h: 16,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}icons/sun_rise.png`,
      show_level: show_level.ONLY_NORMAL
    })

    const sunriseTextWidget = createWidget(widget.TEXT, {
      x: ENV_X + 75,
      y: ROW1_Y - 2,
      w: 52,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--:--',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG, {
      x: ENV_X + 132,
      y: ROW1_Y + 1,
      w: 16,
      h: 16,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}icons/sun_set.png`,
      show_level: show_level.ONLY_NORMAL
    })

    const sunsetTextWidget = createWidget(widget.TEXT, {
      x: ENV_X + 151,
      y: ROW1_Y - 2,
      w: 52,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--:--',
      show_level: show_level.ONLY_NORMAL
    })

    // -------------------------------------------------------------------------
    // ROW 2: [RAD] UV + [AQI] status
    // -------------------------------------------------------------------------
    const ROW2_Y = ENV_Y + 41

    createWidget(widget.FILL_RECT, {
      x: ENV_X + 10,
      y: ROW2_Y,
      w: 40,
      h: 18,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: ENV_X + 10,
      y: ROW2_Y - 1,
      w: 40,
      h: 18,
      color: 0x000000,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'RAD',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT_FONT, {
      x: ENV_X + 55,
      y: ROW2_Y - 2,
      w: 22,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      type: data_type.UVI,
      unit_type: 0,
      invalid_text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: ENV_X + 70,
      y: ROW2_Y,
      w: 22,
      h: 18,
      color: GLOW_CORE_COLOR,
      text_size: 18,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'UV',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.FILL_RECT, {
      x: ENV_X + 96,
      y: ROW2_Y,
      w: 38,
      h: 18,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: ENV_X + 96,
      y: ROW2_Y - 1,
      w: 38,
      h: 18,
      color: 0x000000,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'AQI',
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT_IMG, {
      x: ENV_X + 140,
      y: ROW2_Y - 3,
      w: 64,
      h: 20,
      font_array: [
        `${ROOT_IMAGES_PATH}aqi/aqi_0.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_1.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_2.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_3.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_4.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_5.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_6.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_0.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_0.png`,
        `${ROOT_IMAGES_PATH}aqi/aqi_0.png`
      ],
      h_space: 0,
      align_h: align.LEFT,
      type: data_type.AQI,
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // INTERACTIVE TOUCH BUTTONS (invisible overlays for quick access)
    // =========================================================================
    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: 72,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 140,
      type: data_type.ALARM_CLOCK,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 40,
      type: data_type.SUN_CURRENT,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 40,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 65,
      type: data_type.WEATHER,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 122,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 36,
      type: data_type.BATTERY,
      show_level: show_level.ONLY_NORMAL
    })

    // Aligned with vaultBoyWidget (VB_Y - 30)
    createWidget(widget.IMG_CLICK, {
      x: VB_X,
      y: VB_Y - 30,
      w: 130,
      h: 170,
      type: data_type.HEART,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.IMG_CLICK, {
      x: ENV_X,
      y: ENV_Y,
      w: ENV_W,
      h: ENV_H,
      type: data_type.UVI,
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // ALWAYS-ON DISPLAY (AOD) VAULT BOY (Thumbs-Up Pose 02)
    // Time & Date are shared directly from hourWidget, minuteWidget, dayWidget, dateNumWidget
    // =========================================================================
    createWidget(widget.IMG, {
      x: VB_X,
      y: VB_Y - 30,
      w: 112,
      h: 170,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_02.png`,
      show_level: show_level.ONAL_AOD
    })

    // =========================================================================
    // STATE & CACHES
    // =========================================================================
    const setWeatherTemp = makeTextSetter(weatherTempWidget)
    const setWeatherCond = makeTextSetter(weatherCondWidget)
    const setWeatherRange = makeTextSetter(weatherRangeWidget)
    const setSunriseText = makeTextSetter(sunriseTextWidget)
    const setSunsetText = makeTextSetter(sunsetTextWidget)
    const setBatteryText = makeTextSetter(batteryTextWidget)

    let lastHourStr = ''
    let lastMinStr = ''
    let lastDateStr = ''
    let lastBatteryLevel = -1
    let lastBatteryBarW = -1
    let lastPoseId = 1
    let lastCursorVisible = null

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

    const state = {
      battery: 100,
      steps: 0,
      calories: 0,
      heartRate: 0,
      stress: 0,
      pai: 0,
      sleepScore: 0,
      exerciseMins: 0
    }

    let isAwake = true
    let minuteTick = 0

    // -------------------------------------------------------------------------
    // Vault Boy pose (cheap: only compares cached values)
    // -------------------------------------------------------------------------
    const updatePose = () => {
      let targetPose = 1
      if (state.pai > 130) {
        targetPose = 8
      } else if (state.heartRate > 100) {
        targetPose = 7
      } else if (state.calories > 1000) {
        targetPose = 9 // Nuka-Cola pose
      } else if (state.exerciseMins > 60) {
        targetPose = 6
      } else if (state.steps > 8000) {
        targetPose = 5
      } else if (state.stress > 75) {
        targetPose = 4
      } else if (state.battery < 25) {
        targetPose = 3
      } else if (state.sleepScore > 80) {
        targetPose = 2
      }

      if (targetPose !== lastPoseId) {
        lastPoseId = targetPose
        vaultBoyWidget.setProperty(prop.MORE, {
          src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_${pad(targetPose)}.png`
        })
      }
    }

    // -------------------------------------------------------------------------
    // FAST PATH: sensor callbacks (steps, calories, HR, stress, PAI)
    // -------------------------------------------------------------------------
    const updateFast = () => {
      let steps
      let calories
      let heartRate
      let stress
      let pai
      let calMax = 1000 // Original 1000 kcal scale preserved

      if (IS_STORE_SCREENSHOT_MODE) {
        steps = SCREENSHOT_MOCK.steps
        calories = SCREENSHOT_MOCK.calories
        heartRate = SCREENSHOT_MOCK.heartRate
        stress = SCREENSHOT_MOCK.stress
        pai = SCREENSHOT_MOCK.pai
        calMax = 1000  // Preserves original 160 / 1200 screenshot ratio
      } else {
        steps = stepSensor ? safe(() => toNumeric(stepSensor.getCurrent?.(), 0), 0) : 0
        calories = calorieSensor ? safe(() => toNumeric(calorieSensor.getCurrent?.(), 0), 0) : 0
        heartRate = hrSensor
          ? safe(() => {
              const currentHr = typeof hrSensor.getCurrent === 'function' ? toNumeric(hrSensor.getCurrent(), 0) : 0
              const lastHr = typeof hrSensor.getLast === 'function' ? toNumeric(hrSensor.getLast(), 0) : 0
              return currentHr > 0 ? currentHr : (lastHr > 0 ? lastHr : 70)
            }, 0)
          : 0
        stress = stressSensor ? safe(() => toNumeric(stressSensor.getCurrent?.(), 0), 0) : 0
        pai = paiSensor
          ? safe(() => {
              if (typeof paiSensor.getTotal === 'function') return toNumeric(paiSensor.getTotal(), 0)
              if (typeof paiSensor.getTotalPAI === 'function') return toNumeric(paiSensor.getTotalPAI(), 0)
              return 0
            }, 0)
          : 0
      }

      state.steps = steps
      state.calories = calories
      state.heartRate = heartRate
      state.stress = stress
      state.pai = pai

      // STEPS (0 - 8000, bar chunked every 100)
      if (steps !== lastStepCount) {
        lastStepCount = steps
        stepsGauge.setText(String(steps))
        const stepChunk = Math.floor(steps / 100)
        if (stepChunk !== lastStepChunk) {
          lastStepChunk = stepChunk
          stepsGauge.setRatio(steps / 8000)
        }
      }

      // CAL (0 - 600, bar chunked every 25)
      if (calories !== lastCalCount) {
        lastCalCount = calories
        calGauge.setText(String(calories))
        const calChunk = Math.floor(calories / 25)
        if (calChunk !== lastCalChunk) {
          lastCalChunk = calChunk
          calGauge.setRatio(calories / calMax)
        }
      }

      // BPM (40 - 160, bar chunked every 5)
      if (heartRate !== lastHrValue) {
        lastHrValue = heartRate
        bpmGauge.setText(String(heartRate))
        const hrChunk = Math.floor(heartRate / 5)
        if (hrChunk !== lastHrChunk) {
          lastHrChunk = hrChunk
          bpmGauge.setRatio((heartRate - 40) / 120)
        }
      }

      // STRESS (0 - 100, bar chunked every 5)
      if (stress !== lastStressValue) {
        lastStressValue = stress
        stressGauge.setText(String(stress))
        const stressChunk = Math.floor(stress / 5)
        if (stressChunk !== lastStressChunk) {
          lastStressChunk = stressChunk
          stressGauge.setRatio(stress / 100)
        }
      }

      // PAI (0 - 130, bar chunked every 5)
      if (pai !== lastPaiValue) {
        lastPaiValue = pai
        paiGauge.setText(String(pai))
        const paiChunk = Math.floor(pai / 5)
        if (paiChunk !== lastPaiChunk) {
          lastPaiChunk = paiChunk
          paiGauge.setRatio(pai / 130)
        }
      }

      updatePose()
    }

    // -------------------------------------------------------------------------
    // SLOW PATH: weather, sunrise/sunset, sleep score, exercise minutes
    // Runs on resume and every 10 minutes while the screen is awake.
    // -------------------------------------------------------------------------
    const updateSlow = () => {
      if (IS_STORE_SCREENSHOT_MODE) {
        setWeatherTemp(SCREENSHOT_MOCK.temp)
        setWeatherCond(SCREENSHOT_MOCK.cond)
        setWeatherRange(SCREENSHOT_MOCK.range)
        setSunriseText(SCREENSHOT_MOCK.sunrise)
        setSunsetText(SCREENSHOT_MOCK.sunset)
        updatePose()
        return
      }

      state.sleepScore = sleepSensor
        ? safe(() => {
            const sleepInfo = typeof sleepSensor.getInfo === 'function' ? sleepSensor.getInfo() : null
            return sleepInfo && typeof sleepInfo.score === 'number' ? sleepInfo.score : 0
          }, 0)
        : 0

      state.exerciseMins = fatBurnSensor
        ? safe(() => toNumeric(fatBurnSensor.getCurrent?.(), 0), 0)
        : 0

      try {
        const wData = weatherSensor?.getForecast?.()
        const today = wData?.forecastData?.data?.[0]
        const tideToday = wData?.tideData?.data?.[0]

        if (tideToday?.sunrise && tideToday?.sunset) {
          setSunriseText(`${pad(tideToday.sunrise.hour)}:${pad(tideToday.sunrise.minute)}`)
          setSunsetText(`${pad(tideToday.sunset.hour)}:${pad(tideToday.sunset.minute)}`)
        }

        if (today) {
          const hasHighLow = typeof today.high === 'number' && typeof today.low === 'number'
          const tempVal = today.cur ?? wData?.cur ?? (hasHighLow ? Math.round((today.high + today.low) / 2) : today.high)
          const statusStr = WEATHER_STATUS[today.index] || 'NO-SYNC'

          setWeatherTemp(tempVal !== undefined ? `${tempVal}°C` : '--°C')
          setWeatherCond(statusStr)
          setWeatherRange(hasHighLow ? `${today.low}°C/${today.high}°C` : '--°C/--°C')
        }
      } catch (err) {
        console.log('Weather error:', err)
      }

      updatePose()
    }

    // -------------------------------------------------------------------------
    // Seconds ticker (only drives the cursor blink)
    // -------------------------------------------------------------------------
    const updateSeconds = () => {
      const visible = timeSensor.getSeconds() % 2 === 0
      if (visible !== lastCursorVisible) {
        lastCursorVisible = visible
        timeCursor.setProperty(prop.VISIBLE, visible)
      }
    }

    // -------------------------------------------------------------------------
    // Time & date
    // -------------------------------------------------------------------------
    const updateTime = () => {
      let hours
      let mins
      let dayName
      let dateStr

      if (IS_STORE_SCREENSHOT_MODE) {
        hours = SCREENSHOT_MOCK.hours
        mins = SCREENSHOT_MOCK.mins
        dayName = SCREENSHOT_MOCK.dayName
        dateStr = SCREENSHOT_MOCK.dateStr
      } else {
        hours = pad(timeSensor.getHours())
        mins = pad(timeSensor.getMinutes())
        const dayIdx = timeSensor.getDay ? timeSensor.getDay() % 7 : new Date().getDay()
        const dateNum = timeSensor.getDate ? timeSensor.getDate() : new Date().getDate()
        const monthIdx = timeSensor.getMonth ? (timeSensor.getMonth() - 1) % 12 : new Date().getMonth()
        dayName = DAYS[dayIdx]
        dateStr = `${pad(dateNum)} ${MONTHS[monthIdx]}`
      }

      if (hours !== lastHourStr) {
        lastHourStr = hours
        hourWidget.setProperty(prop.TEXT, hours)
      }

      if (mins !== lastMinStr) {
        lastMinStr = mins
        minuteWidget.setProperty(prop.TEXT, mins)
      }

      const fullDateKey = `${dayName}_${dateStr}`
      if (fullDateKey !== lastDateStr) {
        lastDateStr = fullDateKey
        dayWidget.setProperty(prop.TEXT, dayName)
        dateNumWidget.setProperty(prop.TEXT, dateStr)
      }
    }

    // -------------------------------------------------------------------------
    // Battery
    // -------------------------------------------------------------------------
    const updateBattery = () => {
      const level = IS_STORE_SCREENSHOT_MODE
        ? SCREENSHOT_MOCK.battery
        : (batterySensor && typeof batterySensor.getCurrent === 'function'
            ? safe(() => toNumeric(batterySensor.getCurrent(), 100), 100)
            : 100)

      state.battery = level

      if (level === lastBatteryLevel) return
      lastBatteryLevel = level

      const maxWidth = LEFT_COL_W - 2
      const currentBarWidth = Math.max(1, Math.round((level / 100) * maxWidth))

      if (currentBarWidth !== lastBatteryBarW) {
        lastBatteryBarW = currentBarWidth
        // FILL_RECT requires prop.MORE with full geometry in Zepp OS
        batteryBarFill.setProperty(prop.MORE, {
          x: LEFT_COL_X + 1,
          y: DATA_Y_MODULE_HELPER + 149,
          w: currentBarWidth,
          h: 8,
          color: GLOW_NEON_COLOR
        })
      }

      setBatteryText(`${level}%`)
      updatePose()
    }

    const refreshAll = () => {
      updateTime()
      updateSeconds()
      updateBattery()
      updateFast()
      updateSlow()
    }

    const onMinute = () => {
      updateTime()
      if (isAwake) {
        minuteTick += 1
        if (minuteTick % 10 === 0) updateSlow()
      }
    }

    // -------------------------------------------------------------------------
    // Seconds timer (only runs while the screen is awake)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Sensor callbacks (only bound while the screen is awake)
    // -------------------------------------------------------------------------
    let sensorsBound = false
    const bindSensors = () => {
      if (sensorsBound) return
      sensorsBound = true
      if (batterySensor && typeof batterySensor.onChange === 'function') batterySensor.onChange(updateBattery)
      if (stepSensor && typeof stepSensor.onChange === 'function') stepSensor.onChange(updateFast)
      if (calorieSensor && typeof calorieSensor.onChange === 'function') calorieSensor.onChange(updateFast)
      if (hrSensor && typeof hrSensor.onCurrentChange === 'function') hrSensor.onCurrentChange(updateFast)
      if (stressSensor && typeof stressSensor.onChange === 'function') stressSensor.onChange(updateFast)
    }
    const unbindSensors = () => {
      if (!sensorsBound) return
      sensorsBound = false
      if (batterySensor && typeof batterySensor.offChange === 'function') batterySensor.offChange(updateBattery)
      if (stepSensor && typeof stepSensor.offChange === 'function') stepSensor.offChange(updateFast)
      if (calorieSensor && typeof calorieSensor.offChange === 'function') calorieSensor.offChange(updateFast)
      if (hrSensor && typeof hrSensor.offCurrentChange === 'function') hrSensor.offCurrentChange(updateFast)
      if (stressSensor && typeof stressSensor.offChange === 'function') stressSensor.offChange(updateFast)
    }

    refreshAll()
    startSecondTicker()
    bindSensors()

    createWidget(widget.WIDGET_DELEGATE, {
      resume_call: () => {
        isAwake = true
        refreshAll()
        startSecondTicker()
        bindSensors()
      },
      pause_call: () => {
        isAwake = false
        stopSecondTicker()
        unbindSensors()
      }
    })

    timeSensor.onPerMinute(onMinute)

    this.sensors = { timeSensor }
    this.handlers = { onMinute, stopSecondTicker, unbindSensors }
  },

  onDestroy() {
    if (this.handlers && this.sensors) {
      const { timeSensor } = this.sensors
      const { onMinute, stopSecondTicker, unbindSensors } = this.handlers

      stopSecondTicker()
      unbindSensors()

      if (timeSensor && typeof timeSensor.offPerMinute === 'function') {
        timeSensor.offPerMinute(onMinute)
      }
    }
    console.log('Pip-Boy Mini-3000 destroyed.')
  }
})