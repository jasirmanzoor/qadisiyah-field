# Rendering the real-3D drone shot in Google Earth Studio (about 10 minutes of your time)

**Version 2.** The first file gave KAFD only 8 seconds and kept it at a distance. This one gives KAFD 10 seconds of orbit
around the tallest tower (the 385 m KAFD tower), with the tower kept in the centre of the frame the whole time.

`AutoLink-Drone.esp` is the full drone flight, keyed frame by frame (42 s, 1,261 frames):

| Time | Shot |
|---|---|
| 0–3 s | Approach KAFD from the west, low, rising |
| 3–10 s | Slow orbit round the 385 m tower: west, then north-west, up to the north side, climbing from 200 m to 330 m above ground |
| 10–15 s | Leaves along the north side and turns east |
| 15–20 s | High transit to Al Qadisiyah |
| 20–22 s | Bird's-eye view over Al Qadisiyah |
| 24–27 s | Dive to about 100 m and a low pass along the showroom rows |
| 28–30 s | Pull-up, where the showroom light-columns rise |
| 30–34 s | Transit south to Al Shifa, then the bird's-eye view |
| 36–39 s | Low pass |
| 40–42 s | Pull-up |

Altitudes are already corrected for Riyadh's real ground height (580–650 m above sea level).

## Steps (Chrome on a Mac or Windows laptop)

1. Open **https://earth.google.com/studio** in Chrome and sign in with your Google account.
2. On the start page choose **Blank Project**, then use **File → Import** (or drag `AutoLink-Drone.esp` onto the page).
3. **Set the field of view.** Click **Add Attributes** and enable **Field of View**. Type **50** into its value at frame 0, and press the keyframe button next to it. One keyframe is enough: it stays at 50 for the whole project. This matches the reel's own camera lens and makes sure the whole tower fits in the frame.
4. **Quick check before you render (30 seconds).** Drag the playhead to **0:03**, **0:06** and **0:09**. You should see the tall KAFD tower in the middle of the frame each time, with the other towers around it.
   - If you see it, go to step 5.
   - If you don't, **don't render.** Take a screenshot at 0:03 and send it to me. Earth Studio only shows towers as 3D where Google has 3D data, so I need to know what the view looks like there.
5. Click **Render** at the top right:
   - **Cloud render → Video (.mp4)** is best. Google renders it on its servers and emails you a download link.
   - **Dimensions: 3840 × 2160.** It is already set in the file; leave it.
   - **Attribution:** leave it on, in the default place. Google requires it.
   - **Map style:** none, so no labels or roads.
6. Also click **File → Export → 3D Tracking Data… → JSON** and keep that small file. It lets me pin the showroom light-columns and labels exactly onto the real footage.
7. Send me both files: the **.mp4** and the **.json**. Share large files by Google Drive link.

## If the import is rejected

Tell me the exact message. As a fallback, you can type the key poses below in a Blank Project: move the playhead to the time, click each value and type it in. Earth Studio smooths between keyframes.

| t (s) | Latitude | Longitude | Altitude (m) | Pan | Tilt |
|---|---|---|---|---|---|
| 0 | 24.76177 | 46.62633 | 745 | 82.0 | 92.6 |
| 3 | 24.76533 | 46.63128 | 853 | 99.9 | 88.0 |
| 6 | 24.76984 | 46.63536 | 913 | 137.7 | 84.0 |
| 8 | 24.77154 | 46.63873 | 933 | 162.1 | 82.7 |
| 10 | 24.77254 | 46.64113 | 981 | 177.7 | 80.6 |
| 12 | 24.77267 | 46.64534 | 1030 | 92.1 | 81.6 |
| 15 | 24.77168 | 46.65257 | 1144 | 65.5 | 85.9 |
| 17 | 24.79805 | 46.71105 | 1905 | 76.5 | 81.2 |
| 20 | 24.81660 | 46.80739 | 1709 | 57.3 | 56.4 |
| 22 | 24.82064 | 46.81877 | 1507 | 15.3 | 32.3 |
| 24 | 24.82019 | 46.81431 | 748 | 42.4 | 58.6 |
| 27 | 24.82343 | 46.81758 | 697 | 42.4 | 68.2 |
| 30 | 24.81435 | 46.82371 | 1423 | 338.6 | 56.5 |
| 31 | 24.74412 | 46.78799 | 4514 | 206.9 | 74.0 |
| 34 | 24.55936 | 46.69378 | 1919 | 216.2 | 51.0 |
| 36 | 24.55288 | 46.68079 | 1025 | 151.6 | 41.1 |
| 39 | 24.55016 | 46.68234 | 757 | 135.0 | 68.5 |
| 40 | 24.54614 | 46.68631 | 962 | 320.5 | 48.5 |
| 42 | 24.53947 | 46.69016 | 1509 | 329.0 | 54.1 |

Tilt 90 is level with the horizon and lower values look down. Pan is the compass heading. Project settings: 30 fps, 3840 × 2160, 42 s. In the fallback you would also need Field of View 50 and, for the KAFD section, a Camera Target on the 385 m tower at about 24.7637 N, 46.6415 E.
