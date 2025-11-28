import React from 'react';
import { View, Button, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToFirebase } from '../services/firebase';

export default function UploadScreen({ navigation }) {
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
    if (!result.cancelled) {
      const url = await uploadToFirebase(result.uri, 'videos');
      navigation.navigate('Editor', { uri: result.uri, uploadedUrl: url });
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Pick video from library" onPress={pickVideo} />
      <Text>Or record in Record tab</Text>
    </View>
  );
}
