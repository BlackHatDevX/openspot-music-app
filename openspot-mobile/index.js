import TrackPlayer from 'react-native-track-player';


TrackPlayer.registerPlaybackService(() => require('./trackPlayerService').default);


import 'expo-router/entry';

