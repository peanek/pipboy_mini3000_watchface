# Pip-Boy Mini-3000

Retro CRT terminal watchface designed for Zepp OS (480x480 circular displays), featuring a radioactive green and mint aesthetic inspired by the Fallout series. Optimized and verified for the Amazfit T-Rex 3, T-Rex 3 Pro, and Amazfit Balance.

---

## Features & Core Functions

* **CRT Terminal Aesthetic:** Styled with high-glow radioactive mint (`#D0FFAA`) and neon green (`#39FF14`) text, complete with a 1Hz blinking terminal cursor (`_`).
* **Dynamic Vault Boy Status Poses:** The central character dynamically shifts poses based on real-time biometric and system telemetry:
  * **Pose 1 (Normal):** Default resting state.
  * **Pose 2 (Thumbs Up):** Sleep score greater than 80.
  * **Pose 3 (Tired):** Battery level less than 25%.
  * **Pose 4 (Stressed):** Stress level greater than 75.
  * **Pose 5 (Running):** Daily steps greater than 8,000.
  * **Pose 6 (Bodybuilder):** Exercise duration greater than 60 mins.
  * **Pose 7 (Combat):** Heart rate greater than 100 BPM.
  * **Pose 8 (High PAI (on high)):** PAI score greater than 130.
  * **Pose 9 (Nuka-Cola):** Burned calories greater than 1,500.
* **Live Telemetry & Weather:** Real-time sync for step count, heart rate, stress, PAI, battery status, and official Zepp OS weather indexing (including descriptive states like *Overcast*, *Sleet*, and *Downpour*).
* **Always-On Display (AOD):** Clean, battery-safe minimalist AOD mode displaying hours, minutes, and date on a pure black AMOLED background.

---

## Assets & Design Resources

* **Font:** Monofonto ([dafont.com](https://www.dafont.com/monofonto.font)) / Fallout terminal font family.
* **Theme Colors:** 
  * Core Glow: `#D0FFAA`
  * Neon Accent: `#39FF14`
  * Frame Lines: `#009900`
* **References & Documentation:**
  * [Zepp OS Quick Start Guide](https://docs.zepp.com/docs/watchface/watchface-quick-start/)
  * [Zepp OS Color World Sample](https://docs.zepp.com/docs/samples/watchface/colorWorld/)
  * [Amazfit Watchfaces Forum](https://amazfitwatchfaces.com/forum/viewtopic.php?t=4132)

---

## Submission & Project Status

* **Current Version:** `0.1.0` (Code `1`)
* **Store Status:** Configured for multi-device support (`app.json` mapped across T-Rex 3, T-Rex 3 Pro, and Balance platforms). Prepared for initial submission to the official Zepp App Store.

---

## Future Roadmap (Version 0.2.0+)

* Integration of Sunrise and Sunset time telemetry.
* Additional "RADS" / UV Index / AQI data module stack.
* Expanded Vault Boy reactive animation states.