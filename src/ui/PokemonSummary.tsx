import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Pokemon } from '../domain/model';
import { useTheme } from './theme';
import { Art, Button, GameLabel, PixelText } from './primitives';
import { PassportHero, PassportOverview, RibbonBubble, TransferSheet, TransferStatus } from './PassportPanels';
import { awardName, displayedAwards } from '../domain/catalog';
import { guidesFor } from '../domain/community';
import type { Rect } from './bubble-placement';
import { usePassportLink } from './usePassportLink';

/** Desktop Classic PC: a compact passport beside the main storage board. */
export function ClassicPassport({ pokemon }: { pokemon: Pokemon }) {
  const passport = usePassportLink();
  const { colors } = useTheme(), router = useRouter(), { height } = useWindowDimensions(),
    [transfer, setTransfer] = useState(false), awards = displayedAwards(pokemon),
    [page, setPage] = useState(0), [selected, setSelected] = useState(''),
    [anchor, setAnchor] = useState<Rect | null>(null),
    [size, setSize] = useState({ width: 0, height: 0 }),
    panelRef = useRef<React.ComponentRef<typeof View>>(null),
    ribbonRefs = useRef<Record<string, React.ComponentRef<typeof View> | null>>({}),
    hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    bubbleHovered = useRef(false);
  const pageSize = height < 740 ? 6 : 12,
    pages = Math.max(1, Math.ceil(awards.length / pageSize)),
    currentPage = Math.min(page, pages - 1);
  const keepOpen = () => clearTimeout(hoverTimer.current);
  const close = () => { keepOpen(); bubbleHovered.current = false; setSelected(''); setAnchor(null); };
  const closeLater = () => { keepOpen(); hoverTimer.current = setTimeout(() => { if (!bubbleHovered.current) close(); }, 300); };
  const enterBubble = () => { bubbleHovered.current = true; keepOpen(); };
  const leaveBubble = () => { bubbleHovered.current = false; closeLater(); };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const showRibbon = (id: string) => {
    keepOpen();
    panelRef.current?.measureInWindow((px, py) => {
      ribbonRefs.current[id]?.measureInWindow((x, y, width, height) => {
        setSelected(id);
        setAnchor({ x: x - px, y: y - py, width, height });
      });
    });
  };
  const open = (tab = 'overview') => router.push(passport(pokemon.id, tab));
  return (
    <View ref={panelRef} onLayout={(e) => setSize(e.nativeEvent.layout)} testID="classic-passport" style={{ backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
      <PixelText style={{ fontSize: 12, letterSpacing: 1.5, color: colors.muted, textAlign: 'center' }}>TRAINER'S PASSPORT</PixelText>
      <PassportHero pokemon={pokemon} centered={height >= 900} />
      <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <PixelText style={{ fontSize: 14, color: colors.muted }}>Level</PixelText>
          <PixelText style={{ fontSize: 14 }}>{pokemon.currentlevel}</PixelText>
        </View>
        {([['Origin', pokemon.origingame], ['Current game', pokemon.currentgame]] as const).map(([label, game]) => (
          <View key={label} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <PixelText style={{ fontSize: 14, color: colors.muted }}>{label}</PixelText>
            <GameLabel game={game} size={14} />
          </View>
        ))}
        <View style={{ gap: 8, paddingVertical: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open ribbons" onPress={() => open('ribbons')} style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 28 }}>
            <PixelText style={{ fontSize: 14, color: colors.muted }}>Owned ribbons</PixelText>
            <PixelText style={{ fontSize: 14 }}>{awards.length} ›</PixelText>
          </Pressable>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {awards.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(id => (
              <Pressable key={id} ref={(ref) => { ribbonRefs.current[id] = ref; }}
                accessibilityRole="img" accessibilityLabel={`Details for ${awardName(id)}`} focusable={false}
                onHoverIn={() => showRibbon(id)} onHoverOut={closeLater}
                style={{ width: '16.666666%', height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Art name={'award-' + id} size={28} />
              </Pressable>
            ))}
            {!awards.length && <PixelText style={{ fontSize: 14, color: colors.muted }}>No ribbons recorded yet.</PixelText>}
          </View>
          {pages > 1 && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous owned ribbons" disabled={currentPage === 0} onPress={() => { close(); setPage(currentPage - 1); }} style={{ padding: 8, opacity: currentPage === 0 ? 0.4 : 1 }}><PixelText style={{ fontSize: 14 }}>‹ Previous</PixelText></Pressable>
            <PixelText style={{ fontSize: 12 }}>{currentPage + 1} / {pages}</PixelText>
            <Pressable accessibilityRole="button" accessibilityLabel="Next owned ribbons" disabled={currentPage === pages - 1} onPress={() => { close(); setPage(currentPage + 1); }} style={{ padding: 8, opacity: currentPage === pages - 1 ? 0.4 : 1 }}><PixelText style={{ fontSize: 14 }}>Next ›</PixelText></Pressable>
          </View>}
        </View>
      </View>
      <TransferStatus pokemon={pokemon} onPress={() => setTransfer(true)} />
      <Button primary block label="Open passport preview" onPress={() => open()}>Open passport ↗</Button>
      {!!selected && !!anchor && <>
        <RibbonBubble awardID={selected} anchor={anchor} container={size} onHoverIn={enterBubble} onHoverOut={leaveBubble} onGuide={() => {
          const guide = guidesFor(selected, pokemon.currentgame)[0] ?? guidesFor(selected)[0];
          if (!guide) return;
          const game = guide.gameIDs.includes(pokemon.currentgame) ? pokemon.currentgame : guide.gameIDs[0];
          close();
          router.push({ pathname: '/guides/[id]', params: { id: guide.id, award: selected, game } });
        }} />
      </>}
      {transfer && <TransferSheet pokemon={pokemon} onClose={() => setTransfer(false)} />}
    </View>
  );
}
export function PokemonSummary({
  pokemon,
  full = false,
}: {
  pokemon: Pokemon;
  full?: boolean;
}) {
  const passport = usePassportLink();
  const { colors } = useTheme(),
    router = useRouter(),
    open = () => router.push(passport(pokemon.id));
  return (
    <View
      style={{
        borderWidth: full ? 0 : 1,
        borderColor: colors.border,
        padding: full ? 0 : 18,
        gap: 14,
      }}
    >
      {!full && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open passport preview"
          onPress={open}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderColor: colors.border,
            minHeight: 38,
          }}
        >
          <PixelText style={{ fontSize: 13, color: colors.muted }}>
            PASSPORT PREVIEW
          </PixelText>
          <PixelText>↗</PixelText>
        </Pressable>
      )}
      <Pressable
        accessibilityRole={!full ? 'button' : undefined}
        accessibilityLabel={!full ? 'Open full passport' : undefined}
        onPress={!full ? open : undefined}
      >
        <PassportHero pokemon={pokemon} />
      </Pressable>
      {!full && <PassportOverview pokemon={pokemon} />}
    </View>
  );
}
