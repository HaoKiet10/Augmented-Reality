import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import ProjectIdEntryScreen from './src/screens/ProjectIdEntryScreen';
import ARScanScreen from './src/screens/ARScanScreen';

const App: React.FC = () => {
  const [projectId, setProjectId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {projectId ? (
        <ARScanScreen projectId={projectId} onBack={() => setProjectId(null)} />
      ) : (
        <ProjectIdEntryScreen onSubmit={setProjectId} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
});

export default App;
