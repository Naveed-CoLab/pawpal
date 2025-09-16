declare module 'lottie-react-native' {
  import * as React from 'react';
  import { ViewProps, StyleProp, ViewStyle } from 'react-native';

  export interface LottieViewProps extends ViewProps {
    source: object | { uri: string };
    autoPlay?: boolean;
    loop?: boolean;
    speed?: number;
    progress?: number;
    style?: StyleProp<ViewStyle>;
  }

  export default class LottieView extends React.Component<LottieViewProps> {}
}



