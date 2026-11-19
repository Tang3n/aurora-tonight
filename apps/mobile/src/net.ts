/** Network identity of the app; imported first by index.ts so the UI and the background task both use it. */
import { setClientIdentity } from '@aurora/data/sources';
import Constants from 'expo-constants';

setClientIdentity(`aurora-tonight-app/${Constants.expoConfig?.version ?? 'dev'} (+https://tang3n.github.io/aurora-tonight/)`);
