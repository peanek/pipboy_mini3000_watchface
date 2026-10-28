- [1. pipboy\_watchface](#1-pipboy_watchface)
  - [1.1. some important project decision making process](#11-some-important-project-decision-making-process)
    - [1.1.1. Fonts](#111-fonts)
    - [1.1.2. background used](#112-background-used)


# 1. pipboy_watchface
Watchface for Amazfit T-Rex 3

## 1.1. some important project decision making process 

### 1.1.1. Fonts 

https://www.dafont.com/monofonto.font

OR 

https://fallout.fandom.com/wiki/Fonts_in_the_Fallout_series

### 1.1.2. background used



(https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/61e07e82-bace-438d-bfe2-5860d271e83d/d9fonrk-044f54a6-a4d9-4f76-9424-a390dbea4889.jpg/v1/fill/w_670,h_1192,q_70,strp/fallout_pipboy_lg_g3_background_by_blackmetalcc_d9fonrk-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTQyMyIsInBhdGgiOiIvZi82MWUwN2U4Mi1iYWNlLTQzOGQtYmZlMi01ODYwZDI3MWU4M2QvZDlmb25yay0wNDRmNTRhNi1hNGQ5LTRmNzYtOTQyNC1hMzkwZGJlYTQ4ODkuanBnIiwid2lkdGgiOiI8PTgwMCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.TJi7nFHzKM8ErjaGRBvD3Kzc536-VIFKYSxJq3DLsVA)

----------------

Phases of the development : 

1. we started with changing background options - need to generate one more or two more which connect perfectly with background of 

2. Data assons
   2.1 Hour/minute
   2.2 day of month, day of week
   2.3 PWR meter with dinamic changed power gauge on with of the bar + 01/100 power indicator

3. Vault Boy main centered icon with different states : 

The 8 Vault Boy States
Pose 1 (Normal): Default resting state (vault_boy_1.png)

Pose 2 (Thumbs Up): Sleep score > 80 (vault_boy_2.png)

Pose 3 (Tired / Low Battery): Battery < 25% (vault_boy_3.png)

Pose 4 (Stressed): Stress > 75 (vault_boy_4.png)

Pose 5 (Running / Steps): Steps > 8,000 (vault_boy_5.png)

Pose 6 (Bodybuilder / Exercise): Exercise > 30 mins (vault_boy_6.png) 170 x 120

Pose 7 (Combat / High BPM): Heart Rate > 100 BPM (vault_boy_7.png)

Pose 8 (high / on drugs - like psycho or jet)) > PAI more than 130 -> 170 x 129


TBC