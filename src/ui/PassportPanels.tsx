import { tintHex } from '../domain/art-ui';
import {
  transferTitle,
  transferSummary,
  generationLabel,
} from "../domain/transfer-copy";
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, useWindowDimensions, Platform } from "react-native";
import { useRouter } from "expo-router";
import {
  awardName,
  catalog,
  displayName,
  displayedAwards,
  earningLocation,
  recordedVisits,
  sortGames,
  gameName,
  generation,
} from "../domain/catalog";
import {
  compatibleGames,
  generationEarningGames,
  transferCheck,
} from "../domain/rules";
import type { Pokemon } from "../domain/model";
import { editPokemon } from "../domain/organisation";
import { patchPassport } from "../domain/passport";
import { guidesFor } from "../domain/community";
import { useCollection } from "../state/CollectionProvider";
import { useTheme } from "./theme";
import {
  Art,
  Button,
  ConsoleIcon,
  GameLabel,
  Panel,
  PixelText,
  Sprite,
} from "./primitives";
import { ChoiceField, EditorSheet, Field } from "./Editors";
import { bubblePlacement, type Rect } from "./bubble-placement";
export function PassportHero({ pokemon: p, centered = false }: { pokemon: Pokemon; centered?: boolean }) {
  const { colors, dark } = useTheme();
  const titleAward = p.title && p.title !== 'None' && catalog.ribbons[p.title] ? p.title : undefined;
  return (
    <View
      style={{
        flexDirection: centered ? "column" : "row",
        alignItems: "center",
        gap: 15,
        paddingVertical: 12,
      }}
    >
      <Sprite pokemon={p} size={centered ? 120 : 70} />
      <View style={{ flex: centered ? undefined : 1, gap: 6, alignItems: centered ? 'center' : undefined }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: centered ? 'center' : undefined, flexWrap: 'wrap', gap: 7 }}>
          <PixelText style={{ fontSize: 25 }}>{displayName(p)}</PixelText>
          {p.shiny && <Art name="shiny-dark" label="Shiny" size={17} />}
          <ConsoleIcon game={p.origingame} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
          {titleAward && <Art name={'award-' + titleAward} size={20} label={`Title ribbon: ${awardName(titleAward)}`} />}
        <PixelText
          style={{
            fontSize: 14,
            flexShrink: 1,
            textAlign: centered ? 'center' : undefined,
            color:
              (p.title && p.title !== 'None'
                ? tintHex('award-' + p.title, dark)
                : undefined) ?? colors.muted,
          }}
        >
          {p.titleText || catalog.titles[p.title] || "No title equipped"}
        </PixelText>
        </View>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          Lv. {p.currentlevel} · {displayedAwards(p).length} awards
        </PixelText>
      </View>
    </View>
  );
}
export function GamePair({ pokemon: p }: { pokemon: Pokemon }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 18,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      {[
        ["ORIGIN", p.origingame],
        ["CURRENT", p.currentgame],
      ].map(([label, game]) => (
        <View key={label} style={{ flex: 1, gap: 12 }}>
          <PixelText style={{ fontSize: 12, color: colors.muted }}>
            {label}
          </PixelText>
          <GameLabel game={game!} />
        </View>
      ))}
    </View>
  );
}
export function AwardGrid({
  ids,
  onSelect,
  selected,
  onDismiss,
}: {
  ids: string[];
  onSelect(id: string, anchor?: Rect): void;
  selected?: string;
  onDismiss?(): void;
}) {
  const { width } = useWindowDimensions(),
    rects = useRef<Record<string, Rect>>({});
  const hoverOnly = Platform.OS === 'web' && width >= 1100;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
      {ids.map((id) => (
        <Pressable
          key={id}
          accessibilityRole={hoverOnly ? 'img' : 'button'}
          accessibilityLabel={`Details for ${awardName(id)}`}
          accessibilityState={{ selected: selected === id }}
          onLayout={(e) => {
            rects.current[id] = e.nativeEvent.layout;
          }}
          onPress={hoverOnly ? undefined : () => onSelect(id, rects.current[id])}
          onHoverIn={hoverOnly ? () => onSelect(id, rects.current[id]) : undefined}
          onHoverOut={hoverOnly ? onDismiss : undefined}
          focusable={!hoverOnly}
          style={{
            width: width < 360 ? "18.5%" : "15.4%",
            minHeight: 55,
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
          }}
        >
          <Art name={"award-" + id} size={34} />
        </Pressable>
      ))}
    </View>
  );
}
export function TransferStatus({
  pokemon: p,
  onPress,
}: {
  pokemon: Pokemon;
  onPress(): void;
}) {
  const t = transferCheck(p.currentgame, p),
    needsAttention = !t.canAssess || t.lastChance.length > 0 || t.warnings.length > 0,
    { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Review transfer check"
      onPress={onPress}
      style={[{
        paddingVertical: 14,
        paddingHorizontal: 10,
        backgroundColor: needsAttention ? colors.warning : colors.board,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }, Platform.OS === 'web' && ({
        outlineColor: needsAttention ? colors.warningInk : colors.accent,
      } as any)]}
    >
      <PixelText
        style={{
          fontSize: 26,
          color:
            needsAttention
              ? colors.warningInk
              : colors.accent,
        }}
      >
        {needsAttention ? "!" : "✓"}
      </PixelText>
      <View style={{ flex: 1, gap: 4 }}>
        <PixelText
          style={{
            fontSize: 17,
            color: needsAttention ? colors.warningInk : colors.accent,
          }}
        >
          {transferTitle(t)}
        </PixelText>
        <PixelText style={{ fontSize: 13, color: needsAttention ? colors.warningInk : colors.accent }}>
          {transferSummary(t)}
        </PixelText>
      </View>
      <PixelText style={{ fontSize: 14, color: needsAttention ? colors.warningInk : colors.accent }}>
        Review ›
      </PixelText>
    </Pressable>
  );
}
function RibbonDescription({
  awardID,
  onGuide,
  onHeight,
  onHoverIn,
  onHoverOut,
}: {
  awardID: string;
  onGuide(): void;
  onHeight?(height: number): void;
  onHoverIn?(): void;
  onHoverOut?(): void;
}) {
  const { colors } = useTheme(),
    description =
      require("../../assets/data/ribbon-rules.json").awards[awardID]
        ?.description ?? "No in-game description available.";
  return (
    <View onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}>
      <View
        style={{
          padding: 10,
          backgroundColor: colors.board,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <PixelText style={{ fontSize: 17 }}>{awardName(awardID)}</PixelText>
      </View>
      <PixelText style={{ padding: 12 }}>{description}</PixelText>
      {guidesFor(awardID).length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Field guide"
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
          onFocus={onHoverIn}
          onBlur={onHoverOut}
          onPress={onGuide}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <PixelText style={{ fontSize: 14 }}>Field guide ›</PixelText>
        </Pressable>
      )}
    </View>
  );
}
export function RibbonBubble({
  awardID,
  anchor,
  container,
  onGuide,
  onHoverIn,
  onHoverOut,
}: {
  awardID: string;
  anchor: Rect;
  container: { width: number; height: number };
  onGuide(): void;
  onHoverIn?(): void;
  onHoverOut?(): void;
}) {
  const { colors } = useTheme(),
    [height, setHeight] = useState(120),
    contentHeight = height + 2,
    place = bubblePlacement(container, anchor, contentHeight),
    // Keep the full description outside the icon row rather than squeezing it
    // into a short scroll area inside the overview section.
    top = place.above ? anchor.y - 12 - contentHeight : anchor.y + anchor.height + 12;
  return (
    <Pressable
      accessibilityLabel="Ribbon description"
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      onFocus={onHoverIn}
      onBlur={onHoverOut}
      style={{
        zIndex: 20,
        position: "absolute",
        left: place.frame.x,
        top,
        width: place.frame.width,
        height: contentHeight,
      }}
    >
      <View
        style={{
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
          <RibbonDescription
            awardID={awardID}
            onGuide={onGuide}
            onHeight={setHeight}
            onHoverIn={onHoverIn}
            onHoverOut={onHoverOut}
          />
      </View>
      {(top + contentHeight <= anchor.y || top >= anchor.y + anchor.height) && <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: place.tipX - 5,
          [place.above ? "bottom" : "top"]: -6,
          width: 10,
          height: 10,
          transform: [{ rotate: "45deg" }],
          backgroundColor: place.above ? colors.panel : colors.board,
          borderColor: colors.border,
          [place.above ? "borderRightWidth" : "borderLeftWidth"]: 1,
          [place.above ? "borderBottomWidth" : "borderTopWidth"]: 1,
        }}
      />}
    </Pressable>
  );
}
export function PassportOverview({ pokemon: p }: { pokemon: Pokemon }) {
  const router = useRouter(),
    { width } = useWindowDimensions(),
    { colors, ui } = useTheme();
  const hoverOnly = Platform.OS === 'web' && width >= 1100;
  const [selected, setSelected] = useState(""),
    [anchor, setAnchor] = useState<Rect | null>(null),
    [gridAt, setGridAt] = useState({ x: 0, y: 0 }),
    [size, setSize] = useState({ width: 0, height: 0 }),
    [owned, setOwned] = useState(false),
    [gallery, setGallery] = useState(""),
    [transfer, setTransfer] = useState(false),
    hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    bubbleHovered = useRef(false);
  const close = () => {
    clearTimeout(hoverTimer.current);
    bubbleHovered.current = false;
    setSelected("");
    setAnchor(null);
  };
  const closeLater = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => { if (!bubbleHovered.current) close(); }, 300);
  };
  const keepBubble = () => { bubbleHovered.current = true; clearTimeout(hoverTimer.current); };
  const leaveBubble = () => { bubbleHovered.current = false; closeLater(); };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  return (
    <View style={{ gap: 22 }} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {!!selected && !hoverOnly && (
        <Pressable
          accessibilityLabel="Hide description"
          onPress={close}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}
      <GamePair pokemon={p} />
      <View style={ui.between}>
        <PixelText style={{ fontSize: 22 }}>Owned awards</PixelText>
        <Button
          onPress={() => {
            close();
            setOwned(true);
          }}
        >
          {String(displayedAwards(p).length) + " ›"}
        </Button>
      </View>
      <View
        onLayout={(e) =>
          setGridAt({
            x: e.nativeEvent.layout.x,
            y: e.nativeEvent.layout.y,
          })
        }
      >
        <AwardGrid
          ids={displayedAwards(p).slice(0, 12)}
          selected={selected}
          onDismiss={closeLater}
          onSelect={(id, rect) => {
            clearTimeout(hoverTimer.current);
            if (id === selected) return hoverOnly ? undefined : close();
            if (!rect) return close();
            setSelected(id);
            setAnchor({
              ...rect,
              x: rect.x + gridAt.x,
              y: rect.y + gridAt.y,
            });
          }}
        />
      </View>
      <TransferStatus pokemon={p} onPress={() => setTransfer(true)} />
      {!!selected && !!anchor && (
        <RibbonBubble
          key={selected}
          awardID={selected}
          anchor={anchor}
          container={size}
          onHoverIn={keepBubble}
          onHoverOut={leaveBubble}
          onGuide={() =>
            router.push({
              pathname: "/guides",
              params: { award: selected, game: p.currentgame },
            })
          }
        />
      )}
      {owned && (
        <EditorSheet
          title="Owned awards"
          close="Done"
          onClose={() => {
            setOwned(false);
            setGallery("");
          }}
        >
          <PassportHero pokemon={p} />
          <View style={ui.between}>
            <PixelText>Ribbons and marks</PixelText>
            <PixelText>{displayedAwards(p).length}</PixelText>
          </View>
          <AwardGrid
            ids={displayedAwards(p)}
            selected={gallery}
            onSelect={(id) => setGallery(id === gallery ? "" : id)}
          />
          {!!gallery && (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <RibbonDescription
                awardID={gallery}
                onGuide={() => {
                  setOwned(false);
                  router.push({
                    pathname: "/guides",
                    params: { award: gallery, game: p.currentgame },
                  });
                }}
              />
            </View>
          )}
        </EditorSheet>
      )}
      {transfer && (
        <TransferSheet pokemon={p} onClose={() => setTransfer(false)} />
      )}
    </View>
  );
}
export function TransferSheet({
  pokemon: p,
  from,
  onClose,
}: {
  pokemon: Pokemon;
  /** Browsed game; defaults to the Pokémon's current game. */
  from?: string;
  onClose(): void;
}) {
  const state = useCollection(),
    { colors, ui } = useTheme();
  const checkGame = from || p.currentgame,
    atCurrent = checkGame === p.currentgame,
    t = transferCheck(checkGame, p),
    [game, setGame] = useState(""),
    [award, setAward] = useState(""),
    [met, setMet] = useState(
      p.metLevel === undefined ? "" : String(p.metLevel),
    );
  const later = compatibleGames(p).filter(
    (id) => generation(id) > generation(p.currentgame),
  );
  return (
    <EditorSheet title="Transfer check" close="Done" onClose={onClose}>
      <PixelText>{generationLabel(t)}</PixelText>
      <Panel
        testID="transfer-check-summary"
        style={{ borderWidth: 0, backgroundColor: t.isSafe ? colors.board : colors.warning }}
      >
        <PixelText
          style={{ color: t.isSafe ? colors.accent : colors.warningInk }}
        >
          {transferTitle(t)}
        </PixelText>
        <PixelText>{transferSummary(t)}</PixelText>
      </Panel>
      <PixelText style={ui.heading}>Earn before leaving</PixelText>
      {t.lastChance.map((id) => (
        <View key={id} style={{ gap: 8 }}>
          <View style={ui.between}>
            <Art name={"award-" + id} size={32} />
            <PixelText style={{ flex: 1 }}>{awardName(id)}</PixelText>
            <Button onPress={() => setAward(award === id ? "" : id)}>+</Button>
          </View>
          {award === id && (
            <View style={ui.row}>
              {generationEarningGames(id, p.currentgame, p).map((g) => (
                <Button
                  key={g}
                  disabled={state.busy}
                  art={`game-${g}-dark`}
                  onPress={() => state.change(p.id, id, g)}
                >
                  {gameName(g)}
                </Button>
              ))}
            </View>
          )}
        </View>
      ))}

      <PixelText style={ui.heading}>Can wait · {t.canWait.length}</PixelText>
      {t.canWait.map((id) => (
        <View key={id} style={ui.row}>
          <Art name={"award-" + id} size={22} />
          <PixelText>{awardName(id)}</PixelText>
        </View>
      ))}
      {atCurrent && !!t.warnings.length && (
        <>
          <Field label="Met level" value={met} onChange={setMet} numeric />
          <Button
            disabled={state.busy || !met.trim()}
            onPress={() => {
              const r = state.collection!.records.find((r) => r.id === p.id)!;
              state.edit(
                p.id,
                { ...p, metLevel: Number(met) },
                r.version.revision,
              );
            }}
          >
            Save met level
          </Button>
        </>
      )}
      {atCurrent && t.nextGeneration !== undefined && (
        <>
          <ChoiceField
            label="Move to game"
            game
            value={game}
            onChange={setGame}
            options={[
              { id: "", name: "Choose…" },
              ...later.map((id) => ({ id, name: gameName(id) })),
            ]}
          />
          <Button
            primary
            disabled={!t.isSafe || !game || state.busy}
            onPress={() =>
              state.mutate((c, ctx) => {
                const r = c.records.find((r) => r.id === p.id)!;
                const currentCheck = transferCheck(
                  r.pokemon.currentgame,
                  r.pokemon,
                );
                if (
                  !currentCheck.isSafe ||
                  !compatibleGames(r.pokemon).includes(game) ||
                  generation(game) <= generation(r.pokemon.currentgame)
                )
                  throw new Error("Resolve the transfer check before moving.");
                const next = editPokemon(
                  c,
                  p.id,
                  { ...r.pokemon, currentgame: game },
                  r.version.revision,
                  ctx,
                );
                return patchPassport(
                  next,
                  p.id,
                  {
                    visits: [
                      ...recordedVisits(r.pokemon),
                      { id: ctx.id + ":visit", game },
                    ],
                  },
                  ctx.id,
                  { ...ctx, id: ctx.id + ":visit" },
                );
              }, "Transfer recorded.")
            }
          >
            Move to selected game
          </Button>
        </>
      )}
      <Button disabled={!state.canUndo || state.busy} onPress={state.undo}>
        Undo last change
      </Button>
    </EditorSheet>
  );
}
export function roman(gen?: number) {
  return (
    ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][gen ?? 0] ||
    "?"
  );
}
