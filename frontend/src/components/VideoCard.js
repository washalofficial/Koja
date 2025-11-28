import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import VideoPlayer from './VideoPlayer';

export default function VideoCard({ video }) {
  return (
    <View style={{ flex: 1 }}>
      <VideoPlayer uri={video.videoUrl} />
      <View style={{ position: 'absolute', bottom: 80, left: 10 }}>
        <Text style={{ color: '#fff' }}>{video.caption}</Text>
      </View>
      <View style={{ position: 'absolute', right: 10, bottom: 100 }}>
        <TouchableOpacity><Text style={{ color: '#fff' }}>❤</Text></TouchableOpacity>
        <TouchableOpacity><Text style={{ color: '#fff' }}>💬</Text></TouchableOpacity>
      </View>
    </View>
  );
}
