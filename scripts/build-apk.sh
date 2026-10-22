#!/usr/bin/env bash
# Builds the web app, syncs it into the Android project and produces a debug APK.
# Usage: npm run apk
set -euo pipefail
cd "$(dirname "$0")/.."

# Capacitor 8 needs JDK 21. Use JAVA_HOME if it is already 21, otherwise the
# JDK 21 that Gradle's toolchain resolver downloads into ~/.gradle/jdks.
if ! "${JAVA_HOME:-/nonexistent}/bin/java" -version 2>&1 | grep -q '"21'; then
  JDK21=$(find "$HOME/.gradle/jdks" -maxdepth 4 -type d -path '*21*' -name Home 2>/dev/null | head -1)
  if [ -z "$JDK21" ]; then
    echo "JDK 21 not found. Install it (e.g. brew install --cask temurin@21) or set JAVA_HOME." >&2
    exit 1
  fi
  export JAVA_HOME="$JDK21"
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug)

mkdir -p release
cp android/app/build/outputs/apk/debug/app-debug.apk release/AttendEase.apk
echo "APK ready: release/AttendEase.apk"
