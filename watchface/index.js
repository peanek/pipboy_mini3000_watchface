import { createWidget, widget, prop, show_level, align, data_type } from '@zos/ui'
import { Time, Battery, Step, HeartRate, Stress, Sleep, Pai, Calorie, FatBurning, Weather } from '@zos/sensor'

const ROOT_IMAGES_PATH = 'images/'
const PIPBOY_FONT = 'fonts/gothic821.ttf'

// Color Palette
const GLOW_AMBIENT_IMG = `${ROOT_IMAGES_PATH}bg/glow_ambient.png`
const FRAME_COLOR = 0x009900      // CRT structural outlines and labels
const GLOW_CORE_COLOR = 0xD0FFAA    // Intense "hot core" for values (19, 51, 1000, 39, etc.)
const GLOW_NEON_COLOR = 0x39FF14    // Native glowing green for secondary texts/badges

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
  'CLOUDY',     // 0: Cloudy
  'SHOWER',     // 1: Shower
  'SNOW-SHWR',  // 2: Snow shower
  'CLEAR',      // 3: Sunny / Clear
  'OVERCAST',   // 4: Overcast (Was previously mapped to STORM!)
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

// Reusable helper for the 5 Pip-Boy limb gauges (Includes automatic backdrop glow!)
const createLimbGauge = (label, x, y, initialText = '0') => {
  const boxW = 64
  const barX = x + 7
  const barY = y + 20
  const fillX = x + 8
  const fillY = y + 21
  const textY = y + 28

  // 0. Automatic Ambient Glow directly behind this specific gauge (Larger & Brighter!)
  createWidget(widget.IMG, {
    x: x - 28,
    y: y - 18,
    w: boxW + 56, // 120px wide (compensates for transparent PNG padding)
    h: 92,        // 92px tall
    src: GLOW_AMBIENT_IMG,
    auto_scale: true,
    alpha: 135,   // Boosted from 65 -> 135 so the bloom actually pops!
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
    color: 0x003300,
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
    // MASTER LAYOUT ANCHORS (Shifted left to x: 56 for clean container framing)
    // =========================================================================
    const LEFT_COL_X = 62   // Shifted 6px right for cleaner breathing room
    const LEFT_COL_W = 96   // Uniform width (96px) for Date/Weather/PWR modules
    const FRAME_RIGHT_X = 168 // Right vertical wall X coordinate

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
        },
        {
          id: 5,
          preview: `${ROOT_IMAGES_PATH}bg/bg_05.png`,
          path: `${ROOT_IMAGES_PATH}bg/bg_05.png`
        }
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
    // LAYER: ATMOSPHERIC AMBIENT GLOW BACKDROPS (Place behind HUD)
    // =========================================================================

    // 1. Clock Container Glow (Expanded & brightened to bleed across the whole box)
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

    // 2. Data Container Glow (Expanded & brightened)
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

    // 3. Vault Boy Center Screen Ambient Glow
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
    // RIGHT SIDE: VAULT BOY MASCOT + 5 TIGHT LIMB TELEMETRY GAUGES
    // =========================================================================
    const vaultBoyWidget = createWidget(widget.IMG, {
      x: VB_X,
      y: VB_Y - 30,
      w: 130,
      h: 170,
      src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_01.png`,
      show_level: show_level.ONLY_NORMAL
    })

    // All 5 gauges are anchored tightly around Vault Boy (VB_X, VB_Y)
    const stressGauge = createLimbGauge('STRESS', VB_X + 28, VB_Y - 85, '0')  // Head
    const calGauge    = createLimbGauge('CAL',    VB_X - 56, VB_Y + 12, '0')  // Left Arm
    const bpmGauge    = createLimbGauge('BPM',    VB_X + 118, VB_Y + 12, '--')// Right Arm
    const stepsGauge  = createLimbGauge('STEPS',  VB_X - 18, VB_Y + 140, '0') // Left Leg
    const paiGauge    = createLimbGauge('PAI',    VB_X + 74, VB_Y + 140, '0') // Right Leg

    // =========================================================================
    // LEFT SIDE: TOP CONTAINER [TIME] (Aligned Outer Lines + Extended Inner Wing)
    // =========================================================================

    // TIME Container - Line 1: Top Horizontal Line
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 28,
      y: 62,
      w: FRAME_RIGHT_X - LEFT_COL_X - 28,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // TIME Container - Line 2: Right Vertical Wall (Starts at y: 62, height +10px to 153)
    createWidget(widget.FILL_RECT, {
      x: FRAME_RIGHT_X,
      y: 62,
      w: 3,
      h: 153,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // TIME Container - Line 3: Bottom Horizontal Line (Extended to x: 12, ~5px from bezel edge!)
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
      y: 215, // Use y: 212, h: 3 if you want to replace Line 3 instead of sitting between the lines
      w: SEC_BAR_MAX_W,
      h: 4,
      color: 0x003300,
      show_level: show_level.ONLY_NORMAL
    })

    // 'TIME' Label: Moved to the newly opened far-left wing above the line!
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

    // Blinking Terminal Cursor next to 'TIME' (x: 16..46 is 'TIME', so x: 48 sits right after it)
    const timeCursor = createWidget(widget.FILL_RECT, {
      x: 44,
      y: 204, // Aligns with the baseline of the 'TIME' label (or use y: 196, w: 7, h: 12 for a full-height terminal block!)
      w: 9,
      h: 3,
      color: GLOW_CORE_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 3. Time Display (Centered inline with DATA values/bars & enlarged to 90px)
    const hourWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 4,
      y: 66,
      w: LEFT_COL_W,
      h: 72,
      color: GLOW_CORE_COLOR,
      text_size: 90,
      bold: false,
      align_h: align.CENTER_H, // Centered inline with the 96px DATA bars below!
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    const minuteWidget = createWidget(widget.TEXT, {
      x: LEFT_COL_X + 4,
      y: 136,
      w: LEFT_COL_W,
      h: 72,
      color: GLOW_CORE_COLOR,
      text_size: 90,
      bold: false,
      align_h: align.CENTER_H, // Centered inline with the 96px DATA bars below!
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
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // DATA Container - Line 2: Right Vertical Wall
    createWidget(widget.FILL_RECT, {
      x: FRAME_RIGHT_X,
      y: 220,
      w: 3,
      h: 179, // Runs down to y: 398
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // DATA Container - Line 3: Bottom Horizontal Line (Aligned at x: 62, matching top TIME line)
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 8,
      y: 396,
      w: FRAME_RIGHT_X - LEFT_COL_X - 6,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 'DATA' Label: Moved to the far-left wing right below the top DATA line!
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
      y: DATA_Y_MODULE_HELPER -2 ,
      w: LEFT_COL_W,
      h: 20,
      color: 0x000000,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '------',
      show_level: show_level.ONLY_NORMAL
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

    // 6. Power (PWR) Module at Bottom of DATA Container (Clean & perfectly spaced)
    createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 124,
      w: 42,
      h: 18,
      color: 0x39ff14,
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
      color: 0x003300,
      show_level: show_level.ONLY_NORMAL
    })

    const batteryBarFill = createWidget(widget.FILL_RECT, {
      x: LEFT_COL_X + 1,
      y: DATA_Y_MODULE_HELPER + 149,
      w: LEFT_COL_W - 2,
      h: 8,
      color: 0x39ff14,
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // RIGHT SIDE: [ENV] CONTAINER WITH RIGHT-HAND LABEL WING
    // Mirrors TIME & DATA: Inner box (x: 180..396) + Right wing for 'ENV' label
    // =========================================================================
    const ENV_X = 177
    const ENV_Y = 345
    const ENV_W = 216          // Inner data box width (x: 180 -> x: 396)
    const ENV_H = 74           // Runs y: 340 -> y: 414
    const ENV_WALL_R = ENV_X + ENV_W - 3 // Right vertical wall at x: 393

    // Ambient glow behind ENV container
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

    // 1. Top Horizontal Line (Continuous from x: 180 out to right bezel x: 444!)
    createWidget(widget.FILL_RECT, {
      x: ENV_X,
      y: ENV_Y,
      w: 270,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 2. Left Vertical Wall (x: 180)
    createWidget(widget.FILL_RECT, {
      x: ENV_X,
      y: ENV_Y,
      w: 3,
      h: ENV_H,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 4. Bottom Horizontal Line (Extends slightly past right wall to x: 416 to follow bezel curve)
    createWidget(widget.FILL_RECT, {
      x: ENV_X,
      y: ENV_Y + ENV_H - 3,
      w: 216,
      h: 3,
      color: FRAME_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    // 'ENV' Label: Tucked inside the right-hand wing under the top line (mirrors 'DATA' on the left!)
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
    const ROW1_Y = ENV_Y + 12

    // 'SUN' Badge
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

    // Sunrise Icon (sun_rise.png)
    createWidget(widget.IMG, {
      x: ENV_X + 58,
      y: ROW1_Y + 1,
      w: 16,
      h: 16,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}icons/sun_rise.png`,
      show_level: show_level.ONLY_NORMAL
    })

    const sunriseTextWidget = createWidget(widget.TEXT, {
      x: ENV_X + 76,
      y: ROW1_Y - 2,
      w: 54,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--:--',
      show_level: show_level.ONLY_NORMAL
    })

    // Sunset Icon (sun_set.png)
    createWidget(widget.IMG, {
      x: ENV_X + 134,
      y: ROW1_Y + 1,
      w: 16,
      h: 16,
      auto_scale: true,
      src: `${ROOT_IMAGES_PATH}icons/sun_set.png`,
      show_level: show_level.ONLY_NORMAL
    })

    const sunsetTextWidget = createWidget(widget.TEXT, {
      x: ENV_X + 152,
      y: ROW1_Y - 2,
      w: 54,
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
    // ROW 2: [RAD] 02 UV   +   [AIR] 24 OK
    // -------------------------------------------------------------------------
    const ROW2_Y = ENV_Y + 42

    // 'RAD' Badge
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

    const radTextWidget = createWidget(widget.TEXT, {
      x: ENV_X + 54,
      y: ROW2_Y - 2,
      w: 56,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '-- UV',
      show_level: show_level.ONLY_NORMAL
    })

    // 'AIR' Badge
    createWidget(widget.FILL_RECT, {
      x: ENV_X + 114,
      y: ROW2_Y,
      w: 38,
      h: 18,
      color: GLOW_NEON_COLOR,
      show_level: show_level.ONLY_NORMAL
    })

    createWidget(widget.TEXT, {
      x: ENV_X + 114,
      y: ROW2_Y - 1,
      w: 38,
      h: 18,
      color: 0x000000,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: 'AIR',
      show_level: show_level.ONLY_NORMAL
    })

    const airTextWidget = createWidget(widget.TEXT, {
      x: ENV_X + 156,
      y: ROW2_Y - 2,
      w: 52,
      h: 22,
      color: GLOW_CORE_COLOR,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--',
      show_level: show_level.ONLY_NORMAL
    })

    // =========================================================================
    // INTERACTIVE TOUCH BUTTONS (Invisible Overlays for Quick Access)
    // =========================================================================
    
    // Native Watchface Shortcut: Tap Hours/Minutes to open System Alarms
    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: 72,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 140,
      type: data_type.ALARM_CLOCK,
      show_level: show_level.ONLY_NORMAL
    })

    // Native Watchface Shortcut: Tap Date to open Calendar
    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 40,
      type: data_type.SUN_CURRENT,
      show_level: show_level.ONLY_NORMAL
    })

    // Native Watchface Shortcut: Tap TEMP module to open Weather App
    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 40,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 65,
      type: data_type.WEATHER,
      show_level: show_level.ONLY_NORMAL
    })

    // Native Watchface Shortcut: Tap PWR module to open Battery Settings
    createWidget(widget.IMG_CLICK, {
      x: LEFT_COL_X,
      y: DATA_Y_MODULE_HELPER + 122,
      w: FRAME_RIGHT_X - LEFT_COL_X,
      h: 36,
      type: data_type.BATTERY,
      show_level: show_level.ONLY_NORMAL
    })

    // Tap Vault Boy to open your main Vitals / Activity screen
    const vbClickWidget = createWidget(widget.IMG_CLICK, {
      x: VB_X,
      y: VB_Y,
      w: 130,
      h: 170,
      type: data_type.HEART,
      show_level: show_level.ONLY_NORMAL
    })


    // =========================================================================
    // ALWAYS-ON DISPLAY (AOD) WIDGETS (Pure black background, low-power green)
    // =========================================================================
    const aodTimeWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 155,
      w: 480,
      h: 100,
      color: GLOW_NEON_COLOR, // Or FRAME_COLOR (0x009900) for an even dimmer night-friendly glow
      text_size: 92,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '--:--',
      show_level: show_level.ONAL_AOD
    })

    const aodDateWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 260,
      w: 480,
      h: 40,
      color: FRAME_COLOR,
      text_size: 28,
      bold: true,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      font: PIPBOY_FONT,
      text: '------ -- ---',
      show_level: show_level.ONAL_AOD
    })


    // =========================================================================
    // STATE & TELEMETRY CACHES (For Efficient Updates)
    // =========================================================================

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
        
        // --- Sunrise & Sunset Telemetry ---
        const tideToday = weatherSensor?.getForecast?.()?.tideData?.data?.[0]

        if (tideToday?.sunrise && tideToday?.sunset) {
          sunriseTextWidget.setProperty(prop.MORE, {
            text: `${pad(tideToday.sunrise.hour)}:${pad(tideToday.sunrise.minute)}`
          })
          sunsetTextWidget.setProperty(prop.MORE, {
            text: `${pad(tideToday.sunset.hour)}:${pad(tideToday.sunset.minute)}`
          })
        }

        // --- RAD (UV Index) & AIR (AQI) Telemetry ---
        const uvVal = today?.uvIndex ?? wData?.uvIndex
        const aqiVal = today?.aqi ?? wData?.aqi

        radTextWidget.setProperty(prop.MORE, {
          text: uvVal !== undefined ? `${pad(uvVal)} UV` : '02 UV'
        })
        airTextWidget.setProperty(prop.MORE, {
          text: aqiVal !== undefined ? `${aqiVal} OK` : '24 OK'
        })

        if (today) {
          const hasHighLow = typeof today.high === 'number' && typeof today.low === 'number'
          const tempVal = today.cur ?? wData?.cur ?? (hasHighLow ? Math.round((today.high + today.low) / 2) : today.high)
          const statusStr = WEATHER_STATUS[today.index] || 'NO-SYNC'

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

      // =========================================================================
      // [SCREENSHOT OVERRIDE: TELEMETRY & WEATHER] - Active for store preview!
      // =========================================================================
      // steps = 7450            // Triggers > 8000 running pose
      // calories = 520         // Triggers > 1500 Nuka-Cola pose (Pose 9)
      // heartRate = 60          // Realistic resting BPM
      // stress = 10             // Normal stress level
      // pai = 85                // Active PAI score
      // battery = 85            // 85% PWR bar
      // exerciseMins = 10       // Exercise mins
      // sleepScore = 88         // Sleep score
      // // Force mock weather display values for clean store preview:
      // weatherTempWidget.setProperty(prop.MORE, { text: '10°C' })
      // weatherCondWidget.setProperty(prop.MORE, { text: 'SUNNY' })
      // weatherRangeWidget.setProperty(prop.MORE, { text: '14°C/24°C' })
      // sunriseTextWidget.setProperty(prop.MORE, { text: '06:25' })
      // sunsetTextWidget.setProperty(prop.MORE, { text: '17:55' })
      // radTextWidget.setProperty(prop.MORE, { text: '02 UV' })
      // airTextWidget.setProperty(prop.MORE, { text: '57 PR' })

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

      // Evaluate Vault Boy Pose (Supports 01-09 and 10+ automatically via pad())
      let targetPose = 1
      if (pai > 130) {
        targetPose = 8
      } else if (heartRate > 100) {
        targetPose = 7
      } else if (calories > 1500) {
        targetPose = 9 // Nuka-Cola pose when calories > 1500!
      } else if (exerciseMins > 60) {
        targetPose = 6
      } else if (steps > 8000) {
        targetPose = 5
      } else if (stress > 75) {
        targetPose = 4
      } else if (battery < 25) {
        targetPose = 3
      } else if (sleepScore > 80) {
        targetPose = 2
      }

      if (targetPose !== lastPoseId) {
        lastPoseId = targetPose
        vaultBoyWidget.setProperty(prop.MORE, {
          src: `${ROOT_IMAGES_PATH}vault_boy/vault_boy_${pad(targetPose)}.png`
        })
      }
    }

    let lastSecVal = -1

    const updateSeconds = () => {
      const secs = timeSensor.getSeconds()
      if (secs !== lastSecVal) {
        lastSecVal = secs
        // 1. TIME cursor blink: Toggle visibility every second
        timeCursor.setProperty(prop.VISIBLE, secs % 2 === 0)
      }
    }

    const updateTime = () => {
      // =========================================================================
      // [SCREENSHOT OVERRIDE: TIME & DATE] - Locked to 10:09 for store!
      // =========================================================================
      // let hours = '10'
      // let mins = '09'
      // let dayName = 'SUNDAY'
      // let dateStr = '01 NOV'

      // (If you want live time back later, comment out the 4 lines above and uncomment:)
      let hours = pad(timeSensor.getHours())
      let mins = pad(timeSensor.getMinutes())
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      const dayIdx = timeSensor.getDay ? timeSensor.getDay() % 7 : new Date().getDay()
      const dateNum = timeSensor.getDate ? timeSensor.getDate() : new Date().getDate()
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      const monthIdx = timeSensor.getMonth ? (timeSensor.getMonth() - 1) % 12 : new Date().getMonth()
      dayName = days[dayIdx]
      dateStr = `${pad(dateNum)} ${months[monthIdx]}`

      if (hours !== lastHourStr) {
        lastHourStr = hours
        hourWidget.setProperty(prop.MORE, { text: hours })
      }

      if (mins !== lastMinStr) {
        lastMinStr = mins
        minuteWidget.setProperty(prop.MORE, { text: mins })
      }

      aodTimeWidget.setProperty(prop.MORE, { text: `${hours}:${mins}` })

      const fullDateKey = `${dayName}_${dateStr}`
      if (fullDateKey !== lastDateStr) {
        lastDateStr = fullDateKey
        dayWidget.setProperty(prop.MORE, { text: dayName })
        dateNumWidget.setProperty(prop.MORE, { text: dateStr })
        // Update AOD Date
        aodDateWidget.setProperty(prop.MORE, { text: `${dayName}  ${dateStr}` })
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
        y: DATA_Y_MODULE_HELPER + 149,
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