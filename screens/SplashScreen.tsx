// screens/SplashScreen.tsx
//
// Full-screen splash artwork for teen and parent entry.
// The painted "Se'kret Bip ♡" button in each image is the main tap target.
// Artwork is contained instead of cropped so the full composition remains
// visible on phones, tablets, laptops, and wide web screens.
//
// Hit-target fractions are relative to the rendered artwork, not the viewport.
// Tune T_BTN_* and P_BTN_* if the painted button moves inside an asset.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const TEEN_BG   = require("../assets/images/splash-bg.png");
const PARENT_BG = require("../assets/images/parent-space-splash.png");

// ── Teen splash: "Se'kret Bip ♡" pill button position within the artwork ────
const T_BTN = { top: 0.800, bottom: 0.875, left: 0.08, right: 0.08 };

// ── Parent splash: broader hit zone so the parent door is actually usable ───
const P_BTN = { top: 0.700, bottom: 0.900, left: 0.05, right: 0.05 };

interface SplashScreenProps {
  userSide?: "teen" | "parent";
  setScreen: () => void;
}

interface ImageSize {
  width: number;
  height: number;
}

function getContainedLayout(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const safeImageWidth = imageWidth > 0 ? imageWidth : safeViewportWidth;
  const safeImageHeight = imageHeight > 0 ? imageHeight : safeViewportHeight;
  const scale = Math.min(
    safeViewportWidth / safeImageWidth,
    safeViewportHeight / safeImageHeight,
  );
  const width = safeImageWidth * scale;
  const height = safeImageHeight * scale;

  return {
    width,
    height,
    left: (safeViewportWidth - width) / 2,
    top: (safeViewportHeight - height) / 2,
  };
}

export function SplashScreen({ userSide = "teen", setScreen }: SplashScreenProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const isParent = userSide === "parent";
  const btn = isParent ? P_BTN : T_BTN;
  const source = isParent ? PARENT_BG : TEEN_BG;

  useEffect(() => {
    setImageSize(null);
  }, [isParent]);

  const art = useMemo(
    () => getContainedLayout(
      viewportWidth,
      viewportHeight,
      imageSize?.width ?? viewportWidth,
      imageSize?.height ?? viewportHeight,
    ),
    [imageSize?.height, imageSize?.width, viewportHeight, viewportWidth],
  );

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <Animated.View style={[s.root, { opacity: fade }]}> 
      <StatusBar style="light" />

      {/* Full artwork stays visible; letterboxing uses the splash background. */}
      <View pointerEvents="none" style={s.artLayer}>
        <Image
          source={source}
          style={[s.artwork, { width: art.width, height: art.height }]}
          resizeMode="contain"
          onLoad={({ nativeEvent }) => {
            const width = nativeEvent.source?.width;
            const height = nativeEvent.source?.height;
            if (!width || !height || width <= 0 || height <= 0) return;

            setImageSize(current =>
              current?.width === width && current.height === height
                ? current
                : { width, height },
            );
          }}
        />
      </View>

      {/* Invisible clip tracks the painted button inside the contained image. */}
      <TouchableOpacity
        style={[
          s.clip,
          {
            top: art.top + art.height * btn.top,
            height: art.height * (btn.bottom - btn.top),
            left: art.left + art.width * btn.left,
            width: art.width * (1 - btn.left - btn.right),
          },
        ]}
        onPress={setScreen}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={
          isParent
            ? "Se'kret Bip — enter your parent space"
            : "Se'kret Bip — enter your safe space"
        }
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", backgroundColor: "#090011" },
  artLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artwork: {
    maxWidth: "100%",
    maxHeight: "100%",
  },
  clip: { position: "absolute" },
});
