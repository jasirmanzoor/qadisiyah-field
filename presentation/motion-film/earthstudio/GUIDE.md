# Rendering the real-3D drone shot in Google Earth Studio (about 10 minutes of your time)

The file **AutoLink-Drone.esp** is the reel's exact drone flight, keyed frame by frame (35 s, 1,051 frames):

| Time | Shot |
|---|---|
| 0–8 s | Low crane up and around the KAFD towers, then it turns east |
| 8–13 s | High transit towards Al Qadisiyah |
| 13–15 s | Bird's-eye view over Al Qadisiyah |
| 17–20 s | Dive to about 80 m and a low pass along the showroom rows |
| 21.6–23 s | Pull-up, where the showroom light-columns rise |
| 23–27.8 s | Transit south to Al Shifa, then the bird's-eye view |
| 29.6–32 s | Low pass |
| 33.4–35 s | Pull-up |

Altitudes are already corrected for Riyadh's real ground height, which is 580–650 m above sea level.

## Steps (Chrome on a Mac or Windows laptop)

1. Open **https://earth.google.com/studio** in Chrome and sign in with your Google account. The first time, Google may ask you to accept the terms or request access.
2. On the start page choose **Blank Project**, then use **File → Import** (or drag `AutoLink-Drone.esp` onto the page).
3. Press play once. You should see KAFD from the west at low altitude, turning around the towers. The shaded side bars mark the edges of the frame.
4. Click **Render** at the top right:
   - **Cloud render → Video (.mp4)** is best. Google renders it on its servers and emails you a download link. You can close the laptop meanwhile.
   - **Dimensions: 3840 × 2160.** It is already set in the file; leave it. 4K gives much sharper buildings, and I scale it down.
   - **Attribution:** leave it on, in the default place. Google requires it, and I keep it visible in the reel.
   - **Map style:** none, so no labels or roads.
5. Also click **File → Export → 3D Tracking Data… → JSON** and keep that small file. It lets me pin the showroom light-columns, labels and bars exactly onto the real footage.
6. Send me both files: the **.mp4** and the **.json**. Large files go through Google Drive. Share the Drive link or upload it there, and I'll pull it directly.

## If the import is rejected

Tell me the exact message. As a fallback, you can type the key poses below in a Blank Project:

1. Move the playhead to the time.
2. Click each value in the attribute list and type it in.
3. Repeat for the next time.

Earth Studio smooths between the keyframes.

| t (s) | Latitude | Longitude | Altitude (m) | Pan | Tilt |
|---|---|---|---|---|---|
| 0.0 | 24.75821 | 46.62882 | 712 | 64.4 | 93.5 |
| 2.7 | 24.76899 | 46.63080 | 788 | 119.7 | 91.3 |
| 5.4 | 24.77393 | 46.64168 | 882 | 184.5 | 86.3 |
| 8.0 | 24.77168 | 46.65257 | 1124 | 65.5 | 85.9 |
| 11.0 | 24.81031 | 46.74902 | 2114 | 78.2 | 78.3 |
| 13.0 | 24.81660 | 46.80739 | 1689 | 57.3 | 56.4 |
| 15.0 | 24.82064 | 46.81877 | 1487 | 15.3 | 32.3 |
| 17.0 | 24.82019 | 46.81431 | 728 | 42.4 | 58.6 |
| 20.0 | 24.82343 | 46.81758 | 667 | 42.4 | 70.4 |
| 21.6 | 24.81974 | 46.82173 | 1004 | 335.6 | 55.3 |
| 23.0 | 24.81435 | 46.82371 | 1403 | 338.6 | 56.5 |
| 24.6 | 24.68724 | 46.75891 | 5820 | 205.8 | 73.2 |
| 26.2 | 24.57226 | 46.70549 | 2097 | 217.9 | 67.0 |
| 27.8 | 24.55384 | 46.68670 | 1738 | 198.4 | 30.0 |
| 29.6 | 24.55250 | 46.67977 | 789 | 135.0 | 58.8 |
| 32.0 | 24.55016 | 46.68234 | 727 | 135.0 | 70.7 |
| 33.4 | 24.54441 | 46.68769 | 1063 | 322.1 | 53.7 |
| 35.0 | 24.53947 | 46.69016 | 1489 | 329.0 | 54.1 |

Tilt 90 is level with the horizon and lower values look down. Pan is the compass heading. Project settings: 30 fps, 3840 × 2160, 35 s.
