import React from 'react';
import { Next24hPanel, Next24hPanelProps } from './Next24hPanel';

export type Horizon24hProps = Next24hPanelProps;

export const Horizon24h: React.FC<Horizon24hProps> = (props) => {
  return <Next24hPanel {...props} />;
};
