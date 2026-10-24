import React from "react";
import { Image, ScrollView, View, Pressable, Platform, useWindowDimensions } from "react-native";
import { usePathname, useRouter, useLocalSearchParams } from "expo-router";
import { useCollection } from "../state/CollectionProvider";
import { useTheme } from "./theme";
import { Button, Panel, PixelText } from "./primitives";
import { BackupPanel } from "./BackupPanel";
import { TerminalGlyph } from "./TerminalGlyph";
export function Shell({
  children,
  narrow = false,
  studio = false,
  wide = false,
  landing = false,
}: React.PropsWithChildren<{
  narrow?: boolean;
  /** Desktop studio: panes fill the window and scroll on their own. */
  studio?: boolean;
  /** Classic PC gives storage most of the desktop width. */
  wide?: boolean;
  /** Empty collections use a readable, scrolling landing page on every platform. */
  landing?: boolean;
}>) {
  const router = useRouter(),
    path = usePathname(),
    params = useLocalSearchParams<{ kind: string; id: string }>(),
    { width } = useWindowDimensions(),
    state = useCollection(),
    { colors, ui } = useTheme();
  const team = state.collection?.teams?.find((t) => t.id === params.id);
  const ribbonTeams =
    params.kind === "ribbon" ||
    (team &&
      team.memberIDs.every(
        (id) =>
          !state.collection?.records.find((r) => r.id === id)?.pokemon
            .showdownSet,
      ));
  const phone = width < 700,
    active =
      path.startsWith("/competitive") ||
      (path.startsWith("/teams") && !ribbonTeams) ||
      path.startsWith("/build") ||
      path.startsWith("/import-showdown") ||
      path.startsWith("/library")
        ? "Competitive"
        : path.startsWith("/settings") || path.startsWith("/recovery")
          ? "Settings"
          : "Ribbons";
  const nav = [
    ["Ribbons", "/", "award-earth-ribbon"],
    ["Competitive", "/competitive", "award-winning-ribbon"],
    ["Settings", "/settings", ""],
  ];
  const dock = (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Main navigation"
      style={{
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: phone ? 12 : 0,
        paddingTop: phone ? 8 : 0,
        paddingBottom: phone ? 4 : 0,
        borderTopWidth: phone ? 1 : 0,
        borderColor: colors.border,
        backgroundColor: colors.paper,
      }}
    >
      {nav.map(([label, url, art]) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: active === label }}
          onPress={() => router.push(url as never)}
          style={{
            flex: phone ? 1 : undefined,
            minWidth: phone ? 0 : 95,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: phone ? 4 : 14,
            height: phone ? 56 : undefined,
            paddingVertical: phone ? 0 : 10,
            gap: 5,
            borderWidth: phone ? 1 : 0,
            borderBottomWidth: !phone && active === label ? 2 : phone ? 1 : 0,
            borderColor: active === label ? colors.accent : colors.border,
            backgroundColor:
              phone && active === label
                ? colors.accent
                : phone
                  ? colors.panel
                  : "transparent",
          }}
        >
          {phone && (
            <TerminalGlyph
              kind={
                label === "Ribbons"
                  ? "ribbons"
                  : label === "Competitive"
                    ? "competitive"
                    : "settings"
              }
              color={active === label ? colors.paper : colors.muted}
            />
          )}
          <PixelText
            style={{
              fontSize: phone ? 13 : 16,
              color:
                phone && active === label
                  ? colors.paper
                  : active === label
                    ? colors.accent
                    : colors.muted,
            }}
          >
            {label}
          </PixelText>
        </Pressable>
      ))}
    </View>
  );
  const mobileBox = !landing && phone && Platform.OS === 'web' && (path === '/' || path === '/competitive');
  const fill = (studio && width >= 1100) || mobileBox;
  const alerts = (
    <>
      {!!state.error && (
        <Panel style={{ backgroundColor: colors.warning }}>
          <PixelText
            accessibilityRole="alert"
            style={{ color: colors.warningInk }}
          >
            {state.error}
          </PixelText>
          {state.collection && !state.conflict && (
            <Button onPress={state.dismissError}>Dismiss</Button>
          )}
        </Panel>
      )}
      {state.conflict && (
        <Panel>
          <PixelText style={ui.heading}>Choose a saved version</PixelText>
          <PixelText>
            Another window edited this collection. Both versions are preserved.
          </PixelText>
          <View style={ui.row}>
            <Button
              disabled={state.busy}
              onPress={() => state.resolveConflict("ours")}
            >
              Keep this window’s version
            </Button>
            <Button
              disabled={state.busy}
              onPress={() => state.resolveConflict("theirs")}
            >
              Keep other window’s version
            </Button>
          </View>
          <BackupPanel onClose={() => {}} />
        </Panel>
      )}
    </>
  );
  const loading = !state.error && <LoadingSkeleton />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
          <View
            style={[
              ui.between,
              {
                maxWidth: 1600,
                width: "100%",
                alignSelf: "center",
                paddingHorizontal: 16,
                paddingVertical: 8,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to your box"
              onPress={() => router.navigate('/')}
              style={[ui.row, { minHeight: 44 }]}
            >
              <Image
                source={require("../../assets/brand/ribbon-logo.png")}
                accessibilityLabel="Ribbon Passport logo"
                resizeMode="contain"
                fadeDuration={0}
                style={{ width: phone ? 24 : 28, height: phone ? 24 : 28 }}
              />
              <PixelText style={{ fontSize: 20 }}>
                RIBBON PASSPORT
              </PixelText>
            </Pressable>
            {!phone && dock}
          </View>
        </View>
      {fill ? (
        <View
          style={{
            flex: 1,
            minHeight: 0,
            maxWidth: 1600,
            width: "100%",
            alignSelf: "center",
            paddingHorizontal: mobileBox ? 6 : 16,
            paddingTop: mobileBox ? 6 : 12,
            paddingBottom: mobileBox ? 6 : 12,
            gap: 12,
          }}
        >
          {alerts}
          {state.collection ? (
            <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
          ) : (
            loading
          )}
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={{
              maxWidth:
                landing ? 1100 : wide ? 1600 : narrow && width >= 1100 ? 960 : width >= 1440 ? 1440 : 1320,
              width: "100%",
              alignSelf: "center",
              padding: phone ? 16 : 24,
              gap: 18,
              flexGrow: 1,
            }}
          >
            {alerts}
            {state.collection ? children : loading}
          </View>
        </ScrollView>
      )}
      {phone ? (
        !!state.notice && !mobileBox && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              ui.between,
              {
                padding: 12,
                borderTopWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.panel,
              },
            ]}
          >
            <PixelText style={{ fontSize: 14, flex: 1 }}>
              {state.notice}
            </PixelText>
          </View>
        )
      ) : (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.panel,
          }}
        >
          <View
            testID="app-status-bar"
            accessibilityLiveRegion="polite"
            style={{
              maxWidth: 1600,
              width: "100%",
              alignSelf: "center",
              paddingHorizontal: 16,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              minHeight: 44,
            }}
          >
            <PixelText style={{ fontSize: 12, color: colors.accent }}>
              ● Saved on this device
            </PixelText>
            <PixelText numberOfLines={1} style={{ fontSize: 12, flex: 1 }}>
              {state.notice}
            </PixelText>
            {state.showUndo && state.canUndo && (
              <Button disabled={state.busy} onPress={state.undo}>
                Undo last change
              </Button>
            )}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Export backup"
              onPress={() => router.push("/settings")}
            >
              <PixelText style={{ fontSize: 12, color: colors.muted }}>
                Export backup ›
              </PixelText>
            </Pressable>
          </View>
        </View>
      )}
      {phone && dock}
    </View>
  );
}
/** Placeholder while the collection opens: a muted PC grid and preview card. */
function LoadingSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel="Opening your collection"
      accessibilityRole="progressbar"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}
    >
      <View
        style={{
          flexGrow: 1.4,
          flexBasis: 300,
          aspectRatio: 208 / 192,
          maxWidth: 820,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
          padding: "4%",
          flexDirection: "row",
          flexWrap: "wrap",
          alignContent: "flex-end",
        }}
      >
        {Array.from({ length: 30 }, (_, i) => (
          <View key={i} style={{ width: "16.66%", height: "16%", padding: 3 }}>
            <View style={{ flex: 1, backgroundColor: colors.board }} />
          </View>
        ))}
      </View>
      <View
        style={{
          flexGrow: 1,
          flexBasis: 260,
          height: 220,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
    </View>
  );
}
