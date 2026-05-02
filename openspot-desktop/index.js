import TrackPlayer from 'react-native-track-player';


import 'expo-router/entry';


TrackPlayer.registerPlaybackService(() => require('./trackPlayerService').default);

