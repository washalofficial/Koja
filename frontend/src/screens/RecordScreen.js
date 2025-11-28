import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Camera } from 'expo-camera';

export default function RecordScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [isRecording, setIsRecording] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({ quality: Camera.Constants.VideoQuality['720p'] });
        setIsRecording(false);
        navigation.navigate('Editor', { uri: video.uri });
      } catch (e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) cameraRef.current.stopRecording();
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Camera style={{ flex: 1 }} type={type} ref={cameraRef}>
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => setType(
            type === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back
          )}>
            <Text>Flip</Text>
          </TouchableOpacity>

          {!isRecording ? (
            <TouchableOpacity onPress={startRecording}>
              <Text>Record</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={stopRecording}>
              <Text>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
      </Camera>
    </View>
  );
}
