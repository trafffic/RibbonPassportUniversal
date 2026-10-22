import React from "react";
import { View } from "react-native";
import { useCollection } from "../src/state/CollectionProvider";
import { Shell } from "../src/ui/Shell";
import { PCBox } from "../src/ui/PCBox";
import { BuildSummary } from "../src/ui/BuildSummary";
import { useLayout } from "../src/ui/layout";
export default function Competitive() {
  const { collection } = useCollection(),
    { isDesktop } = useLayout();
  const p =
    collection?.records.find(
      (r) => r.id === collection.selectedID && r.pokemon.showdownSet,
    )?.pokemon ??
    collection?.records.find((r) => r.pokemon.showdownSet)?.pokemon;
  return (
    <Shell>
      <View
        style={{
          flexDirection: isDesktop ? "row" : "column",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            flex: isDesktop ? 1.42 : undefined,
            width: isDesktop ? undefined : "100%",
            minWidth: 0,
          }}
        >
          <PCBox kind="showdown" />
        </View>
        {isDesktop && (
          <View style={{ flex: 1, minWidth: 0 }}>
            <BuildSummary pokemon={p} teams={collection?.teams ?? []} />
          </View>
        )}
      </View>
    </Shell>
  );
}
