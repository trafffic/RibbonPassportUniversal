import React from 'react';
import { Image, View } from 'react-native';
import { preparedArtwork } from './prepared-artwork';
const sources = [
  require('../../assets/wallpapers/sm-01.png'),
  require('../../assets/wallpapers/sm-02.png'),
  require('../../assets/wallpapers/sm-03.png'),
  require('../../assets/wallpapers/sm-04.png'),
  require('../../assets/wallpapers/sm-05.png'),
  require('../../assets/wallpapers/sm-06.png'),
  require('../../assets/wallpapers/sm-07.png'),
  require('../../assets/wallpapers/sm-08.png'),
  require('../../assets/wallpapers/sm-09.png'),
  require('../../assets/wallpapers/sm-10.png'),
  require('../../assets/wallpapers/sm-11.png'),
  require('../../assets/wallpapers/sm-12.png'),
  require('../../assets/wallpapers/sm-13.png'),
  require('../../assets/wallpapers/sm-14.png'),
  require('../../assets/wallpapers/sm-15.png'),
  require('../../assets/wallpapers/sm-16.png'),
];
const names = [
  'Forest',
  'City',
  'Desert',
  'Savanna',
  'Crag',
  'Volcano',
  'Snow',
  'Cave',
  'Beach',
  'Seafloor',
  'River',
  'Sky',
  'Pokémon Center',
  'Machine',
  'Checks',
  'Simple',
];
export const wallpapers = sources.map((original, i) => {
  const id = `sm${String(i + 1).padStart(2, '0')}`,
    source = preparedArtwork[`wallpaper-${id}`] ?? original;
  return {
    id,
    name: names[i]!,
    source,
    Preview: () => (
      <View style={{ width: '100%', aspectRatio: 208 / 192 }}>
        <Image
          source={source}
          resizeMode="contain"
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      </View>
    ),
  };
});
// Shared with iPhone PCGridMetrics. The wallpaper includes the header and exterior border.
export const pcMetrics = {
  width: 208,
  height: 192,
  x: 8,
  y: 36,
  gridWidth: 192,
  gridHeight: 150,
  columns: 6,
  rows: 5,
};
