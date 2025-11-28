import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_BUCKET.appspot.com',
  messagingSenderId: 'SENDER_ID',
  appId: 'APP_ID'
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export async function uploadToFirebase(localUri, folder = 'videos') {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const filename = `${folder}/${Date.now()}.mp4`;
  const storageRef = ref(storage, filename);
  await uploadBytesResumable(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
}
