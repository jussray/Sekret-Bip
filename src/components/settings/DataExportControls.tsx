import React, { useCallback, useState } from 'react';
import { Alert, Clipboard, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { requestAccountDataExport, type AccountDataExport } from '@/services/accountDataExport';

function downloadOnWeb(json: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sekret-bip-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function DataExportControls() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportData, setExportData] = useState<AccountDataExport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestExport = useCallback(async () => {
    setIsLoading(true);
    const result = await requestAccountDataExport();
    setIsLoading(false);

    if (!result.ok) {
      // Alert.alert is a no-op on react-native-web (no DOM text, no native
      // dialog), so a failed export must also be shown inline or web users
      // get no feedback at all.
      setErrorMessage(result.message);
      Alert.alert('Could not download your data', result.message);
      return;
    }

    setErrorMessage(null);
    setExportData(result.value);
    if (Platform.OS === 'web') {
      downloadOnWeb(JSON.stringify(result.value, null, 2));
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    if (!exportData) return;
    Clipboard.setString(JSON.stringify(exportData, null, 2));
    Alert.alert('Copied', 'Your data export was copied as text. Paste it anywhere you want to keep it.');
  }, [exportData]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={requestExport}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Download my data"
      >
        <Text style={styles.secondaryText}>{isLoading ? 'Preparing your data…' : 'Download my data'}</Text>
      </TouchableOpacity>

      {errorMessage !== null && <Text style={styles.errorText}>{errorMessage}</Text>}

      <Modal
        visible={exportData !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExportData(null)}
      >
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Your data export</Text>
          <Text style={styles.modalSubtitle}>
            {Platform.OS === 'web'
              ? 'A file was downloaded to your browser. You can also copy it as text below.'
              : 'Mobile download to your Files app is not available yet. Copy it as text below to keep it.'}
          </Text>
          <ScrollView style={styles.jsonScroll}>
            <Text selectable style={styles.jsonText}>
              {exportData ? JSON.stringify(exportData, null, 2) : ''}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.primaryButton} onPress={copyToClipboard} accessibilityRole="button" accessibilityLabel="Copy data export as text">
            <Text style={styles.primaryText}>Copy as text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setExportData(null)} accessibilityRole="button" accessibilityLabel="Close data export">
            <Text style={styles.secondaryText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  secondaryButton: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#c4b5fd', alignItems: 'center', marginBottom: 10 },
  secondaryText: { color: '#c4b5fd', fontWeight: '800' },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  primaryButton: { padding: 14, borderRadius: 16, backgroundColor: '#6d28d9', alignItems: 'center', marginBottom: 10 },
  primaryText: { color: '#fff', fontWeight: '800' },
  modal: { flex: 1, backgroundColor: '#0d0820', padding: 20, paddingTop: 48 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  modalSubtitle: { color: '#c4b5fd', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  jsonScroll: { flex: 1, backgroundColor: '#130b24', borderRadius: 14, padding: 12, marginBottom: 14 },
  jsonText: { color: '#e5e7eb', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
