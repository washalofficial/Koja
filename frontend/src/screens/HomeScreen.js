import React, { useEffect, useState } from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import api from '../services/api';
import VideoCard from '../components/VideoCard';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/videos');
        setVideos(res.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item._id}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        renderItem={({ item }) => <VideoCard video={item} />}
      />
    </View>
  );
}
