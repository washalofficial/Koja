import React from 'react';
import { View } from 'react-native';
import { Video } from 'expo-av';

export default function VideoPlayer({ uri }) {
  const videoRef = React.useRef(null);

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        useNativeControls={false}
        resizeMode="cover"
        shouldPlay
        isLooping
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
