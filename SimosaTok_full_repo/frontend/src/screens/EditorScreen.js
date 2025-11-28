import React, { useState } from 'react';
import { View, Button, TextInput } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import { uploadToFirebase } from '../services/firebase';
import api from '../services/api';

export default function EditorScreen({ route, navigation }) {
  const { uri } = route.params;
  const [caption, setCaption] = useState('');

  const onPublish = async () => {
    const remoteUrl = await uploadToFirebase(uri, 'videos');
    await api.post('/videos', { videoUrl: remoteUrl, caption });
    navigation.navigate('Home');
  };

  return (
    <View style={{ flex: 1 }}>
      <VideoPlayer uri={uri} />
      <TextInput placeholder="Write a caption..." value={caption} onChangeText={setCaption} />
      <Button title="Publish" onPress={onPublish} />
    </View>
  );
}
