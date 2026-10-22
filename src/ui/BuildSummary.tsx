import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { Pokemon, Team } from "../domain/model";
import { displayName } from "../domain/catalog";
import { useTheme } from "./theme";
import {
  Button,
  GameLabel,
  HeldItem,
  Panel,
  PixelText,
  Sprite,
} from "./primitives";

/** Competitive preview beside the PC: the selected build and the saved teams. */
export function BuildSummary({
  pokemon: p,
  teams,
}: {
  pokemon?: Pokemon;
  teams: Team[];
}) {
  const router = useRouter(),
    { colors, ui } = useTheme(),
    b = p?.showdownSet;
  return (
    <View style={{ gap: 14 }}>
      <Panel style={{ gap: 12 }}>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          BUILD PREVIEW
        </PixelText>
        {p && b ? (
          <>
            <View style={ui.row}>
              <Sprite pokemon={p} size={72} />
              <View style={{ flex: 1, gap: 4 }}>
                <PixelText style={ui.heading}>{displayName(p)}</PixelText>
                <PixelText style={{ fontSize: 13, color: colors.muted }}>
                  Lv. {p.currentlevel}
                </PixelText>
                <GameLabel game={p.currentgame} />
              </View>
            </View>
            <HeldItem item={b.item} size={16} />
            <PixelText style={{ fontSize: 14 }}>
              {[b.ability, b.nature, b.teraType && `Tera ${b.teraType}`]
                .filter(Boolean)
                .join(" · ") || "No ability or nature set"}
            </PixelText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {b.moves.map((m, i) => (
                <View
                  key={i}
                  style={{
                    flexBasis: "48%",
                    flexGrow: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 6,
                  }}
                >
                  <PixelText style={{ fontSize: 14 }}>{m}</PixelText>
                </View>
              ))}
            </View>
            <PixelText style={{ fontSize: 12, color: colors.muted }}>
              EVs {b.evs || "none"} · IVs {b.ivs || "default"}
            </PixelText>
            <Button
              primary
              onPress={() =>
                router.push({
                  pathname: "/build/[id]",
                  params: { id: p.id },
                } as never)
              }
            >
              Open build
            </Button>
          </>
        ) : (
          <PixelText style={{ color: colors.muted }}>
            Select a Pokémon in the box to preview its build.
          </PixelText>
        )}
      </Panel>
      <Panel style={{ gap: 8 }}>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          TEAMS
        </PixelText>
        {teams.length ? (
          teams.map((t) => (
            <Button
              key={t.id}
              onPress={() =>
                router.push({
                  pathname: "/teams/[id]",
                  params: { id: t.id },
                } as never)
              }
            >
              {`${t.name} · ${t.memberIDs.length}`}
            </Button>
          ))
        ) : (
          <PixelText style={{ color: colors.muted }}>
            No teams yet. Create one from Options.
          </PixelText>
        )}
        <Button onPress={() => router.push("/teams")}>All teams</Button>
      </Panel>
    </View>
  );
}
