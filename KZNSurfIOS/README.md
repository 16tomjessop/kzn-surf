# KZN Surf iOS

This folder contains a native iOS wrapper for the existing KZN Surf web app.

## Run on your iPhone

1. Open `KZNSurfIOS.xcodeproj` in Xcode.
2. Select the `KZNSurf` scheme.
3. Plug in your iPhone and select it as the run destination.
4. In the target's Signing & Capabilities tab, choose your Apple team.
5. Press Run.

The app bundles the web files locally and uses the phone's internet connection
for Open-Meteo forecast data and external surf cam/map links.
