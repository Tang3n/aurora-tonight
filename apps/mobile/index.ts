// Background tasks must be defined at module scope before the app starts (expo-task-manager):
// Android may launch the JS runtime only to run the task, without any screen.
import './src/background/task';
import 'expo-router/entry';
