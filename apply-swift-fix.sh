#!/bin/bash

# Apply the Swift fix patch
cd /Users/iclawd/.openclaw/workspace/projects/ai-wardrobe
patch -p1 < swift-fix.patch

# Build the iOS app
npx expo run:ios