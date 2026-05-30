import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts as useGoogleFonts } from "expo-font";
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from "@expo-google-fonts/barlow-condensed";
import {
  Manrope_500Medium,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AlarmProvider } from "@/src/store/AlarmContext";
import SessionNavigator from "@/src/components/SessionNavigator";
import { colors } from "@/src/theme";

// Keep the native splash visible from cold start until icon fonts register.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [googleLoaded, googleError] = useGoogleFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const ready = (iconsLoaded || iconsError) && (googleLoaded || googleError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AlarmProvider>
            <StatusBar style="light" />
            <SessionNavigator />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="set-alarm" options={{ presentation: "modal" }} />
              <Stack.Screen name="ring" options={{ gestureEnabled: false }} />
              <Stack.Screen name="mission" options={{ gestureEnabled: false }} />
              <Stack.Screen name="checkin" options={{ gestureEnabled: false }} />
              <Stack.Screen name="success" options={{ gestureEnabled: false }} />
            </Stack>
          </AlarmProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
