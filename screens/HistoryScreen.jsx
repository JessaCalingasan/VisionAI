import { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select()
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Supabase fetch error:', error);
      }
      setRows(data ?? []);
    } catch (err) {
      console.warn('Error loading history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoString;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Fetching history log...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan History</Text>
        <View style={{ width: 60 }} /> {/* Spacer to align title */}
      </View>

      {/* Supabase Status Banner */}
      {!isSupabaseConfigured && (
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>
            ℹ️ Supabase is currently using placeholder credentials. To persist your real history logs, add valid Supabase URL and Publishable keys in your project's `.env` file.
          </Text>
        </View>
      )}

      {rows.length === 0 ? (
        <View style={[styles.centered, { flex: 1, padding: 24 }]}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptyText}>
            Captured photos and their intelligence analysis will appear here once you run scans.
          </Text>
          <TouchableOpacity 
            style={styles.scanNowButton} 
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.scanNowButtonText}>Scan Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              </View>
              
              <Text style={styles.cardLabel}>Objects:</Text>
              <Text style={styles.cardValue}>{item.objects || 'None'}</Text>
              
              <Text style={styles.cardLabel}>Context:</Text>
              <Text style={styles.cardValue}>{item.context || 'N/A'}</Text>

              {item.recommendations && (
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationTitle}>💡 Rec:</Text>
                  <Text style={styles.recommendationText}>{item.recommendations}</Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0f',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#a0aec0',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#11131e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    padding: 12,
    margin: 16,
  },
  bannerText: {
    fontSize: 13,
    color: '#c7d2fe',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#11131e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    paddingBottom: 6,
  },
  cardDate: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#718096',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  cardValue: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 2,
    lineHeight: 18,
  },
  recommendationBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#818cf8',
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 6,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#cbd5e1',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  scanNowButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  scanNowButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
