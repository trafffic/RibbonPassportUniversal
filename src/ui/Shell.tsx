import React from "react";
import { ScrollView, View, Pressable, useWindowDimensions } from "react-native";
import { usePathname, useRouter, useLocalSearchParams } from "expo-router";
import { useCollection } from "../state/CollectionProvider";
import { useTheme } from "./theme";
import { Art, Button, Panel, PixelText } from "./primitives";
import { BackupPanel } from "./BackupPanel";
import { TerminalGlyph } from "./TerminalGlyph";
export function Shell({
  children,
  narrow = false,
}: React.PropsWithChildren<{ narrow?: boolean }>) {
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
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      {!phone && (
        <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
          <View
            style={[
              ui.between,
              {
                maxWidth: width >= 1440 ? 1440 : 1320,
                width: "100%",
                alignSelf: "center",
                paddingHorizontal: 24,
                paddingVertical: 16,
              },
            ]}
          >
            <View style={ui.row}>
              <Art name="award-earth-ribbon" size={30} />
              <PixelText style={{ fontSize: 24 }}>RIBBON PASSPORT</PixelText>
            </View>
            {dock}
          </View>
        </View>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            maxWidth: narrow && width >= 1100 ? 960 : width >= 1440 ? 1440 : 1320,
            width: "100%",
            alignSelf: "center",
            padding: phone ? 16 : 24,
            gap: 18,
            flexGrow: 1,
          }}
        >
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
                Another window edited this collection. Both versions are
                preserved.
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
          {state.collection
            ? children
            : !state.error && <PixelText>Opening your collection…</PixelText>}
          {!phone && (
            <View
              style={[
                ui.between,
                {
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <PixelText style={ui.label}>Saved on this device · Export backup in Settings</PixelText>
              <View style={ui.row}>
                <Button onPress={() => router.push("/library")}>
                  Team library
                </Button>
                <Button onPress={() => router.push("/guides")}>
                  Field guides
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {(!!state.notice || state.canUndo) && (
        <View
          accessibilityLiveRegion="polite"
          style={[
            ui.between,
            {
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.panel,
            },
          ]}
        >
          <PixelText style={{ fontSize: 14, flex: 1 }}>
            {state.notice || "Your last change can be undone."}
          </PixelText>
          {state.canUndo && (
            <Button disabled={state.busy} onPress={state.undo}>
              Undo last change
            </Button>
          )}
        </View>
      )}
      {phone && dock}
    </View>
  );
}
