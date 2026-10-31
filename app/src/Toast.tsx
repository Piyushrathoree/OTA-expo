import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USE_NATIVE_DRIVER } from "./motion";
import { colors, font, radius, shadow, space } from "./theme";

type ToastKind = "success" | "error";
type ToastData = { id: number; message: string; kind: ToastKind };
type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

const VISIBLE_MS = 2800;

function ToastView({ toast, onHidden }: { toast: ToastData; onHidden: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  function hide() {
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => finished && onHidden());
  }

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      speed: 14,
      bounciness: 7,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => {
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, []);

  const isError = toast.kind === "error";

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.md }]}>
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-24, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        }}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={toast.message}
          onPress={hide}
          style={styles.toast}
        >
          <View
            style={[
              styles.icon,
              { backgroundColor: isError ? colors.accent : colors.success },
            ]}
          >
            <Text style={styles.iconGlyph}>{isError ? "!" : "✓"}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);

  const show = useCallback<ShowToast>((message, kind = "success") => {
    setToast({ id: Date.now(), message, kind });
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <ToastView
          key={toast.id}
          toast={toast}
          onHidden={() => setToast((t) => (t?.id === toast.id ? null : t))}
        />
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    alignItems: "center",
    zIndex: 20,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    maxWidth: 440,
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.lg + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    boxShadow: shadow.toast,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { color: colors.onAccent, fontSize: 13, fontWeight: font.heavy },
  message: {
    flexShrink: 1,
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: font.semi,
  },
});
