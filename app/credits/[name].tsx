import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { PixelText } from '../../src/ui/primitives';
import { PageHeading } from '../../src/ui/Community';
import { Missing } from '../../src/ui/Missing';
import licences from '../../assets/data/licences.json';

/** One licence notice, as the iPhone LicenceNoticeView. */
export default function LicenceScreen() {
  const { name } = useLocalSearchParams<{ name: string }>(),
    notice = licences.notices.find((n) => n.name === name);
  return (
    <Shell narrow>
      <PageHeading title="Licence" back="/credits" />
      {notice ? (
        <>
          <PixelText style={{ fontSize: 18 }}>{notice.name}</PixelText>
          <PixelText selectable style={{ fontSize: 14 }}>
            {notice.text}
          </PixelText>
        </>
      ) : (
        <Missing message="This notice is not bundled with the app." />
      )}
    </Shell>
  );
}
